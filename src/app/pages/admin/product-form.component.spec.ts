import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../api.service';
import { todayInBogota } from '../../dates';
import type { Product } from '../../models';
import { addDaysTo } from '../../testing/days';
import { ProductFormComponent } from './product-form.component';

const today = todayInBogota();
const legacyProduct: Product = {
  id: 'p1', storeId: 's1', storeName: '', neighborhood: '', name: 'Crema de maní', category: 'Untables', description: '', price: 9000, offerPrice: 9000,
  stock: 4, expirationDate: '2020-01-01', discountPercent: 0, imageUrl: '', active: true, offerStartsOn: null, offerEndsOn: null,
};

describe('ProductFormComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['saveProduct', 'updateProduct']);
    TestBed.configureTestingModule({ imports: [ProductFormComponent], providers: [{ provide: ApiService, useValue: api }] });
  });

  const create = (product: Product | null = null, storeId?: string) => {
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.componentRef.setInput('product', product);
    if (storeId) fixture.componentRef.setInput('storeId', storeId);
    fixture.detectChanges();
    return { fixture, form: fixture.componentInstance, page: fixture.nativeElement as HTMLElement };
  };
  const fillValid = (form: ProductFormComponent) => {
    form.set('name', 'Pollo asado');
    form.set('category', 'Pollo');
    form.set('price', 32000);
    form.set('stock', 5);
    form.set('expirationDate', addDaysTo(today, 6));
  };

  it('has no image field', () => {
    const { page } = create();
    expect(page.querySelector('input[type=file], input[name=imageUrl], img')).toBeNull();
  });

  it('shows a Spanish message under each field, and all of them when saving an incomplete form', async () => {
    const { fixture, form, page } = create();
    form.set('price', 49.5);
    form.touch('price');
    fixture.detectChanges();
    expect(page.querySelector('#product-price-error')?.textContent).toContain('número entero de pesos');
    expect(page.querySelector('#product-price')?.getAttribute('aria-invalid')).toBe('true');
    await form.save();
    fixture.detectChanges();
    expect(page.querySelector('#product-name-error')?.textContent).toContain('obligatorio');
    expect(api.saveProduct).not.toHaveBeenCalled();
  });

  it('shows the offer dates only with a discount and proposes today until the expiration date', () => {
    const { fixture, form, page } = create();
    fillValid(form);
    fixture.detectChanges();
    expect(page.querySelector('#offer-start')).toBeNull();
    form.setDiscount(20);
    fixture.detectChanges();
    expect(page.querySelector('legend')?.textContent).toBe('Fechas de la oferta');
    expect(page.querySelector('label[for=offer-start]')?.textContent).toBe('Fecha de inicio');
    expect(page.querySelector('label[for=offer-end]')?.textContent).toBe('Fecha de finalización');
    expect([form.values().offerStartsOn, form.values().offerEndsOn]).toEqual([today, addDaysTo(today, 6)]);
    expect(page.querySelector<HTMLInputElement>('#offer-start')!.min).toBe(today);
    expect(page.querySelector<HTMLInputElement>('#offer-end')!.max).toBe(addDaysTo(today, 6));
  });

  it('checks the range like the API: start from today, end after the start and up to the expiration date', () => {
    const { form } = create();
    fillValid(form);
    form.setDiscount(20);
    form.set('offerStartsOn', addDaysTo(today, -1));
    expect(form.errors().offerStartsOn).toBe('La fecha de inicio de la oferta no puede ser anterior a hoy.');
    form.set('offerStartsOn', addDaysTo(today, 3));
    form.set('offerEndsOn', addDaysTo(today, 2));
    expect(form.errors().offerEndsOn).toBe('La fecha de finalización no puede ser anterior a la fecha de inicio.');
    form.set('offerEndsOn', addDaysTo(today, 7));
    expect(form.errors().offerEndsOn).toContain('no puede terminar después del vencimiento del producto');
    form.set('offerEndsOn', addDaysTo(today, 6));
    expect(form.invalid()).toBeFalse();
  });

  it('saves a new product in the chosen store with its range, and without dates when there is no discount', async () => {
    api.saveProduct.and.resolveTo(legacyProduct);
    const { form } = create(null, 's2');
    fillValid(form);
    form.setDiscount(25);
    await form.save();
    expect(api.saveProduct).toHaveBeenCalledWith(jasmine.objectContaining({ name: 'Pollo asado', discountPercent: 25, offerStartsOn: today, offerEndsOn: addDaysTo(today, 6) }), 's2');
    form.setDiscount(0);
    await form.save();
    expect(api.saveProduct.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ discountPercent: 0, offerStartsOn: null, offerEndsOn: null }));
  });

  it('keeps the past start of an offer that is already running', () => {
    const running: Product = { ...legacyProduct, category: 'Lácteos', expirationDate: addDaysTo(today, 5), discountPercent: 20, offerStartsOn: addDaysTo(today, -2), offerEndsOn: addDaysTo(today, 3) };
    const { form, page } = create(running);
    expect(form.errors().offerStartsOn).toBe('');
    expect(page.querySelector<HTMLInputElement>('#offer-start')!.min).toBe(addDaysTo(today, -2));
    form.set('offerStartsOn', addDaysTo(today, -1));
    expect(form.errors().offerStartsOn).toBe('La fecha de inicio de la oferta no puede ser anterior a hoy.');
  });

  it('does not let an expired product have an offer', () => {
    const { form } = create(legacyProduct);
    form.setDiscount(10);
    expect(form.errors().discountPercent).toContain('Un producto vencido no puede tener oferta');
  });

  it('lets a store edit an old product with a past date and a legacy category', async () => {
    api.updateProduct.and.resolveTo(legacyProduct);
    const { form } = create(legacyProduct);
    expect(form.categories()).toContain('Untables');
    expect(form.invalid()).toBeFalse();
    let message = '';
    form.saved.subscribe((value) => (message = value));
    await form.save();
    expect(api.updateProduct).toHaveBeenCalledWith('p1', jasmine.objectContaining({ category: 'Untables', stock: 4, offerStartsOn: null }));
    expect(message).toBe('El producto se actualizó correctamente.');
  });

  it('shows the API error', async () => {
    api.saveProduct.and.rejectWith(new Error('La fecha de inicio de la oferta no puede ser anterior a hoy.'));
    const { fixture, form, page } = create();
    fillValid(form);
    await form.save();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('anterior a hoy');
  });
});
