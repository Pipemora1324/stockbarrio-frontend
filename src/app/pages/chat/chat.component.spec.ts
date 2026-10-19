import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import type { ChatResponse } from '../../models';
import { buildHistory, ChatComponent } from './chat.component';

const response = (overrides: Partial<ChatResponse> = {}): ChatResponse => ({
  reply: 'El pollo asado más barato está en Tienda Doña Luz a $ 32.000.',
  mode: 'ai',
  intent: { product: 'pollo asado', terms: ['pollo', 'asado'], category: null, preference: 'cheapest', neighborhood: null, budget: null },
  results: [{
    productId: 'p1', name: 'Pollo asado entero', category: 'Comidas preparadas', price: 32000, offerPrice: 32000, discountPercent: 0, stock: 6,
    expirationDate: '2026-10-19', daysToExpire: 1, store: { id: 's1', name: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57' },
  }],
  ...overrides,
});

describe('ChatComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  beforeEach(() => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getNeighborhoods', 'chat']);
    api.getNeighborhoods.and.resolveTo(['Chapinero', 'Suba']);
    api.chat.and.resolveTo(response());
    TestBed.configureTestingModule({ imports: [ChatComponent], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
  });

  it('sends the conversation without any location and shows the result cards without distances', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    fixture.componentInstance.draft.set('pollo asado cerca');
    await fixture.componentInstance.send();
    fixture.detectChanges();
    expect(api.chat).toHaveBeenCalledWith({ messages: [{ role: 'user', content: 'pollo asado cerca' }] });
    const text = (fixture.nativeElement as HTMLElement).textContent ?? '';
    expect(text).toContain('Tienda Doña Luz · Chapinero');
    expect(text).not.toMatch(/\d+ m\b| km\b/);
    expect(text).not.toContain('modo básico');
  });

  it('has no location button and shows the privacy notice under the message box', () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    expect(page.textContent).not.toMatch(/ubicación/i);
    expect(page.querySelector('app-combo-builder')).toBeNull();
    const privacy = page.querySelector('.composer #chat-privacy');
    expect(privacy?.textContent).toBe('Tu mensaje se procesa con un servicio de IA externo; no escribas datos personales.');
    expect(page.querySelector('#chat-message')?.getAttribute('aria-describedby')).toContain('chat-privacy');
    expect(page.querySelector('label[for=chat-neighborhood]')?.textContent).toBe('Tu barrio');
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
        { role: 'assistant', content: 'El pollo asado más barato está en Tienda Doña Luz a $ 32.000.' },
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

  it('sends the chosen neighborhood as the search filter, and nothing when it is "Todos los barrios"', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    const component = fixture.componentInstance;
    component.neighborhood.set('Suba');
    component.ask('leche barata');
    await fixture.whenStable();
    expect(api.chat.calls.mostRecent().args[0]).toEqual({ messages: [{ role: 'user', content: 'leche barata' }], neighborhood: 'Suba' });
    component.reset();
    component.neighborhood.set('');
    component.draft.set('huevos');
    await component.send();
    expect(api.chat.calls.mostRecent().args[0]).toEqual({ messages: [{ role: 'user', content: 'huevos' }] });
  });

  it('ignores empty or one-letter messages and a second send while waiting', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    const component = fixture.componentInstance;
    component.draft.set('   a  ');
    await component.send();
    expect(api.chat).not.toHaveBeenCalled();

    let answer!: (value: ChatResponse) => void;
    api.chat.and.returnValue(new Promise<ChatResponse>((resolve) => (answer = resolve)));
    component.draft.set('pollo asado');
    const first = component.send();
    component.draft.set('otra cosa');
    await component.send();
    expect(api.chat).toHaveBeenCalledTimes(1);
    answer(response());
    await first;
    expect(component.loading()).toBeFalse();
  });

  it('cuts a pasted message to 500 characters before sending it', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.componentInstance.draft.set('leche '.repeat(200));
    await fixture.componentInstance.send();
    expect(api.chat.calls.mostRecent().args[0].messages[0].content.length).toBe(500);
  });

  it('starts over with "reset"', async () => {
    const fixture = TestBed.createComponent(ChatComponent);
    const component = fixture.componentInstance;
    component.draft.set('pan');
    await component.send();
    component.reset();
    expect(component.messages()).toEqual([]);
    expect(component.draft()).toBe('');
  });

  it('writes expiration days in Spanish', () => {
    const component = TestBed.createComponent(ChatComponent).componentInstance;
    expect([0, 1, 4].map((days) => component.expiresLabel(days))).toEqual(['hoy', 'mañana', 'en 4 días']);
  });

});
