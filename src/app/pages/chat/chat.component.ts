import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import type { AssistantResult } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { DistancePipe } from '../../pipes/distance.pipe';
import { LocationService } from '../../services/location.service';
import { ComboBuilderComponent } from './combo-builder.component';

interface AssistantMessage {
  id: number;
  role: 'user' | 'assistant';
  content: string;
  results?: AssistantResult[];
  isError?: boolean;
}

export const quickQuestions = ['busco huevos baratos', 'leche cerca de mí', 'pan por vencer', 'queso en oferta'];

@Component({
  selector: 'app-chat',
  imports: [FormsModule, CopCurrencyPipe, CalendarDatePipe, DistancePipe, ComboBuilderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './chat.component.scss',
  template: `
<main class="chat-layout">
  <section class="chat-panel" aria-labelledby="chat-title">
    <div class="chat-header">
      <div><span class="eyebrow">Asistente de compras</span><h1 id="chat-title">¿Qué estás buscando?</h1></div>
      <span class="ai-pill">Responde en segundos</span>
    </div>

    <div class="location-bar">
      @if (location.location()) {
        <p class="location-status" role="status">📍 Usando tu ubicación actual para calcular distancias. No la guardamos.</p>
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

    <div class="messages" aria-live="polite">
      @if (!messages().length) {
        <div class="message assistant">
          Hola, te ayudo a encontrar productos en las tiendas de tu barrio. Escribe qué buscas y cómo lo prefieres: más barato, en oferta, de mejor categoría, más cerca o por vencer.
          <div class="chips">
            @for (question of quickQuestions; track question) { <button type="button" class="chip" (click)="ask(question)">{{ question }}</button> }
          </div>
        </div>
      }
      @for (message of messages(); track message.id) {
        <div class="message" [class.user]="message.role === 'user'" [class.error]="message.isError">{{ message.content }}</div>
        @if (message.results?.length) {
          <ul class="results" [attr.aria-label]="'Resultados para ' + message.content">
            @for (result of message.results; track result.productId) {
              <li class="result">
                <div class="result-head">
                  <strong>{{ result.name }}</strong>
                  @if (result.discountPercent > 0) { <span class="badge">-{{ result.discountPercent }}%</span> }
                </div>
                <span class="store">{{ result.store.name }} · {{ result.store.neighborhood }}@if (result.distanceKm !== null) { · {{ result.distanceKm | distance }} }</span>
                <span class="price"><strong>{{ result.offerPrice | cop }}</strong>@if (result.offerPrice < result.price) { <s>{{ result.price | cop }}</s> }</span>
                <small [class.urgent]="result.daysToExpire <= 1">Vence {{ result.expirationDate | calendarDate }} · {{ expiresLabel(result.daysToExpire) }}</small>
              </li>
            }
          </ul>
        }
      }
      @if (loading()) { <div class="message assistant typing" role="status">Buscando en las tiendas…</div> }
    </div>

    <form class="composer" (ngSubmit)="send()">
      <label class="sr-only" for="chat-message">Escribe qué buscas</label>
      <input id="chat-message" name="message" [ngModel]="draft()" (ngModelChange)="draft.set($event)" maxlength="300" autocomplete="off" placeholder="Ej. huevos baratos cerca de mí">
      <button class="button" type="submit" [disabled]="loading() || draft().trim().length < 2">Buscar</button>
    </form>
  </section>
  <app-combo-builder [neighborhoods]="neighborhoods()" />
</main>`,
})
export class ChatComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly location = inject(LocationService);
  protected readonly quickQuestions = quickQuestions;
  readonly messages = signal<AssistantMessage[]>([]);
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

  ask(question: string) {
    this.draft.set(question);
    void this.send();
  }

  async send() {
    const message = this.draft().trim();
    if (message.length < 2 || this.loading()) return;
    this.draft.set('');
    this.push({ role: 'user', content: message });
    this.loading.set(true);
    try {
      const coordinates = this.location.location();
      const response = await this.api.searchAssistant({ message, ...(coordinates ?? {}), ...(!coordinates && this.neighborhood() ? { neighborhood: this.neighborhood() } : {}) });
      this.push({ role: 'assistant', content: response.reply, results: response.results });
    } catch (caught) {
      this.push({ role: 'assistant', content: caught instanceof Error ? caught.message : 'El asistente no pudo responder.', isError: true });
    } finally {
      this.loading.set(false);
    }
  }

  private push(message: Omit<AssistantMessage, 'id'>) {
    this.messages.update((items) => [...items, { ...message, id: this.nextId++ }]);
  }
}
