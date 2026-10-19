import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Offer } from '../../models';
import { OffersComponent, toCardProduct } from './offers.component';

const offer: Offer = {
  productId: 'p1', name: 'Leche entera 1 L', category: 'Lácteos', description: '', imageUrl: '', price: 4900, offerPrice: 2940, discountPercent: 40, stock: 24,
  expirationDate: '2099-01-01', daysToExpire: 2, store: { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57' },
};

describe('OffersComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = (params: Record<string, string> = {}) => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['searchOffers', 'getNeighborhoods', 'getCategories']);
    api.searchOffers.and.resolveTo({ data: [offer], total: 1 });
    api.getNeighborhoods.and.resolveTo(['Chapinero']);
    api.getCategories.and.resolveTo(['Lácteos']);
    TestBed.configureTestingModule({
      imports: [OffersComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(params) } } }],
    });
    const fixture = TestBed.createComponent(OffersComponent);
    fixture.detectChanges();
    return fixture;
  };

  it('reads the filters from the address and shows the offers', async () => {
    const fixture = setup({ barrio: 'Chapinero', categoria: 'Lácteos', orden: 'expiring' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'expiring', neighborhood: 'Chapinero', category: 'Lácteos' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 oferta');
    expect(text).toContain('Leche entera 1 L');
    expect(text).toContain('1 oferta en Chapinero');
  });

  it('offers only the neighborhood filter and no location, radius or distance order', async () => {
    const fixture = setup();
    await fixture.whenStable();
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect([...page.querySelectorAll('select[name=sort] option')].map((option) => option.textContent)).toEqual(['Mayor descuento', 'Vence primero']);
    expect(page.querySelector('select[name=neighborhood]')).not.toBeNull();
    expect(page.querySelector('select[name=radius]')).toBeNull();
    expect(page.textContent).not.toMatch(/ubicación|Cerca de mí| km\b/i);
  });

  it('maps an offer to a product card', () => {
    expect(toCardProduct(offer)).toEqual(jasmine.objectContaining({ id: 'p1', storeName: 'Tienda Doña Luz', neighborhood: 'Chapinero', offerPrice: 2940 }));
  });

  it('ignores an older search that answers after a newer one', async () => {
    const fixture = setup();
    await fixture.whenStable();
    let answerOld!: (value: { data: Offer[]; total: number }) => void;
    api.searchOffers.and.returnValues(new Promise((resolve) => (answerOld = resolve)), Promise.resolve({ data: [], total: 0 }));
    const component = fixture.componentInstance;
    const old = component.search();
    await component.search();
    answerOld({ data: [offer], total: 1 });
    await old;
    expect(component.offers()).toEqual([]);
    expect(component.total()).toBe(0);
    expect(component.loading()).toBeFalse();
  });

  it('shows an error with a retry, and offers to clear the filters when nothing matches', async () => {
    const fixture = setup({ q: 'caviar' });
    await fixture.whenStable();
    const component = fixture.componentInstance;
    const page = fixture.nativeElement as HTMLElement;
    api.searchOffers.and.rejectWith(new Error('No se pudieron cargar las ofertas.'));
    await component.search();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toContain('No se pudieron cargar las ofertas.');

    api.searchOffers.and.resolveTo({ data: [], total: 0 });
    await component.search();
    fixture.detectChanges();
    expect(page.textContent).toContain('No hay ofertas con estos filtros.');
    page.querySelector<HTMLButtonElement>('.state button')!.click();
    expect(component.text()).toBe('');
    expect(api.searchOffers.calls.mostRecent().args[0]).toEqual({ sort: 'discount' });
  });

  it('does not search for a single letter and trims the text', async () => {
    const fixture = setup();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    component.text.set('l');
    await component.search();
    expect(api.searchOffers.calls.mostRecent().args[0]).toEqual({ sort: 'discount' });
    component.text.set('  leche ');
    await component.search();
    expect(api.searchOffers.calls.mostRecent().args[0]).toEqual({ sort: 'discount', search: 'leche' });
  });

  it('searches again with the chosen neighborhood', async () => {
    const fixture = setup();
    await fixture.whenStable();
    const select = (fixture.nativeElement as HTMLElement).querySelector<HTMLSelectElement>('select[name=neighborhood]')!;
    fixture.detectChanges();
    await fixture.whenStable();
    select.value = 'Chapinero';
    select.dispatchEvent(new Event('change'));
    await fixture.whenStable();
    expect(api.searchOffers.calls.mostRecent().args[0]).toEqual({ sort: 'discount', neighborhood: 'Chapinero' });
  });

  it('keeps working when the neighborhoods and categories cannot be loaded', async () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['searchOffers', 'getNeighborhoods', 'getCategories']);
    api.searchOffers.and.resolveTo({ data: [offer], total: 1 });
    api.getNeighborhoods.and.rejectWith(new Error('caído'));
    api.getCategories.and.rejectWith(new Error('caído'));
    TestBed.configureTestingModule({
      imports: [OffersComponent],
      providers: [provideRouter([]), { provide: ApiService, useValue: api }, { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap({ orden: 'nearest' }) } } }],
    });
    const fixture = TestBed.createComponent(OffersComponent);
    fixture.detectChanges();
    await fixture.whenStable();
    expect(fixture.componentInstance.neighborhoods()).toEqual([]);
    expect(fixture.componentInstance.offers().length).toBe(1);
    expect(fixture.componentInstance.sort()).toBe('discount', 'an old link with orden=nearest falls back to the default order');
  });

  it('reuses the same card object for the same offer', () => {
    const fixture = setup();
    expect(fixture.componentInstance.cardOf(offer)).toBe(fixture.componentInstance.cardOf(offer));
  });
});
