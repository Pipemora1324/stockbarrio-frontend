import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ApiService, type Inventory } from '../../api.service';
import { AuthService } from '../../auth.service';
import type { InventoryProduct, OwnedStore } from '../../models';
import { AdminComponent, productState, stateLabels } from './admin.component';

const store = (overrides: Partial<OwnedStore> = {}): OwnedStore => ({ id: 's1', name: 'Tienda La Esquina', neighborhood: 'Kennedy', address: 'Calle 57 # 9-20', phone: '3101234567', active: true, productCount: 3, ...overrides });
const product = (overrides: Partial<InventoryProduct>): InventoryProduct => ({
  id: 'p1', storeId: 's1', storeName: '', neighborhood: '', name: 'Leche entera', category: 'Lácteos', description: 'Bolsa de 1 L',
  price: 5000, offerPrice: 5000, stock: 10, expirationDate: '2099-01-10', discountPercent: 0, imageUrl: '', active: true,
  offerStartsOn: null, offerEndsOn: null, offerStatus: 'none', expired: false, ...overrides,
});
const inventory = (storeId = 's1', products: InventoryProduct[] = []): Inventory => ({ products, store: store({ id: storeId }), stores: [], today: '2099-01-01' });

describe('productState', () => {
  it('names the state of every product, an expired product first', () => {
    expect(productState(product({ offerStatus: 'active' }))).toBe('active');
    expect(productState(product({ offerStatus: 'active', expired: true }))).toBe('expired');
    expect(Object.values(stateLabels)).toEqual(['Oferta activa', 'Oferta programada', 'Oferta terminada', 'Sin oferta', 'Vencido']);
  });
});

