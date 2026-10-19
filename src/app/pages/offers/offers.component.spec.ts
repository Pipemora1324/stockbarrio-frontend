import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Offer } from '../../models';
import { LocationService } from '../../services/location.service';
import { OffersComponent, toCardProduct } from './offers.component';

const offer: Offer = {
  productId: 'p1', name: 'Leche entera 1 L', category: 'Lácteos', description: '', imageUrl: '', price: 4900, offerPrice: 2940, discountPercent: 40, stock: 24,
  expirationDate: '2099-01-01', daysToExpire: 2, distanceKm: 0.4, store: { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57' },
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

  it('reads the filters from the address and shows the offers with distance', async () => {
    const fixture = setup({ barrio: 'Chapinero', categoria: 'Lácteos', orden: 'expiring' });
    await fixture.whenStable();
    fixture.detectChanges();
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'expiring', neighborhood: 'Chapinero', category: 'Lácteos' });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('1 oferta');
    expect(text).toContain('Leche entera 1 L');
  });

  it('asks for the location before sorting by distance and goes back if it is denied', async () => {
    const fixture = setup();
    const location = TestBed.inject(LocationService);
    spyOn(location, 'requestLocation').and.rejectWith(new Error('No diste permiso para usar tu ubicación.'));
    await fixture.componentInstance.changeSort('nearest');
    expect(fixture.componentInstance.sort()).toBe('discount');
    expect(fixture.componentInstance.locationError()).toContain('No diste permiso');
  });

  it('sends the location and radius only after the customer shares it', async () => {
    const fixture = setup();
    TestBed.inject(LocationService).location.set({ latitude: 4.64, longitude: -74.06 });
    fixture.componentInstance.radiusKm.set(2);
    await fixture.componentInstance.search();
    expect(api.searchOffers).toHaveBeenCalledWith({ sort: 'discount', latitude: 4.64, longitude: -74.06, radiusKm: 2 });
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

  it('forgets the location, the radius and the distance order together', async () => {
    const fixture = setup();
    await fixture.whenStable();
    const component = fixture.componentInstance;
    TestBed.inject(LocationService).location.set({ latitude: 4.64, longitude: -74.06 });
    await component.changeSort('nearest');
    component.radiusKm.set(5);
    component.forgetLocation();
    expect(component.sort()).toBe('discount');
    expect(component.radiusKm()).toBeNull();
    expect(api.searchOffers.calls.mostRecent().args[0]).toEqual({ sort: 'discount' });
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
    expect(fixture.componentInstance.sort()).toBe('discount', 'distance order needs the location first');
  });

  it('reuses the same card object for the same offer', () => {
    const fixture = setup();
    expect(fixture.componentInstance.cardOf(offer)).toBe(fixture.componentInstance.cardOf(offer));
  });
});
