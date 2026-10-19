import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../api.service';
import type { DiscountSuggestion } from '../../models';
import { SuggestionsPanelComponent } from './suggestions-panel.component';

const suggestion: DiscountSuggestion = {
  id: 's1', productId: 'p1', productName: 'Leche entera 1 L', category: 'Lácteos', price: 5000, stock: 30, expirationDate: '2026-10-19',
  currentPercent: 0, suggestedPercent: 55, suggestedPrice: 2250, daysToExpire: 1, reason: 'Vence mañana: sugerimos 55 % de descuento.', source: 'local',
};

describe('SuggestionsPanelComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getSuggestions', 'approveSuggestion', 'rejectSuggestion', 'approveAllSuggestions']);
    TestBed.configureTestingModule({ imports: [SuggestionsPanelComponent], providers: [{ provide: ApiService, useValue: api }] });
  });

  it('shows each suggestion with its reason and new price', async () => {
    api.getSuggestions.and.resolveTo([suggestion]);
    const fixture = TestBed.createComponent(SuggestionsPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Leche entera 1 L');
    expect(text).toContain('Vence mañana');
    expect(text).toContain('2.250');
  });

  it('applies a discount only when the store approves it and tells the panel', async () => {
    api.getSuggestions.and.resolveTo([suggestion]);
    api.approveSuggestion.and.resolveTo({ data: { productId: 'p1', discountPercent: 55, offerPrice: 2250 }, message: 'Descuento del 55 % aplicado.' });
    const fixture = TestBed.createComponent(SuggestionsPanelComponent);
    let appliedEvents = 0;
    fixture.componentInstance.applied.subscribe(() => appliedEvents++);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(api.approveSuggestion).not.toHaveBeenCalled();
    api.getSuggestions.and.resolveTo([]);
    await fixture.componentInstance.approve(suggestion);
    expect(api.approveSuggestion).toHaveBeenCalledWith('s1');
    expect(appliedEvents).toBe(1);
    expect(fixture.componentInstance.notice()).toBe('Descuento del 55 % aplicado.');
  });

  it('shows the API error when approving fails', async () => {
    api.getSuggestions.and.resolveTo([suggestion]);
    api.rejectSuggestion.and.rejectWith(new Error('Esta sugerencia ya fue revisada.'));
    const fixture = TestBed.createComponent(SuggestionsPanelComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    await fixture.componentInstance.reject(suggestion);
    expect(fixture.componentInstance.error()).toBe('Esta sugerencia ya fue revisada.');
  });
});
