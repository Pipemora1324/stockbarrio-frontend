import { ChangeDetectionStrategy, Component, computed, effect, inject, input, output, signal, untracked } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { IconComponent } from '../../components/icon/icon.component';
import { todayInBogota } from '../../dates';
import type { DiscountSuggestion } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import * as rules from '../../validation/rules';

export const perishableNotice =
  'Solo sugerimos descuentos para productos perecederos que están por vencer (frutas y verduras, carnes, pollo, pescados, lácteos, huevos, panadería y comidas preparadas). Los no perecederos, como enlatados, granos o bebidas, nunca se sugieren, pero puedes ponerlos en oferta a mano desde «Editar».';

interface Range {
  offerStartsOn: string;
  offerEndsOn: string;
}

@Component({
  selector: 'app-suggestions-panel',
  imports: [FormsModule, CopCurrencyPipe, CalendarDatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './suggestions-panel.component.scss',
  template: `
<section class="card suggestions" aria-labelledby="suggestions-title">
  <div class="suggestions-header">
    <div>
      <span class="eyebrow"><app-icon name="percent" />Asistente de vencimientos</span>
      <h2 id="suggestions-title">Descuentos sugeridos</h2>
      <p class="muted">Revisamos tu inventario por días para vencer y stock alto. Ningún descuento se aplica sin tu aprobación, y al aprobar eliges sus fechas.</p>
    </div>
    @if (suggestions().length > 1) {
      <button class="button" type="button" [disabled]="busy()" (click)="approveAll()"><app-icon name="check" />Aprobar todas ({{ suggestions().length }})</button>
    }
  </div>
  <p class="alert alert-info notice">{{ notice }}</p>
  @if (message()) { <p class="alert alert-success" role="status">{{ message() }}</p> }
  @if (error()) { <p class="alert alert-error" role="alert">{{ error() }} <button class="link-button" type="button" (click)="load()">Reintentar</button></p> }
  @if (loading()) {
    <p class="muted" role="status">Analizando tu inventario…</p>
  } @else if (!suggestions().length && !error()) {
    <p class="muted empty">No hay descuentos por sugerir: ningún producto perecedero vence en los próximos 14 días sin un buen descuento.</p>
  } @else {
    <ul class="suggestion-list">
      @for (suggestion of suggestions(); track suggestion.id) {
        <li class="suggestion">
          <div class="suggestion-main">
            <strong>{{ suggestion.productName }}</strong>
            <span class="days" [class.urgent]="suggestion.daysToExpire <= 1">{{ daysLabel(suggestion.daysToExpire) }} · {{ suggestion.expirationDate | calendarDate }}</span>
            <p>{{ suggestion.reason }}</p>
            @if (suggestion.source === 'ai') { <span class="source">Texto redactado con IA; el porcentaje sale de las reglas.</span> }
          </div>
          <div class="suggestion-numbers">
            <span>{{ suggestion.currentPercent }} % → <strong>{{ suggestion.suggestedPercent }} %</strong></span>
            <span><s><span class="sr-only">Antes </span>{{ suggestion.price | cop }}</s> <strong>{{ suggestion.suggestedPrice | cop }}</strong></span>
            <small>Stock {{ suggestion.stock }}</small>
          </div>
          @if (editingId() === suggestion.id) {
            <form class="range" (ngSubmit)="confirm(suggestion)" novalidate [attr.aria-label]="'Fechas de la oferta de ' + suggestion.productName">
              <div class="field">
                <label [for]="'start-' + suggestion.id">Fecha de inicio</label>
                <input [id]="'start-' + suggestion.id" name="start" type="date" [min]="today" [max]="suggestion.expirationDate" [ngModel]="range().offerStartsOn" (ngModelChange)="setRange('offerStartsOn', $event)" [attr.aria-invalid]="rangeErrors().start ? true : null">
                @if (rangeErrors().start) { <small class="field-error">{{ rangeErrors().start }}</small> }
              </div>
              <div class="field">
                <label [for]="'end-' + suggestion.id">Fecha de finalización</label>
                <input [id]="'end-' + suggestion.id" name="end" type="date" [min]="range().offerStartsOn || today" [max]="suggestion.expirationDate" [ngModel]="range().offerEndsOn" (ngModelChange)="setRange('offerEndsOn', $event)" [attr.aria-invalid]="rangeErrors().end ? true : null">
                @if (rangeErrors().end) { <small class="field-error">{{ rangeErrors().end }}</small> }
              </div>
              <div class="range-actions">
                <button class="button" type="submit" [disabled]="busy() || !!rangeErrors().start || !!rangeErrors().end"><app-icon name="check" />Aplicar descuento</button>
                <button class="button button-light" type="button" (click)="editingId.set(null)">Cancelar</button>
              </div>
            </form>
          } @else {
            <div class="suggestion-actions">
              <button class="button" type="button" [disabled]="busy()" (click)="startApproval(suggestion)">Aprobar</button>
              <button class="button button-light" type="button" [disabled]="busy()" (click)="reject(suggestion)">Rechazar</button>
            </div>
          }
        </li>
      }
    </ul>
  }
</section>`,
})
export class SuggestionsPanelComponent {
  private readonly api = inject(ApiService);
  readonly storeId = input<string | undefined>(undefined);
  readonly applied = output<void>();
  protected readonly notice = perishableNotice;
  protected readonly today = todayInBogota();
  readonly suggestions = signal<DiscountSuggestion[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly message = signal('');
  // The suggestion being approved and the range proposed for it.
  readonly editingId = signal<string | null>(null);
  readonly range = signal<Range>({ offerStartsOn: '', offerEndsOn: '' });
  private readonly editing = computed(() => this.suggestions().find((item) => item.id === this.editingId()) ?? null);
  readonly rangeErrors = computed(() => {
    const suggestion = this.editing();
    if (!suggestion) return { start: '', end: '' };
    const { offerStartsOn, offerEndsOn } = this.range();
    return { start: rules.offerStart(offerStartsOn, this.today), end: rules.offerEnd(offerEndsOn, offerStartsOn, suggestion.expirationDate, this.today) };
  });

  constructor() {
    // Loads again whenever the panel switches to another store.
    effect(() => {
      this.storeId();
      untracked(() => void this.load());
    });
  }

  daysLabel(days: number) {
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    this.editingId.set(null);
    try {
      this.suggestions.set(await this.api.getSuggestions(this.storeId()));
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar las sugerencias.');
    } finally {
      this.loading.set(false);
    }
  }

  // Proposes from today until the expiration date; the store can change both before applying.
  startApproval(suggestion: DiscountSuggestion) {
    this.range.set({ offerStartsOn: suggestion.proposedStartsOn || this.today, offerEndsOn: suggestion.proposedEndsOn || suggestion.expirationDate });
    this.editingId.set(suggestion.id);
  }

  setRange(field: keyof Range, value: string) {
    this.range.update((current) => ({ ...current, [field]: value }));
  }

  async confirm(suggestion: DiscountSuggestion) {
    const errors = this.rangeErrors();
    if (errors.start || errors.end) return;
    const range = this.range();
    await this.run(async () => (await this.api.approveSuggestion(suggestion.id, range, this.storeId())).message, true);
  }

  async reject(suggestion: DiscountSuggestion) {
    await this.run(async () => (await this.api.rejectSuggestion(suggestion.id, this.storeId())).message, false);
  }

  async approveAll() {
    if (!window.confirm(`¿Aplicar los ${this.suggestions().length} descuentos sugeridos? Cada oferta irá desde hoy hasta el vencimiento de su producto.`)) return;
    await this.run(async () => (await this.api.approveAllSuggestions(this.storeId())).message, true);
  }

  private async run(action: () => Promise<string>, changesInventory: boolean) {
    this.busy.set(true);
    this.message.set('');
    let failure = '';
    try {
      this.message.set(await action());
      if (changesInventory) this.applied.emit();
    } catch (caught) {
      failure = caught instanceof Error ? caught.message : 'No se pudo completar la acción.';
    } finally {
      this.busy.set(false);
    }
    // Reload either way (another tab may have changed things), then show the failure on top.
    await this.load();
    if (failure) this.error.set(failure);
  }
}
