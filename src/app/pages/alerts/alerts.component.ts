import { ChangeDetectionStrategy, Component, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { AlertInput, AlertSubscription } from '../../models';

type PlaceMode = 'anywhere' | 'neighborhood';

@Component({
  selector: 'app-alerts',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './alerts.component.scss',
  template: `
<main class="alerts-page">
  <header class="page-header">
    <span class="eyebrow">Mis alertas</span>
    <h1>Te avisamos cuando haya descuento</h1>
    <p>Elige un producto o una categoría, dónde te interesa y el descuento mínimo. Cuando una tienda aplique un descuento que coincida, te llegará un aviso a tu <a routerLink="/notificaciones">bandeja</a>.</p>
  </header>

  <section class="card" aria-labelledby="new-alert-title">
    <h2 id="new-alert-title">Nueva alerta</h2>
    <form class="alert-form" (ngSubmit)="create()">
      <label>Producto<input name="query" [(ngModel)]="query" maxlength="80" placeholder="Ej. huevos, leche deslactosada"></label>
      <label>Categoría (opcional)<input name="category" [(ngModel)]="category" maxlength="80" placeholder="Ej. Lácteos"></label>
      <fieldset class="full">
        <legend>¿Dónde?</legend>
        <label class="radio"><input type="radio" name="placeMode" value="anywhere" [(ngModel)]="placeMode"> En cualquier barrio</label>
        <label class="radio"><input type="radio" name="placeMode" value="neighborhood" [(ngModel)]="placeMode"> En un barrio</label>
      </fieldset>
      @if (placeMode === 'neighborhood') {
        <label class="full">Barrio
          <select name="neighborhood" [(ngModel)]="neighborhood" required>
            <option value="" disabled>Elige un barrio</option>
            @for (item of neighborhoods(); track item) { <option [value]="item">{{ item }}</option> }
          </select>
        </label>
      }
      <label>Descuento mínimo
        <select name="minDiscount" [(ngModel)]="minDiscount">@for (option of discountOptions; track option) { <option [ngValue]="option">{{ option === 0 ? 'Cualquier descuento' : option + ' % o más' }}</option> }</select>
      </label>
      <div class="form-actions"><button class="button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Crear alerta' }}</button></div>
    </form>
    @if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }
    @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
  </section>

  <section class="card" aria-labelledby="my-alerts-title">
    <h2 id="my-alerts-title">Alertas activas</h2>
    @if (loading()) {
      <p class="muted" role="status">Cargando tus alertas…</p>
    } @else if (!alerts().length) {
      <p class="muted">Aún no tienes alertas. Crea la primera arriba.</p>
    } @else {
      <ul class="alert-list">
        @for (alert of alerts(); track alert.id) {
          <li>
            <div><strong>{{ describe(alert) }}</strong><small>{{ describePlace(alert) }} · {{ alert.minDiscount ? alert.minDiscount + ' % o más' : 'cualquier descuento' }}</small></div>
            <button class="link-button danger" type="button" (click)="remove(alert)" [attr.aria-label]="'Eliminar alerta de ' + describe(alert)">Eliminar</button>
          </li>
        }
      </ul>
    }
  </section>
</main>`,
})
export class AlertsComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly discountOptions = [0, 10, 20, 30, 50];
  readonly alerts = signal<AlertSubscription[]>([]);
  readonly neighborhoods = signal<string[]>([]);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly notice = signal('');
  readonly error = signal('');
  query = '';
  category = '';
  neighborhood = '';
  placeMode: PlaceMode = 'anywhere';
  minDiscount = 0;

  ngOnInit() {
    void this.load();
    this.api.getNeighborhoods().then((items) => this.neighborhoods.set(items), () => this.neighborhoods.set([]));
  }

  describe(alert: AlertSubscription) {
    return [alert.query, alert.category].filter(Boolean).join(' · ');
  }

  describePlace(alert: AlertSubscription) {
    return alert.neighborhood ? `en ${alert.neighborhood}` : 'en cualquier barrio';
  }

  async load() {
    this.loading.set(true);
    try {
      this.alerts.set(await this.api.getAlerts());
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar tus alertas.');
    } finally {
      this.loading.set(false);
    }
  }

  async create() {
    this.notice.set('');
    this.error.set('');
    const payload = this.buildPayload();
    if (typeof payload === 'string') {
      this.error.set(payload);
      return;
    }
    this.saving.set(true);
    try {
      const response = await this.api.createAlert(payload);
      this.notice.set(response.message);
      this.query = '';
      this.category = '';
      await this.load();
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo crear la alerta.');
    } finally {
      this.saving.set(false);
    }
  }

  async remove(alert: AlertSubscription) {
    if (!window.confirm(`¿Eliminar la alerta de «${this.describe(alert)}»?`)) return;
    this.error.set('');
    try {
      await this.api.deleteAlert(alert.id);
      this.alerts.update((items) => items.filter((item) => item.id !== alert.id));
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo eliminar la alerta.');
    }
  }

  // Returns the request body, or a Spanish message explaining what is missing.
  buildPayload(): AlertInput | string {
    const query = this.query.trim();
    const category = this.category.trim();
    if (!query && !category) return 'Escribe un producto o una categoría.';
    const payload: AlertInput = { minDiscount: Number(this.minDiscount), ...(query ? { query } : {}), ...(category ? { category } : {}) };
    if (this.placeMode === 'neighborhood') {
      if (!this.neighborhood) return 'Elige el barrio de la alerta.';
      payload.neighborhood = this.neighborhood;
    }
    return payload;
  }
}
