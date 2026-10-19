import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { AssistantResult, ChatMode, ChatTurn } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { DistancePipe } from '../../pipes/distance.pipe';
import { LocationService } from '../../services/location.service';
import { ComboBuilderComponent } from './combo-builder.component';

interface ConversationMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  results?: AssistantResult[];
  mode?: ChatMode;
  isError?: boolean;
}

export const quickQuestions = ['pollo asado cerca', 'ofertas de hoy', 'huevos baratos', 'leche por vencer'];
export const historyTurns = 6;
export const maxMessageLength = 500;

// Only real exchanges go back to the API as history: errors are local messages.
export const buildHistory = (messages: ConversationMessage[]): ChatTurn[] =>
  messages.filter((message) => !message.isError).slice(-historyTurns).map((message) => ({ role: message.role, content: message.content.slice(0, maxMessageLength) }));

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink, CopCurrencyPipe, CalendarDatePipe, DistancePipe, ComboBuilderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './chat.component.scss',
  template: `
<main class="chat-layout">
  <section class="chat-panel" aria-labelledby="chat-title">
    <div class="chat-header">
      <div><span class="eyebrow">Asistente de compras</span><h1 id="chat-title">¿Qué estás buscando?</h1></div>
      @if (messages().length) { <button class="button button-light button-small" type="button" (click)="reset()">Nueva conversación</button> }
    </div>

    <div class="location-bar">
      @if (location.location()) {
        <p class="location-status" role="status">📍 Usando tu ubicación para calcular distancias aproximadas. No la guardamos ni la compartimos.</p>
        <button class="link-button" type="button" (click)="location.clear()">Dejar de usarla</button>
      } @else {
        <button class="button button-light" type="button" [disabled]="location.locating()" (click)="useMyLocation()">{{ location.locating() ? 'Buscando tu ubicación…' : '📍 Usar mi ubicación' }}</button>
        <span class="or">o</span>
        <label class="sr-only" for="chat-neighborhood">Elige tu barrio</label>
        <select id="chat-neighborhood" [ngModel]="neighborhood()" (ngModelChange)="neighborhood.set($event)">
          <option value="">Elige tu barrio</option>
          @for (item of neighborhoods(); track item) { <option [value]="item">{{ item }}</option> }
        </select>
      }
    </div>
    @if (locationError()) { <p class="location-error" role="alert">{{ locationError() }}</p> }

    <div class="messages" #messageList role="log" aria-live="polite" aria-label="Conversación con el asistente">
      @if (!messages().length) {
        <div class="message assistant">
          Hola, te ayudo a encontrar productos en las tiendas de StockBarrio. Pregúntame, por ejemplo, «¿dónde puedo encontrar pollo asado?» y dime cómo lo prefieres: más barato, más cerca, de mejor categoría, en oferta o por vencer.
        </div>
      }
      @for (message of messages(); track message.id) {
        <div class="message" [class.user]="message.role === 'user'" [class.assistant]="message.role === 'assistant'" [class.error]="message.isError">
          <span class="sr-only">{{ message.role === 'user' ? 'Tú dijiste:' : 'El asistente responde:' }}</span>{{ message.content }}
          @if (message.mode === 'basic') { <small class="mode-note">Respuesta en modo básico, con las reglas de la app.</small> }
        </div>
        @if (message.results?.length) {
          <ul class="results" [attr.aria-label]="message.results!.length + ' resultados'">
            @for (result of message.results; track result.productId) {
              <li class="result">
                <div class="result-head">
                  <strong>{{ result.name }}</strong>
                  @if (result.discountPercent > 0) { <span class="badge">-{{ result.discountPercent }}%</span> }
                </div>
                <span class="store">{{ result.store.name }} · {{ result.store.neighborhood }}@if (result.distanceKm !== null) { · {{ result.distanceKm | distance }} }</span>
                <span class="price"><strong>{{ result.offerPrice | cop }}</strong>@if (result.offerPrice < result.price) { <s><span class="sr-only">Antes </span>{{ result.price | cop }}</s> }</span>
                <small [class.urgent]="result.daysToExpire <= 1">Vence {{ result.expirationDate | calendarDate }} · {{ expiresLabel(result.daysToExpire) }}</small>
              </li>
            }
          </ul>
        }
      }
      @if (loading()) { <div class="message assistant typing" role="status"><span class="sr-only">El asistente está escribiendo</span><span class="dots" aria-hidden="true"><span></span><span></span><span></span></span> escribiendo…</div> }
    </div>

    <div class="chips" aria-label="Sugerencias rápidas">
      @for (question of quickQuestions; track question) { <button type="button" class="chip" [disabled]="loading()" (click)="ask(question)">{{ question }}</button> }
      <a class="chip chip-link" routerLink="/ofertas">Ver todas las ofertas</a>
    </div>

    <form class="composer" (ngSubmit)="send()">
      <label class="sr-only" for="chat-message">Escribe tu mensaje</label>
      <input id="chat-message" name="message" [ngModel]="draft()" (ngModelChange)="draft.set($event)" [maxlength]="maxMessageLength" autocomplete="off" placeholder="Ej. ¿dónde hay pollo asado cerca?" aria-describedby="chat-count">
      <button class="button" type="submit" [disabled]="loading() || draft().trim().length < 2">Enviar</button>
      <small class="count" id="chat-count" [class.near-limit]="draft().length > maxMessageLength - 50">{{ draft().length }}/{{ maxMessageLength }}</small>
    </form>
  </section>
  <app-combo-builder [neighborhoods]="neighborhoods()" />
</main>`,
})
export class ChatComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly injector = inject(Injector);
  protected readonly location = inject(LocationService);
  protected readonly quickQuestions = quickQuestions;
  protected readonly maxMessageLength = maxMessageLength;
  private readonly messageList = viewChild<ElementRef<HTMLElement>>('messageList');
  readonly messages = signal<ConversationMessage[]>([]);
  readonly neighborhoods = signal<string[]>([]);
  readonly neighborhood = signal('');
  readonly draft = signal('');
  readonly loading = signal(false);
  readonly locationError = signal('');
  private nextId = 1;

  ngOnInit() {
    this.api.getNeighborhoods().then((items) => this.neighborhoods.set(items), () => this.neighborhoods.set([]));
  }

  expiresLabel(days: number) {
    if (days === 0) return 'hoy';
    if (days === 1) return 'mañana';
    return `en ${days} días`;
  }

  async useMyLocation() {
    this.locationError.set('');
    try {
      await this.location.requestLocation();
    } catch (caught) {
      this.locationError.set(caught instanceof Error ? caught.message : 'No pudimos usar tu ubicación.');
    }
  }

  reset() {
    this.messages.set([]);
    this.draft.set('');
  }

  ask(question: string) {
    this.draft.set(question);
    void this.send();
  }

  async send() {
    const content = this.draft().trim().slice(0, maxMessageLength);
    if (content.length < 2 || this.loading()) return;
    this.draft.set('');
    this.push({ role: 'user', content });
    this.loading.set(true);
    try {
      const coordinates = this.location.location();
      const response = await this.api.chat({
        messages: buildHistory(this.messages()),
        ...(coordinates ?? {}),
        ...(!coordinates && this.neighborhood() ? { neighborhood: this.neighborhood() } : {}),
      });
      this.push({ role: 'assistant', content: response.reply, results: response.results, mode: response.mode });
    } catch (caught) {
      this.push({ role: 'assistant', content: caught instanceof Error ? caught.message : 'El asistente no pudo responder.', isError: true });
    } finally {
      this.loading.set(false);
    }
  }

  private push(message: Omit<ConversationMessage, 'id'>) {
    this.messages.update((items) => [...items, { ...message, id: this.nextId++ }]);
    afterNextRender(() => {
      const list = this.messageList()?.nativeElement;
      list?.scrollTo?.({ top: list.scrollHeight, behavior: 'smooth' });
    }, { injector: this.injector });
  }
}
