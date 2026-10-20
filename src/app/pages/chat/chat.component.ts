import { afterNextRender, ChangeDetectionStrategy, Component, ElementRef, inject, Injector, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { IconComponent, type IconName } from '../../components/icon/icon.component';
import { IllustrationComponent } from '../../components/illustration/illustration.component';
import type { ChatTurn } from '../../models';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { ChatSessionService, type ConversationMessage } from '../../services/chat-session.service';

// Botones rápidos. "Tiendas cercanas" hace que el bot pregunte el barrio dentro del chat (no hay ubicación
// ni selector) y lo use el resto de la conversación.
export const quickActions: ReadonlyArray<{ label: string; message: string; icon: IconName }> = [
  { label: 'Ofertas de hoy', message: 'Ofertas de hoy', icon: 'tag' },
  { label: 'Tiendas cercanas', message: 'Tiendas cercanas', icon: 'store' },
];
export const historyTurns = 6;
export const maxMessageLength = 500;
export const privacyNotice = 'Tu mensaje se procesa con un servicio de IA externo; no escribas datos personales.';

// Solo los intercambios reales vuelven a la API como historial: los errores son mensajes locales.
export const buildHistory = (messages: ConversationMessage[]): ChatTurn[] =>
  messages.filter((message) => !message.isError).slice(-historyTurns).map((message) => ({ role: message.role, content: message.content.slice(0, maxMessageLength) }));

export const expiresLabel = (days: number) => (days <= 0 ? 'vence hoy' : days === 1 ? 'vence mañana' : `vence en ${days} días`);

@Component({
  selector: 'app-chat',
  imports: [FormsModule, RouterLink, CopCurrencyPipe, IconComponent, IllustrationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './chat.component.scss',
  template: `
<main class="page chat-page">
  <section class="chat-panel" aria-labelledby="chat-title">
    <header class="chat-header">
      <div>
        <span class="eyebrow"><app-icon name="chat" />Asistente</span>
        <h1 id="chat-title">¿Qué necesitas hoy?</h1>
      </div>
      @if (session.messages().length) { <button class="button button-light button-small" type="button" (click)="reset()"><app-icon name="refresh" />Nueva conversación</button> }
    </header>

    @if (session.neighborhood(); as place) {
      <p class="remembered"><app-icon name="pin" />Buscando en <strong>{{ place }}</strong> <button class="link-button" type="button" (click)="session.forgetNeighborhood()">Cambiar barrio</button></p>
    }

    <div class="messages" #messageList role="log" aria-live="polite" aria-label="Conversación con el asistente">
      @if (!session.messages().length) {
        <div class="welcome">
          <app-illustration name="chat" />
          <p>Hola, te ayudo a encontrar productos y descuentos en las tiendas de Stock Barrio. Escribe lo que buscas, por ejemplo «huevos baratos» o «leche por vencer», o usa los botones de abajo.</p>
        </div>
      }
      @for (message of session.messages(); track message.id) {
        <div class="message rise" [class.user]="message.role === 'user'" [class.assistant]="message.role === 'assistant'" [class.error]="message.isError">
          <span class="sr-only">{{ message.role === 'user' ? 'Tú dijiste:' : 'El asistente responde:' }}</span>{{ message.content }}
          @if (message.mode === 'basic') { <small class="mode-note">Respuesta en modo básico, con las reglas de la app.</small> }
        </div>
        @if (message.stores?.length) {
          <ul class="store-results" [attr.aria-label]="message.stores!.length + ' tiendas'">
            @for (store of message.stores; track store.id) {
              <li class="store-result">
                <app-icon name="store" />
                <span><strong>{{ store.name }}</strong><small>{{ store.neighborhood }} · {{ store.address }}</small></span>
                @if (store.offerCount) { <span class="ribbon">{{ store.offerCount }} {{ store.offerCount === 1 ? 'oferta' : 'ofertas' }}</span> }
              </li>
            }
          </ul>
        }
        @if (message.results?.length) {
          <ul class="results" [attr.aria-label]="message.results!.length + ' resultados'">
            @for (result of message.results; track result.productId) {
              <li class="result">
                <div class="result-head">
                  <strong>{{ result.name }}</strong>
                  @if (result.discountPercent > 0) { <span class="ribbon">-{{ result.discountPercent }}%</span> }
                </div>
                <span class="store">{{ result.store.name }} · {{ result.store.neighborhood }}</span>
                <span class="price"><strong>{{ result.offerPrice | cop }}</strong>@if (result.offerPrice < result.price) { <s><span class="sr-only">Antes </span>{{ result.price | cop }}</s> }</span>
                <small [class.urgent]="result.daysToExpire <= 1">{{ expiresLabel(result.daysToExpire) }}</small>
              </li>
            }
          </ul>
        }
      }
      @if (loading()) { <div class="message assistant typing" role="status"><span class="sr-only">El asistente está escribiendo</span><span class="dots" aria-hidden="true"><span></span><span></span><span></span></span> escribiendo…</div> }
    </div>

    <div class="quick" role="group" aria-label="Accesos rápidos">
      @for (action of quickActions; track action.label) {
        <button type="button" class="button button-light button-small" [disabled]="loading()" (click)="ask(action.message)"><app-icon [name]="action.icon" />{{ action.label }}</button>
      }
      <a class="text-link" routerLink="/ofertas">Ver todas las ofertas <app-icon name="arrow" /></a>
    </div>

    <form class="composer" (ngSubmit)="send()">
      <label class="sr-only" for="chat-message">Escribe tu mensaje</label>
      <input id="chat-message" name="message" [ngModel]="draft()" (ngModelChange)="draft.set($event)" [maxlength]="maxMessageLength" autocomplete="off" placeholder="Escribe qué buscas" aria-describedby="chat-privacy chat-count">
      <button class="button" type="submit" [disabled]="loading() || draft().trim().length < 2"><app-icon name="send" /><span>Enviar</span></button>
      <div class="composer-notes">
        <small class="privacy" id="chat-privacy">{{ privacyNotice }}</small>
        <small class="count" id="chat-count" [class.near-limit]="draft().length > maxMessageLength - 50">{{ draft().length }}/{{ maxMessageLength }}</small>
      </div>
    </form>
  </section>
</main>`,
})
export class ChatComponent {
  private readonly api = inject(ApiService);
  private readonly injector = inject(Injector);
  protected readonly session = inject(ChatSessionService);
  protected readonly quickActions = quickActions;
  protected readonly maxMessageLength = maxMessageLength;
  protected readonly privacyNotice = privacyNotice;
  protected readonly expiresLabel = expiresLabel;
  private readonly messageList = viewChild<ElementRef<HTMLElement>>('messageList');
  readonly draft = signal('');
  readonly loading = signal(false);

  reset() {
    this.session.reset();
    this.draft.set('');
  }

  ask(message: string) {
    this.draft.set(message);
    void this.send();
  }

  async send() {
    const content = this.draft().trim().slice(0, maxMessageLength);
    if (content.length < 2 || this.loading()) return;
    this.draft.set('');
    this.push({ role: 'user', content });
    this.loading.set(true);
    try {
      const neighborhood = this.session.neighborhood();
      const response = await this.api.chat({ messages: buildHistory(this.session.messages()), ...(neighborhood ? { neighborhood } : {}) });
      this.session.remember(response.intent?.neighborhood ?? null);
      this.push({ role: 'assistant', content: response.reply, results: response.results, stores: response.stores, mode: response.mode });
    } catch (caught) {
      this.push({ role: 'assistant', content: caught instanceof Error ? caught.message : 'El asistente no pudo responder.', isError: true });
    } finally {
      this.loading.set(false);
    }
  }

  private push(message: Omit<ConversationMessage, 'id'>) {
    this.session.add(message);
    afterNextRender(
      () => {
        const list = this.messageList()?.nativeElement;
        list?.scrollTo?.({ top: list.scrollHeight, behavior: 'smooth' });
      },
      { injector: this.injector },
    );
  }
}
