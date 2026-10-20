import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError, ApiService } from '../../api.service';
import type { ChatResponse } from '../../models';
import { ChatSessionService, type ConversationMessage } from '../../services/chat-session.service';
import { buildHistory, ChatComponent, expiresLabel, historyTurns, maxMessageLength, privacyNotice, quickActions } from './chat.component';

const answer = (overrides: Partial<ChatResponse> = {}): ChatResponse => ({
  reply: 'Encontré 1 opción.',
  mode: 'rules',
  intent: { product: null, terms: [], category: null, preference: 'relevance', neighborhood: null, budget: null },
  results: [],
  stores: [],
  ...overrides,
});

describe('buildHistory', () => {
  it('sends only the last real turns, cut to the maximum length', () => {
    const messages: ConversationMessage[] = Array.from({ length: 9 }, (_, index) => ({ id: index, role: index % 2 ? 'assistant' : 'user', content: `mensaje ${index}` }));
    messages.push({ id: 99, role: 'assistant', content: 'Sin conexión', isError: true });
    messages.push({ id: 100, role: 'user', content: 'x'.repeat(maxMessageLength + 20) });
    const history = buildHistory(messages);
    expect(history.length).toBe(historyTurns);
    expect(history.some((turn) => turn.content === 'Sin conexión')).toBeFalse();
    expect(history.at(-1)!.content.length).toBe(maxMessageLength);
  });

  it('describes the days left', () => {
    expect([expiresLabel(0), expiresLabel(1), expiresLabel(4)]).toEqual(['vence hoy', 'vence mañana', 'vence en 4 días']);
  });
});

describe('ChatSessionService', () => {
  it('keeps the conversation and the neighborhood in memory only', () => {
    const session = TestBed.inject(ChatSessionService);
    const before = localStorage.length;
    session.add({ role: 'user', content: 'hola' });
    session.remember('Kennedy');
    session.remember(null);
    expect(session.neighborhood()).toBe('Kennedy');
    expect(session.messages().map((message) => message.content)).toEqual(['hola']);
    expect(localStorage.length).toBe(before);
    session.forgetNeighborhood();
    expect(session.neighborhood()).toBeNull();
    session.remember('Bosa');
    session.reset();
    expect([session.messages(), session.neighborhood()]).toEqual([[], null]);
  });
});

