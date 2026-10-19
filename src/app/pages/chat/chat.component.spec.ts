import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import type { ChatResponse } from '../../models';
import { formatDistance } from '../../pipes/distance.pipe';
import { LocationService } from '../../services/location.service';
import { buildHistory, ChatComponent } from './chat.component';

const response = (overrides: Partial<ChatResponse> = {}): ChatResponse => ({
  reply: 'El pollo asado más cercano está en Tienda Doña Luz a $ 32.000.',
  mode: 'ai',
  intent: { product: 'pollo asado', terms: ['pollo', 'asado'], category: null, preference: 'nearest', neighborhood: null, budget: null },
  origin: 'location',
  results: [{
    productId: 'p1', name: 'Pollo asado entero', category: 'Comidas preparadas', price: 32000, offerPrice: 32000, discountPercent: 0, stock: 6,
    expirationDate: '2026-10-19', daysToExpire: 1, distanceKm: 0.34, store: { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57' },
  }],
  ...overrides,
});

describe('ChatComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getNeighborhoods', 'chat', 'recommend']);
    api.getNeighborhoods.and.resolveTo(['Chapinero', 'Suba']);
    api.chat.and.resolveTo(response());
    TestBed.configureTestingModule({ imports: [ChatComponent], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
  });

  it('sends the conversation with the shared location and shows the result cards', async () => {
    TestBed.inject(LocationService).location.set({ latitude: 4.64, longitude: -74.06 });
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.draft.set('pollo asado cerca');
    await fixture.componentInstance.send();
    fixture.detectChanges();
    expect(api.chat).toHaveBeenCalledWith({ messages: [{ role: 'user', content: 'pollo asado cerca' }], latitude: 4.64, longitude: -74.06 });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tienda Doña Luz · Chapinero');
    expect(text).toContain('a 350 m');
    expect(text).not.toContain('modo básico');
  });

  it('keeps the history of the conversation and warns when it answers in basic mode', async () => {
    api.chat.and.returnValues(Promise.resolve(response()), Promise.resolve(response({ mode: 'basic', reply: 'Encontré 1 opción.' })));
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.neighborhood.set('Suba');
    fixture.componentInstance.ask('pollo asado');
    await fixture.whenStable();
    fixture.componentInstance.draft.set('¿y más barato?');
    await fixture.componentInstance.send();
    fixture.detectChanges();
    expect(api.chat.calls.mostRecent().args[0]).toEqual({
      messages: [
        { role: 'user', content: 'pollo asado' },
        { role: 'assistant', content: 'El pollo asado más cercano está en Tienda Doña Luz a $ 32.000.' },
        { role: 'user', content: '¿y más barato?' },
      ],
      neighborhood: 'Suba',
    });
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('modo básico');
  });

  it('does not warn about basic mode when the rules answered a clear question', async () => {
    api.chat.and.resolveTo(response({ mode: 'rules', reply: 'Encontré 3 opciones de «pollo asado» en 3 tiendas.' }));
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.draft.set('pollo asado');
    await fixture.componentInstance.send();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('modo básico');
  });

  it('shows the API error without sending it back as history', async () => {
    api.chat.and.rejectWith(new Error('Llegaste al límite de mensajes por minuto.'));
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.draft.set('pan');
    await fixture.componentInstance.send();
    const messages = fixture.componentInstance.messages();
    expect(messages.at(-1)).toEqual(jasmine.objectContaining({ role: 'assistant', isError: true, content: 'Llegaste al límite de mensajes por minuto.' }));
    expect(buildHistory(messages)).toEqual([{ role: 'user', content: 'pan' }]);
  });

  it('sends only the last six turns', () => {
    const many = Array.from({ length: 9 }, (_, index) => ({ id: index, role: (index % 2 ? 'assistant' : 'user') as 'user' | 'assistant', content: `m${index}` }));
    expect(buildHistory(many).map((turn) => turn.content)).toEqual(['m3', 'm4', 'm5', 'm6', 'm7', 'm8']);
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
  });
});
