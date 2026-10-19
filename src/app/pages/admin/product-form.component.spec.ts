import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../api.service';
import type { Product } from '../../models';
import { ProductFormComponent } from './product-form.component';

const legacyProduct: Product = {
  id: 'p1', storeId: 's1', storeName: '', neighborhood: '', name: 'Crema de maní', category: 'Untables', description: '', price: 9000, offerPrice: 9000,
  stock: 4, expirationDate: '2020-01-01', discountPercent: 0, imageUrl: '', active: true,
};

describe('ProductFormComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['saveProduct', 'updateProduct']);
    TestBed.configureTestingModule({ imports: [ProductFormComponent], providers: [{ provide: ApiService, useValue: api }] });
  });

  const create = (product: Product | null = null) => {
    const fixture = TestBed.createComponent(ProductFormComponent);
    fixture.componentRef.setInput('product', product);
    fixture.detectChanges();
    return fixture;
  };

  it('keeps the submit button disabled while the form is invalid', () => {
    const fixture = create();
    const submit = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(submit.disabled).toBeTrue();
    const form = fixture.componentInstance;
    form.set('name', 'Pollo asado');
    form.set('category', 'Pollo');
    form.set('price', 32000);
    form.set('stock', 5);
    form.set('expirationDate', '2099-01-01');
    fixture.detectChanges();
    expect(form.invalid()).toBeFalse();
    expect(submit.disabled).toBeFalse();
  });

  it('shows a Spanish message under each field after leaving it', () => {
    const fixture = create();
    fixture.componentInstance.set('price', 49.5);
    fixture.componentInstance.touch('price');
    fixture.componentInstance.touch('name');
    fixture.detectChanges();
    const element = fixture.nativeElement as HTMLElement;
    expect(element.querySelector('#product-price-error')?.textContent).toContain('número entero de pesos');
    expect(element.querySelector('#product-name-error')?.textContent).toContain('obligatorio');
    expect(element.querySelector('#product-price')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('lets a store edit an old product with a past date and a legacy category', async () => {
    api.updateProduct.and.resolveTo(legacyProduct);
    const fixture = create(legacyProduct);
    const form = fixture.componentInstance;
    expect(form.categories()).toContain('Untables');
    expect(form.invalid()).toBeFalse();
    let message = '';
    form.saved.subscribe((value) => (message = value));
    await form.save();
    expect(api.updateProduct).toHaveBeenCalledWith('p1', jasmine.objectContaining({ category: 'Untables', stock: 4 }));
    expect(message).toBe('El producto se actualizó correctamente.');
  });

  it('does not call the API when the form is invalid', async () => {
    const form = create().componentInstance;
    await form.save();
    expect(api.saveProduct).not.toHaveBeenCalled();
  });
});