describe('ChatComponent', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = () => {
    api = jasmine.createSpyObj<ApiService>('ApiService', ['chat']);
    TestBed.configureTestingModule({ imports: [ChatComponent], providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
    const fixture = TestBed.createComponent(ChatComponent);
    fixture.detectChanges();
    return { fixture, component: fixture.componentInstance, page: fixture.nativeElement as HTMLElement, session: TestBed.inject(ChatSessionService) };
  };
  const settle = async (fixture: ReturnType<typeof setup>['fixture']) => {
    await fixture.whenStable();
    fixture.detectChanges();
  };

  it('has no neighborhood picker, only the quick buttons "Ofertas de hoy" and "Tiendas cercanas"', () => {
    const { page } = setup();
    expect(page.querySelector('select')).toBeNull();
    expect(page.textContent).not.toContain('Tu barrio');
    expect([...page.querySelectorAll('.quick button')].map((button) => button.textContent?.trim())).toEqual(quickActions.map((action) => action.label));
    expect(quickActions.map((action) => action.label)).toEqual(['Ofertas de hoy', 'Tiendas cercanas']);
  });

  it('keeps the privacy line linked to the message box', () => {
    const { page } = setup();
    expect(page.querySelector('#chat-privacy')?.textContent).toBe(privacyNotice);
    expect(page.querySelector('#chat-message')?.getAttribute('aria-describedby')).toContain('chat-privacy');
  });

  it('"Tiendas cercanas" lets the bot ask for the neighborhood, then remembers the answer and shows the stores', async () => {
    const { fixture, page, session } = setup();
    api.chat.and.resolveTo(answer({ reply: 'Para mostrarte las tiendas cercanas, dime en qué barrio estás. Hay tiendas afiliadas en Kennedy.' }));
    [...page.querySelectorAll<HTMLButtonElement>('.quick button')].find((button) => button.textContent?.includes('Tiendas cercanas'))!.click();
    await settle(fixture);
    expect(api.chat).toHaveBeenCalledWith({ messages: [{ role: 'user', content: 'Tiendas cercanas' }] });
    expect(page.textContent).toContain('dime en qué barrio estás');

    api.chat.and.resolveTo(
      answer({
        reply: 'En Kennedy hay 1 tienda afiliada.',
        intent: { product: null, terms: [], category: null, preference: 'relevance', neighborhood: 'Kennedy', budget: null },
        stores: [{ id: 's1', name: 'Tienda La Esquina', neighborhood: 'Kennedy', address: 'Calle 1', offerCount: 2 }],
      }),
    );
    fixture.componentInstance.draft.set('Kennedy');
    await fixture.componentInstance.send();
    fixture.detectChanges();
    expect(session.neighborhood()).toBe('Kennedy');
    expect(page.querySelector('.remembered')?.textContent).toContain('Kennedy');
    expect(page.querySelector('.store-result strong')?.textContent).toBe('Tienda La Esquina');
    expect(page.querySelector('.store-result .ribbon')?.textContent).toContain('2 ofertas');

    // El barrio recordado va con las siguientes preguntas, hasta que la persona lo cambia.
    api.chat.and.resolveTo(answer());
    fixture.componentInstance.ask('leche');
    await settle(fixture);
    expect(api.chat.calls.mostRecent().args[0]).toEqual(jasmine.objectContaining({ neighborhood: 'Kennedy' }));
    page.querySelector<HTMLButtonElement>('.remembered button')!.click();
    fixture.detectChanges();
    expect(page.querySelector('.remembered')).toBeNull();
    fixture.componentInstance.ask('pan');
    await settle(fixture);
    expect(api.chat.calls.mostRecent().args[0].neighborhood).toBeUndefined();
  });

  it('shows the typing indicator while waiting and the result cards after', async () => {
    const { fixture, page } = setup();
    let resolve!: (value: ChatResponse) => void;
    api.chat.and.returnValue(new Promise((done) => (resolve = done)));
    fixture.componentInstance.ask('Ofertas de hoy');
    fixture.detectChanges();
    expect(page.querySelector('.typing')?.textContent).toContain('escribiendo');
    expect(page.querySelector<HTMLButtonElement>('.quick button')!.disabled).toBeTrue();
    resolve(
      answer({
        mode: 'basic',
        results: [{ productId: 'p1', name: 'Leche', category: 'Lácteos', price: 5000, offerPrice: 4000, discountPercent: 20, stock: 3, expirationDate: '2099-01-01', daysToExpire: 1, store: { id: 's1', name: 'Tienda', neighborhood: 'Bosa', address: 'Calle 1' } }],
      }),
    );
    await settle(fixture);
    expect(page.querySelector('.typing')).toBeNull();
    expect(page.querySelector('.result .ribbon')?.textContent).toBe('-20%');
    expect(page.querySelector('.result .urgent')?.textContent).toBe('vence mañana');
    expect(page.querySelector('.mode-note')).not.toBeNull();
  });

  it('keeps the history between visits to the page in the same session', async () => {
    const first = setup();
    api.chat.and.resolveTo(answer({ reply: 'Hola' }));
    first.component.ask('hola');
    await settle(first.fixture);
    first.fixture.destroy();
    const again = TestBed.createComponent(ChatComponent);
    again.detectChanges();
    expect((again.nativeElement as HTMLElement).querySelectorAll('.message').length).toBe(2);
    (again.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.chat-header button')!.click();
    again.detectChanges();
    expect((again.nativeElement as HTMLElement).querySelectorAll('.message').length).toBe(0);
  });

  it('shows the API error as a local message that is not sent back as history', async () => {
    const { fixture, page, component } = setup();
    api.chat.and.rejectWith(new ApiError('Llegaste al límite de mensajes por minuto.', 429));
    component.ask('hola');
    await settle(fixture);
    expect(page.querySelector('.message.error')?.textContent).toContain('Llegaste al límite');
    api.chat.and.resolveTo(answer());
    component.ask('leche');
    await settle(fixture);
    expect(api.chat.calls.mostRecent().args[0].messages.map((turn) => turn.content)).toEqual(['hola', 'leche']);
  });

  it('does not send empty or one-letter messages', async () => {
    const { component } = setup();
    component.draft.set(' a ');
    await component.send();
    expect(api.chat).not.toHaveBeenCalled();
  });
});
