import { ChangeDetectionStrategy, Component, inject, OnInit, output, signal } from '@angular/core';
import { ApiService } from '../../api.service';
import type { DiscountSuggestion } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';

@Component({
  selector: 'app-suggestions-panel',
  imports: [CopCurrencyPipe, CalendarDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './suggestions-panel.component.scss',
  template: `
<section class="suggestions" aria-labelledby="suggestions-title">
  <div class="suggestions-header">
    <div>
      <span class="eyebrow">Asistente de vencimientos</span>
      <h2 id="suggestions-title">Descuentos sugeridos</h2>
      <p class="muted">Revisamos tu inventario por días para vencer, stock y categoría. Ningún descuento se aplica sin tu aprobación.</p>
    </div>
    @if (suggestions().length > 1) {
      <button class="button" type="button" [disabled]="busy()" (click)="approveAll()">Aprobar todas ({{ suggestions().length }})</button>
    }
  </div>
  @if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }
  @if (error()) { <p class="alert alert-error" role="alert">{{ error() }} <button class="link-button" type="button" (click)="load()">Reintentar</button></p> }
  @if (loading()) {
    <p class="muted" role="status">Analizando tu inventario…</p>
  } @else if (!suggestions().length && !error()) {
    <p class="muted">No hay descuentos por sugerir: nada de tu inventario vence en los próximos 14 días o ya tiene un buen descuento.</p>
  } @else {
    <ul class="suggestion-list">
      @for (suggestion of suggestions(); track suggestion.id) {
        <li class="suggestion">
          <div class="suggestion-main">
            <strong>{{ suggestion.productName }}</strong>
            <span class="days" [class.urgent]="suggestion.daysToExpire <= 1">{{ daysLabel(suggestion.daysToExpire) }} · {{ suggestion.expirationDate | calendarDate }}</span>
            <p>{{ suggestion.reason }}</p>
            @if (suggestion.source === 'ai') { <span class="source">Texto mejorado con IA</span> }
          </div>
          <div class="suggestion-numbers">
            <span>{{ suggestion.currentPercent }} % → <strong>{{ suggestion.suggestedPercent }} %</strong></span>
            <span><s>{{ suggestion.price | cop }}</s> <strong>{{ suggestion.suggestedPrice | cop }}</strong></span>
            <small>Stock {{ suggestion.stock }}</small>
          </div>
          <div class="suggestion-actions">
            <button class="button" type="button" [disabled]="busy()" (click)="approve(suggestion)">Aprobar</button>
            <button class="button button-light" type="button" [disabled]="busy()" (click)="reject(suggestion)">Rechazar</button>
          </div>
        </li>
      }
    </ul>
  }
</section>`,
})
export class SuggestionsPanelComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly applied = output<void>();
  readonly suggestions = signal<DiscountSuggestion[]>([]);
  readonly loading = signal(true);
  readonly busy = signal(false);
  readonly error = signal('');
  readonly notice = signal('');

  ngOnInit() {
    void this.load();
  }

  daysLabel(days: number) {
    if (days === 0) return 'Vence hoy';
    if (days === 1) return 'Vence mañana';
    return `Vence en ${days} días`;
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.suggestions.set(await this.api.getSuggestions());
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar las sugerencias.');
    } finally {
      this.loading.set(false);
    }
  }

  async approve(suggestion: DiscountSuggestion) {
    await this.run(async () => (await this.api.approveSuggestion(suggestion.id)).message, true);
  }

  async reject(suggestion: DiscountSuggestion) {
    await this.run(async () => (await this.api.rejectSuggestion(suggestion.id)).message, false);
  }

  async approveAll() {
    if (!window.confirm(`¿Aplicar los ${this.suggestions().length} descuentos sugeridos?`)) return;
    await this.run(async () => (await this.api.approveAllSuggestions()).message, true);
  }

  private async run(action: () => Promise<string>, changesInventory: boolean) {
    this.busy.set(true);
    this.notice.set('');
    let failure = '';
    try {
      this.notice.set(await action());
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
