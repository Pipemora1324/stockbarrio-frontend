import { TestBed } from '@angular/core/testing';
import { ApiService } from '../../api.service';
import type { AssistantResponse } from '../../models';
import { formatDistance } from '../../pipes/distance.pipe';
import { LocationService } from '../../services/location.service';
import { ChatComponent } from './chat.component';

const response: AssistantResponse = {
  reply: 'Encontré 1 opción de «leche». La más cercana: Leche entera 1 L en Tienda Doña Luz.',
  intent: { terms: ['leche'], preference: 'nearest', neighborhood: null },
  origin: 'location',
  results: [{
    productId: 'p1', name: 'Leche entera 1 L', category: 'Lácteos', price: 4900, offerPrice: 3920, discountPercent: 20, stock: 10,
    expirationDate: '2026-10-20', daysToExpire: 1, distanceKm: 0.34, store: { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57' },
  }],
};

describe('ChatComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getNeighborhoods', 'searchAssistant', 'recommend']);
    api.getNeighborhoods.and.resolveTo(['Chapinero', 'Suba']);
    api.searchAssistant.and.resolveTo(response);
    TestBed.configureTestingModule({ imports: [ChatComponent], providers: [{ provide: ApiService, useValue: api }] });
  });

  it('sends the shared location with the question and shows the results', async () => {
    TestBed.inject(LocationService).location.set({ latitude: 4.64, longitude: -74.06 });
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.draft.set('leche cerca de mí');
    await fixture.componentInstance.send();
    fixture.detectChanges();
    expect(api.searchAssistant).toHaveBeenCalledWith({ message: 'leche cerca de mí', latitude: 4.64, longitude: -74.06 });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tienda Doña Luz · Chapinero');
    expect(text).toContain('a 350 m');
    expect(text).toContain('3.920');
    expect(text).toContain('Vence 20/10/2026');
  });

  it('sends the chosen neighborhood when there is no location', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.neighborhood.set('Suba');
    fixture.componentInstance.ask('huevos baratos');
    await fixture.whenStable();
    expect(api.searchAssistant).toHaveBeenCalledWith({ message: 'huevos baratos', neighborhood: 'Suba' });
  });

  it('shows the API error as an assistant message', async () => {
    api.searchAssistant.and.rejectWith(new Error('Hiciste muchas búsquedas seguidas.'));
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.draft.set('pan');
    await fixture.componentInstance.send();
    expect(fixture.componentInstance.messages().at(-1)).toEqual(jasmine.objectContaining({ role: 'assistant', isError: true, content: 'Hiciste muchas búsquedas seguidas.' }));
  });
});

describe('formatDistance', () => {
  it('shows meters below one kilometer and kilometers with a decimal comma', () => {
    expect(formatDistance(0.34)).toBe('a 350 m');
    expect(formatDistance(12.345)).toBe('a 12,3 km');
    expect(formatDistance(null)).toBe('');
  });
});

describe('LocationService', () => {
  it('explains a denied permission in Spanish', async () => {
    spyOn(navigator.geolocation, 'getCurrentPosition').and.callFake((_success, failure) => failure?.({ code: 1 } as GeolocationPositionError));
    const service = TestBed.inject(LocationService);
    await expectAsync(service.requestLocation()).toBeRejectedWithError(/No diste permiso/);
    expect(service.location()).toBeNull();
    expect(service.locating()).toBeFalse();
  });
});
