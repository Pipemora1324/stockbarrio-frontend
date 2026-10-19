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
});
