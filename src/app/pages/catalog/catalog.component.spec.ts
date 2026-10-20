import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ApiService } from '../../api.service';
import type { CatalogGroup, Product } from '../../models';
import { CatalogComponent } from './catalog.component';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p1', storeId: 's1', storeName: '', neighborhood: '', name: 'Arroz 1 kg', category: 'Granos', description: '', price: 4300, offerPrice: 4300, stock: 40,
  expirationDate: '2099-01-01', discountPercent: 0, imageUrl: '', active: true, offerStartsOn: null, offerEndsOn: null, ...overrides,
});
const groups: CatalogGroup[] = [
  { store: { id: 's1', name: 'Abarrotes Ana', neighborhood: 'Suba', address: 'Calle 1', phone: '' }, products: [product({}), product({ id: 'p2', name: 'Fríjol 500 g' })] },
  { store: { id: 's2', name: 'Tienda La Esquina', neighborhood: 'Bosa', address: 'Calle 2', phone: '' }, products: [product({ id: 'p3', name: 'Jabón', category: 'Aseo', storeId: 's2' })] },
];

describe('CatalogComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = async (params: Record<string, string> = {}, data: CatalogGroup[] = groups) => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getCatalog', 'getCategories']);
    api.getCatalog.and.resolveTo({ groups: data, total: data.reduce((sum, group) => sum + group.products.length, 0) });
    api.getCategories.and.resolveTo(['Aseo', 'Granos']);
    TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params), fragment: null } } }],
    });
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };

  it('groups the products by store, each one with its own header and anchor', async () => {
    const { page } = await setup();
    const sections = [...page.querySelectorAll<HTMLElement>('.store-group')];
    expect(sections.map((section) => section.id)).toEqual(['local-s1', 'local-s2']);
    expect(sections.map((section) => section.querySelector('h3')?.textContent)).toEqual(['Abarrotes Ana', 'Tienda La Esquina']);
    expect(sections[0].querySelectorAll('app-product-card').length).toBe(2);
    expect(sections[0].querySelector('.count')?.textContent).toBe('2 productos');
    expect(page.querySelector('#catalog-count')?.textContent).toContain('3 productos en 2 locales');
    // The store is already in the header, so the cards do not repeat it.
    expect(sections[0].querySelector('.price-tag .store')).toBeNull();
  });

  it('has a single filter, by category, read from and written to the address', async () => {
    const { fixture, page } = await setup({ categoria: 'Granos' });
    expect(api.getCatalog).toHaveBeenCalledWith('Granos');
    expect(page.querySelectorAll('select, input[type=search]').length).toBe(0);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    page.querySelector<HTMLInputElement>('input[value="Aseo"]')!.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.getCatalog).toHaveBeenCalledWith('Aseo');
    expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: { categoria: 'Aseo' } }));
    page.querySelector<HTMLInputElement>('input[value=""]')!.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.getCatalog).toHaveBeenCalledWith(undefined);
  });

  it('says the catalog has no offers and links to them', async () => {
    const { page } = await setup();
    expect(page.querySelector('.page-header a[href="/ofertas"]')).not.toBeNull();
    expect(page.querySelector('.ribbon')).toBeNull();
  });

  it('shows empty states for the whole catalog and for one category', async () => {
    const empty = await setup({}, []);
    expect(empty.page.querySelector('.state h3')?.textContent).toBe('El catálogo está vacío por ahora');
    expect(empty.page.querySelector('.state a[href="/ofertas"]')).not.toBeNull();
    TestBed.resetTestingModule();
    const category = await setup({ categoria: 'Aseo' }, []);
    expect(category.page.querySelector('.state h3')?.textContent).toBe('No hay productos de Aseo');
  });

  it('shows the error with a retry button', async () => {
    const { fixture } = await setup();
    api.getCatalog.and.rejectWith(new Error('No se pudo cargar el catálogo.'));
    await fixture.componentInstance.load();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudo cargar el catálogo.');
    api.getCatalog.and.resolveTo({ groups, total: 3 });
    page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    await fixture.whenStable();
    fixture.detectChanges();
    expect(page.querySelectorAll('.store-group').length).toBe(2);
  });

  it('keeps only the answer of the newest request', async () => {
    const { fixture } = await setup();
    let answerOld!: (value: { groups: CatalogGroup[]; total: number }) => void;
    api.getCatalog.and.returnValues(new Promise((resolve) => (answerOld = resolve)), Promise.resolve({ groups: [], total: 0 }));
    const component = fixture.componentInstance;
    const older = component.load();
    await component.load();
    answerOld({ groups, total: 3 });
    await older;
    expect(component.groups()).toEqual([]);
  });
});
