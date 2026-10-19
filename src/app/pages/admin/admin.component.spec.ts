import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError, ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';
import type { Product, Store } from '../../models';
import { AdminComponent } from './admin.component';

const store: Store = { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57 # 9-20', phone: '3101234567', active: true };
const product = (overrides: Partial<Product>): Product => ({
  id: 'p1', storeId: 's1', storeName: 'Tienda Doña Luz', neighborhood: 'Chapinero', name: 'Leche entera', category: 'Lácteos', description: '',
  price: 5000, offerPrice: 5000, stock: 10, expirationDate: '2026-10-25', discountPercent: 0, imageUrl: '', active: true, ...overrides,
});

describe('AdminComponent (store panel)', () => {
  let api: jasmine.SpyObj<ApiService>;
  let logout: jasmine.Spy;

  const setup = async () => {
    logout = jasmine.createSpy('logout');
    TestBed.configureTestingModule({ imports: [AdminComponent], providers: [provideRouter([]), { provide: ApiService, useValue: api }, { provide: AuthService, useValue: { logout } }] });
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement };
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getMyInventory', 'deleteProduct', 'getSuggestions', 'approveSuggestion', 'rejectSuggestion', 'approveAllSuggestions', 'saveProduct', 'updateProduct']);
    api.getSuggestions.and.resolveTo([]);
    api.getMyInventory.and.resolveTo({
      store,
      products: [product({}), product({ id: 'p2', name: 'Pan tajado', category: 'Panadería', stock: 0, discountPercent: 30, offerPrice: 3500 }), product({ id: 'p3', name: 'Leche deslactosada', stock: 5 })],
    });
  });

  it('shows the inventory with its totals and the suggestions panel, and the store only as text', async () => {
    const { page } = await setup();
    expect(page.querySelector('h1')?.textContent).toBe('Tienda Doña Luz');
    const stats = [...page.querySelectorAll('.stats strong')].map((cell) => cell.textContent);
    expect(stats).toEqual(['3', '15', '1'], 'products, total stock (an empty product counts 0) and offers');
    expect(page.querySelectorAll('tbody tr').length).toBe(3);
    expect(page.querySelector('app-suggestions-panel')).not.toBeNull();
    expect(page.querySelector('app-store-location')).toBeNull();
    expect(page.querySelector('.store-meta')?.textContent).toBe('Chapinero · Calle 57 # 9-20 · Tel. 3101234567');
    expect(page.textContent).not.toMatch(/ubicación|latitud|longitud|mapa/i);
    expect(page.textContent).toContain('con descuento');
  });

  it('filters the table by name, ignoring letter case and spaces around', async () => {
    const { fixture, component, page } = await setup();
    component.search.set('  LECHE ');
    fixture.detectChanges();
    expect(page.querySelectorAll('tbody tr').length).toBe(2);
    component.search.set('arroz');
    fixture.detectChanges();
    expect(page.querySelector('tbody')).toBeNull();
    expect(page.textContent).toContain('Ningún producto coincide con «arroz»');
  });

  it('explains what to do when the account has no store (403)', async () => {
    api.getMyInventory.and.rejectWith(new ApiError('Tu cuenta no tiene una tienda asociada.', 403));
    const { page } = await setup();
    expect(page.querySelector('h2')?.textContent).toBe('Tu cuenta no tiene una tienda asociada');
    expect(page.querySelector('a[href="/register?tipo=tienda"]')).not.toBeNull();
    page.querySelector<HTMLButtonElement>('.state-actions button')!.click();
    expect(logout).toHaveBeenCalled();
    expect(page.querySelector('button.button')?.textContent).not.toContain('Nuevo producto');
  });

  it('shows a load error with a retry that works', async () => {
    api.getMyInventory.and.rejectWith(new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0));
    const { fixture, component, page } = await setup();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudo conectar');
    api.getMyInventory.and.resolveTo({ store, products: [] });
    await component.load();
    fixture.detectChanges();
    expect(component.state()).toBe('ready');
    expect(page.textContent).toContain('Todavía no tienes productos');
  });

  it('deletes a product only after confirming and refreshes the suggestions', async () => {
    const { fixture, component, page } = await setup();
    const confirm = spyOn(window, 'confirm').and.returnValue(false);
    await component.remove(component.products()[0]);
    expect(api.deleteProduct).not.toHaveBeenCalled();

    confirm.and.returnValue(true);
    api.deleteProduct.and.resolveTo();
    api.getSuggestions.calls.reset();
    await component.remove(component.products()[0]);
    fixture.detectChanges();
    expect(confirm).toHaveBeenCalledWith('¿Quieres eliminar «Leche entera»?');
    expect(api.deleteProduct).toHaveBeenCalledWith('p1');
    expect(component.products().map((item) => item.id)).toEqual(['p2', 'p3']);
    expect(page.querySelector('[role=status]')?.textContent).toBe('El producto se eliminó correctamente.');
    expect(api.getSuggestions).toHaveBeenCalled();
  });

  it('keeps the product and shows the API error when deleting fails', async () => {
    const { fixture, component, page } = await setup();
    spyOn(window, 'confirm').and.returnValue(true);
    api.deleteProduct.and.rejectWith(new ApiError('Este producto no pertenece a tu tienda.', 403));
    await component.remove(component.products()[0]);
    fixture.detectChanges();
    expect(component.products().length).toBe(3);
    expect(page.querySelector('[role=alert]')?.textContent).toBe('Este producto no pertenece a tu tienda.');
    expect(component.removingId()).toBeNull();
  });

  it('opens a fresh form for each product and reloads after saving', async () => {
    const { fixture, component } = await setup();
    component.edit(component.products()[0]);
    const firstKey = component.formKey();
    component.startCreate();
    fixture.detectChanges();
    expect(component.editing()).toBeNull();
    expect(component.formKey()).toBe(firstKey + 1);
    expect(fixture.nativeElement.querySelector('app-product-form')).not.toBeNull();

    api.getMyInventory.calls.reset();
    await component.onSaved('El producto se ha guardado correctamente.');
    fixture.detectChanges();
    expect(component.formOpen()).toBeFalse();
    expect(api.getMyInventory).toHaveBeenCalledTimes(1);
    expect(component.notice()).toBe('El producto se ha guardado correctamente.');
  });

  it('closes the form when the product being edited is deleted', async () => {
    const { component } = await setup();
    spyOn(window, 'confirm').and.returnValue(true);
    api.deleteProduct.and.resolveTo();
    component.edit(component.products()[1]);
    await component.remove(component.products()[1]);
    expect(component.formOpen()).toBeFalse();
  });
});