describe('AdminComponent (store panel)', () => {
  let api: jasmine.SpyObj<ApiService>;
  let navigate: jasmine.Spy;
  const stores = [store(), store({ id: 's2', name: 'Local Norte', neighborhood: 'Usaquén', productCount: 1 })];
  const products = [
    product({}),
    product({ id: 'p2', name: 'Pan tajado', category: 'Panadería', stock: 0, discountPercent: 30, offerPrice: 3500, offerStartsOn: '2099-01-01', offerEndsOn: '2099-01-05', offerStatus: 'active' }),
    product({ id: 'p3', name: 'Yogur', discountPercent: 20, offerPrice: 4000, offerStartsOn: '2099-01-03', offerEndsOn: '2099-01-06', offerStatus: 'scheduled' }),
  ];

  const setup = async (params: Record<string, string> = {}) => {
    TestBed.configureTestingModule({
      imports: [AdminComponent],
      providers: [
        provideRouter([]),
        { provide: ApiService, useValue: api },
        { provide: AuthService, useValue: { user: signal({ id: 'u1', name: 'Ana', role: 'store' }), logout: jasmine.createSpy() } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } },
      ],
    });
    navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const fixture = TestBed.createComponent(AdminComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement };
  };

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getMyStores', 'getMyInventory', 'deleteProduct', 'getSuggestions', 'approveSuggestion', 'rejectSuggestion', 'approveAllSuggestions', 'saveProduct', 'updateProduct', 'createStore', 'updateStore', 'deleteStore']);
    api.getSuggestions.and.resolveTo([]);
    api.getMyStores.and.resolveTo({ stores, max: 10 });
    api.getMyInventory.and.callFake(async (storeId?: string) => inventory(storeId, storeId === 's2' ? [product({ id: 'n1', name: 'Café', storeId: 's2' })] : products));
  });

  it('lists the stores as Local 1, Local 2 and shows the inventory of the first one', async () => {
    const { page } = await setup();
    expect([...page.querySelectorAll('.tab-number')].map((tab) => tab.textContent)).toEqual(['Local 1', 'Local 2']);
    expect(page.querySelector('.store-tab[aria-checked=true] strong')?.textContent).toBe('Tienda La Esquina');
    expect(page.querySelector('h1')?.textContent).toBe('Tienda La Esquina');
    expect(api.getMyInventory).toHaveBeenCalledWith('s1');
    expect([...page.querySelectorAll('.stats strong')].map((cell) => cell.textContent)).toEqual(['3', '20', '1']);
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { local: 's1' } }));
  });

  it('opens the store given in the address and switches when another one is chosen', async () => {
    const { fixture, page } = await setup({ local: 's2' });
    expect(api.getMyInventory).toHaveBeenCalledWith('s2');
    expect(page.querySelector('#inventory-title')?.textContent).toContain('Local Norte');
    page.querySelectorAll<HTMLButtonElement>('.store-tab')[0].click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelectorAll('.data-table tbody tr').length).toBe(3);
  });

  it('shows the inventory as a table with description, price, offer range, state and stock, without images', async () => {
    const { page } = await setup();
    expect([...page.querySelectorAll('.data-table th')].map((cell) => cell.textContent?.trim())).toEqual(['Producto', 'Precio', 'Oferta', 'Estado', 'Stock', 'Vence', 'Acciones']);
    const bread = [...page.querySelectorAll('.data-table tbody tr')][1];
    expect(bread.querySelector('[data-label=Oferta]')?.textContent).toContain('30 %');
    expect(bread.querySelector('[data-label=Oferta]')?.textContent).toContain('01/01/2099 al 05/01/2099');
    expect(bread.querySelector('.status')?.textContent).toBe('Oferta activa');
    expect(bread.querySelector('.status')?.classList).toContain('status-active');
    expect([...page.querySelectorAll('.status')].map((cell) => cell.textContent)).toEqual(['Sin oferta', 'Oferta activa', 'Oferta programada']);
    expect(page.querySelector('.description')?.textContent).toBe('Bolsa de 1 L');
    expect(page.querySelector('.data-table img')).toBeNull();
    // Cada celda tiene una etiqueta, así las filas se vuelven tarjetas legibles en el celular.
    expect([...bread.querySelectorAll('td[data-label]')].length).toBe(6);
  });

  it('filters the table by name or category', async () => {
    const { fixture, component, page } = await setup();
    component.search.set('panadería');
    fixture.detectChanges();
    expect([...page.querySelectorAll('.data-table td[data-label=Producto] strong')].map((cell) => cell.textContent)).toEqual(['Pan tajado']);
    component.search.set('nada');
    fixture.detectChanges();
    expect(page.textContent).toContain('Ningún producto coincide con «nada»');
  });

  it('opens the form for a new product in the chosen store and reloads after saving', async () => {
    const { fixture, component, page } = await setup();
    page.querySelector<HTMLButtonElement>('.toolbar-actions .button')!.click();
    fixture.detectChanges();
    const form = fixture.debugElement.query((element) => element.name === 'app-product-form');
    expect(form.componentInstance.storeId()).toBe('s1');
    await component.onSaved('El producto se creó correctamente.');
    fixture.detectChanges();
    expect(page.querySelector('app-product-form')).toBeNull();
    expect(page.querySelector('.alert-success')?.textContent).toContain('se creó');
  });

  it('asks before deleting a product and removes it from the table', async () => {
    const { fixture, component, page } = await setup();
    const confirm = spyOn(window, 'confirm').and.returnValues(false, true);
    api.deleteProduct.and.resolveTo();
    await component.remove(products[0]);
    expect(api.deleteProduct).not.toHaveBeenCalled();
    await component.remove(products[0]);
    fixture.detectChanges();
    expect(confirm).toHaveBeenCalledWith('¿Quieres eliminar «Leche entera»?');
    expect(page.querySelectorAll('.data-table tbody tr').length).toBe(2);
  });

  it('shows the empty state of a store without products', async () => {
    api.getMyInventory.and.resolveTo(inventory('s1', []));
    const { page } = await setup();
    expect(page.querySelector('.inventory .state h3')?.textContent).toBe('Este local todavía no tiene productos');
  });

  it('asks a seller without stores to create the first one', async () => {
    api.getMyStores.and.resolveTo({ stores: [], max: 10 });
    const { page } = await setup();
    expect(page.querySelector('#new-store-title')?.textContent).toBe('Crea tu primer local');
    expect(page.querySelector('.inventory')).toBeNull();
    expect(api.getMyInventory).not.toHaveBeenCalled();
  });

  it('reloads the stores and selects the new one after creating it', async () => {
    const { fixture, component } = await setup();
    api.getMyStores.and.resolveTo({ stores: [...stores, store({ id: 's3', name: 'Local Sur' })], max: 10 });
    await component.onStoresChanged({ message: 'El local se creó correctamente.', selectId: 's3' });
    fixture.detectChanges();
    expect(component.selectedId()).toBe('s3');
    expect(component.notice()).toBe('El local se creó correctamente.');
  });

  it('shows an error with a retry button when the panel cannot load', async () => {
    api.getMyStores.and.rejectWith(new Error('No se pudieron cargar tus locales.'));
    const { fixture, page } = await setup();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudieron cargar tus locales.');
    api.getMyStores.and.resolveTo({ stores, max: 10 });
    page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelectorAll('.store-tab').length).toBe(2);
  });
});
