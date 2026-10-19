import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, type ParamMap } from '@angular/router';
import { BehaviorSubject } from 'rxjs';
import { ApiError, ApiService } from '../../api.service';
import type { Product } from '../../models';
import { CatalogComponent } from './catalog.component';

const product = (overrides: Partial<Product>): Product => ({
  id: 'p1', storeId: 's1', storeName: 'Tienda Doña Luz', neighborhood: 'Chapinero', name: 'Leche entera', category: 'Lácteos', description: '',
  price: 5000, offerPrice: 4000, stock: 4, expirationDate: '2099-01-01', discountPercent: 20, imageUrl: '', active: true, ...overrides,
});

describe('CatalogComponent', () => {
  let getProducts: jasmine.Spy;
  let params: BehaviorSubject<ParamMap>;

  const setup = (query: Record<string, string> = {}) => {
    getProducts = jasmine.createSpy('getProducts').and.resolveTo([product({})]);
    params = new BehaviorSubject(convertToParamMap(query));
    TestBed.configureTestingModule({
      imports: [CatalogComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: { getProducts } }, { provide: ActivatedRoute, useValue: { queryParamMap: params } }],
    });
    const fixture = TestBed.createComponent(CatalogComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement };
  };

  it('searches right away with the neighborhood from the address', fakeAsync(() => {
    const { fixture, page } = setup({ barrio: 'Chapinero' });
    flushMicrotasks();
    fixture.detectChanges();
    expect(getProducts).toHaveBeenCalledOnceWith({ neighborhood: 'Chapinero', category: '', search: '' });
    expect(page.querySelector('h2')?.textContent?.trim()).toBe('1 producto');
    expect(page.querySelectorAll('app-product-card').length).toBe(1);
  }));

  it('waits 350 ms after the last key before searching, and searches once', fakeAsync(() => {
    const { component } = setup();
    flushMicrotasks();
    getProducts.calls.reset();
    component.updateFilter('search', 'l');
    tick(200);
    component.updateFilter('search', 'le');
    tick(200);
    component.updateFilter('search', 'lec');
    tick(349);
    expect(getProducts).not.toHaveBeenCalled();
    tick(1);
    expect(getProducts).toHaveBeenCalledOnceWith({ neighborhood: '', category: '', search: 'lec' });
    flushMicrotasks();
  }));

  it('searches immediately with the button, without waiting', fakeAsync(() => {
    const { component } = setup();
    flushMicrotasks();
    getProducts.calls.reset();
    component.category.set('Lácteos');
    component.searchNow();
    expect(getProducts).toHaveBeenCalledOnceWith({ neighborhood: '', category: 'Lácteos', search: '' });
    flushMicrotasks();
  }));

  it('never shows the results of an older search that answers late', fakeAsync(() => {
    const { fixture, component } = setup();
    flushMicrotasks();
    let answerOld!: (products: Product[]) => void;
    getProducts.and.returnValues(new Promise<Product[]>((resolve) => (answerOld = resolve)), Promise.resolve([product({ id: 'nuevo', name: 'Pan tajado' })]));
    component.updateFilter('search', 'le');
    tick(350);
    component.updateFilter('search', 'pan');
    tick(350);
    flushMicrotasks();
    answerOld([product({ id: 'viejo', name: 'Leche' })]);
    flushMicrotasks();
    fixture.detectChanges();
    expect(component.products().map((item) => item.id)).toEqual(['nuevo']);
  }));

  it('shows the API error with a retry button and an empty message when nothing matches', fakeAsync(() => {
    const { fixture, component, page } = setup();
    flushMicrotasks();
    getProducts.and.rejectWith(new ApiError('No se pudo conectar con el servidor. Revisa tu conexión e inténtalo de nuevo.', 0));
    component.searchNow();
    flushMicrotasks();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudo conectar con el servidor');
    expect(component.products()).toEqual([]);

    getProducts.and.resolveTo([]);
    page.querySelector<HTMLButtonElement>('[role=alert] button')!.click();
    flushMicrotasks();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')).toBeNull();
    expect(page.querySelector('.empty')?.textContent).toBe('No encontramos productos con estos filtros.');
  }));

  it('searches again when the neighborhood in the address changes', fakeAsync(() => {
    setup();
    flushMicrotasks();
    params.next(convertToParamMap({ barrio: 'Suba' }));
    flushMicrotasks();
    expect(getProducts.calls.mostRecent().args[0].neighborhood).toBe('Suba');
  }));
});
