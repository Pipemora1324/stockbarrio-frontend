import { TestBed } from '@angular/core/testing';
import { ApiError, ApiService } from '../../api.service';
import { todayInBogota } from '../../dates';
import type { DiscountSuggestion } from '../../models';
import { addDaysTo } from '../../testing/days';
import { perishableNotice, SuggestionsPanelComponent } from './suggestions-panel.component';

const today = todayInBogota();
const suggestion = (overrides: Partial<DiscountSuggestion> = {}): DiscountSuggestion => ({
  id: 'g1', productId: 'p1', productName: 'Leche entera', category: 'Lácteos', price: 5000, stock: 30, expirationDate: addDaysTo(today, 3),
  currentPercent: 0, suggestedPercent: 40, suggestedPrice: 3000, daysToExpire: 3, reason: 'Vence en 3 días, tienes 30 unidades (stock alto): sugerimos 40 % de descuento.',
  source: 'local', proposedStartsOn: today, proposedEndsOn: addDaysTo(today, 3), ...overrides,
});

describe('SuggestionsPanelComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = async (items: DiscountSuggestion[] = [suggestion(), suggestion({ id: 'g2', productName: 'Pan tajado', daysToExpire: 0 })], storeId = 's2') => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getSuggestions', 'approveSuggestion', 'rejectSuggestion', 'approveAllSuggestions']);
    api.getSuggestions.and.resolveTo(items);
    TestBed.configureTestingModule({ imports: [SuggestionsPanelComponent], providers: [{ provide: ApiService, useValue: api }] });
    const fixture = TestBed.createComponent(SuggestionsPanelComponent);
    fixture.componentRef.setInput('storeId', storeId);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    let applied = 0;
    fixture.componentInstance.applied.subscribe(() => applied++);
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement, applied: () => applied };
  };
  const setDate = (page: HTMLElement, selector: string, value: string) => {
    const input = page.querySelector<HTMLInputElement>(selector)!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
  };

  it('loads the suggestions of the chosen store and explains each one in Spanish', async () => {
    const { page } = await setup();
    expect(api.getSuggestions).toHaveBeenCalledWith('s2');
    expect(page.querySelector('.suggestion p')?.textContent).toContain('stock alto');
    expect(page.querySelectorAll('.suggestion').length).toBe(2);
    expect(page.querySelector('.days.urgent')?.textContent).toContain('Vence hoy');
  });

  it('says clearly that non perishable products are never suggested but can go on offer by hand', async () => {
    const { page } = await setup();
    expect(page.querySelector('.notice')?.textContent).toBe(perishableNotice);
    expect(perishableNotice).toContain('nunca se sugieren');
    expect(perishableNotice).toContain('a mano');
  });

  it('proposes today until the expiration date when approving, and sends the chosen range', async () => {
    const { fixture, page, applied } = await setup();
    page.querySelector<HTMLButtonElement>('.suggestion-actions .button')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelector<HTMLInputElement>('#start-g1')!.value).toBe(today);
    expect(page.querySelector<HTMLInputElement>('#end-g1')!.value).toBe(addDaysTo(today, 3));
    expect(page.querySelector<HTMLInputElement>('#start-g1')!.min).toBe(today);
    expect(page.querySelector<HTMLInputElement>('#end-g1')!.max).toBe(addDaysTo(today, 3));

    setDate(page, '#end-g1', addDaysTo(today, 2));
    fixture.detectChanges();
    api.approveSuggestion.and.resolveTo({ data: { productId: 'p1', discountPercent: 40, offerPrice: 3000, offerStartsOn: today, offerEndsOn: addDaysTo(today, 2) }, message: 'Descuento del 40 % aplicado.' });
    page.querySelector<HTMLFormElement>('form.range')!.dispatchEvent(new Event('submit'));
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.approveSuggestion).toHaveBeenCalledWith('g1', { offerStartsOn: today, offerEndsOn: addDaysTo(today, 2) }, 's2');
    expect(applied()).toBe(1);
    expect(page.querySelector('.alert-success')?.textContent).toContain('Descuento del 40 % aplicado.');
  });

  it('does not let the range start in the past or end after the expiration date', async () => {
    const { fixture, component, page } = await setup();
    component.startApproval(suggestion());
    fixture.detectChanges();
    component.setRange('offerStartsOn', addDaysTo(today, -1));
    fixture.detectChanges();
    expect(component.rangeErrors().start).toBe('La fecha de inicio de la oferta no puede ser anterior a hoy.');
    component.setRange('offerStartsOn', today);
    component.setRange('offerEndsOn', addDaysTo(today, 4));
    fixture.detectChanges();
    expect(component.rangeErrors().end).toContain('no puede terminar después del vencimiento');
    expect(page.querySelector<HTMLButtonElement>('form.range button[type=submit]')!.disabled).toBeTrue();
    await component.confirm(suggestion());
    expect(api.approveSuggestion).not.toHaveBeenCalled();
    page.querySelector<HTMLButtonElement>('form.range .button-light')!.click();
    fixture.detectChanges();
    expect(page.querySelector('form.range')).toBeNull();
  });

  it('rejects a suggestion without changing the inventory', async () => {
    const { fixture, page, applied } = await setup();
    api.rejectSuggestion.and.resolveTo({ message: 'Sugerencia descartada.' });
    page.querySelectorAll<HTMLButtonElement>('.suggestion-actions .button-light')[0].click();
    await fixture.whenStable();
    expect(api.rejectSuggestion).toHaveBeenCalledWith('g1', 's2');
    expect(applied()).toBe(0);
  });

  it('approves every suggestion after a confirmation', async () => {
    const { fixture, page, component } = await setup();
    spyOn(window, 'confirm').and.returnValues(false, true);
    api.approveAllSuggestions.and.resolveTo({ data: [], message: 'Se aplicaron 2 descuentos.' });
    await component.approveAll();
    expect(api.approveAllSuggestions).not.toHaveBeenCalled();
    page.querySelector<HTMLButtonElement>('.suggestions-header .button')!.click();
    await fixture.whenStable();
    expect(api.approveAllSuggestions).toHaveBeenCalledWith('s2');
  });

  it('shows an empty state and the API errors', async () => {
    const empty = await setup([]);
    expect(empty.page.querySelector('.empty')?.textContent).toContain('ningún producto perecedero');
    api.approveSuggestion.and.rejectWith(new ApiError('Esta sugerencia ya fue revisada.', 409));
    empty.component.startApproval(suggestion());
    await empty.component.confirm(suggestion());
    empty.fixture.detectChanges();
    expect(empty.page.querySelector('[role=alert]')?.textContent).toContain('Esta sugerencia ya fue revisada.');
  });

  it('loads again when the panel switches to another store', async () => {
    const { fixture } = await setup();
    fixture.componentRef.setInput('storeId', 's9');
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.getSuggestions).toHaveBeenCalledWith('s9');
  });
});
