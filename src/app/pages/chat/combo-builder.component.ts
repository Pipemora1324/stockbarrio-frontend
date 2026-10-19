import { ChangeDetectionStrategy, Component, inject, input, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, type Recommendation } from '../../api.service';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';

@Component({
  selector: 'app-combo-builder',
  imports: [FormsModule, CopCurrencyPipe, CalendarDatePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './combo-builder.component.scss',
  template: `
<aside class="combo" aria-labelledby="combo-title">
  <span class="eyebrow">Combo con presupuesto</span>
  <h2 id="combo-title">Arma un combo que ahorre</h2>
  <p>Dinos cuánto quieres gastar y en qué barrio: priorizamos lo que vence primero sin pasarnos del presupuesto ni del stock.</p>
  <form (ngSubmit)="build()" #comboForm="ngForm">
    <label for="combo-budget">Presupuesto (COP)</label>
    <input id="combo-budget" name="budget" type="number" min="1000" step="500" [(ngModel)]="budget" required>
    <label for="combo-neighborhood">Barrio</label>
    <select id="combo-neighborhood" name="neighborhood" [(ngModel)]="neighborhood" required>
      <option value="" disabled>Elige un barrio</option>
      @for (item of neighborhoods(); track item) { <option [value]="item">{{ item }}</option> }
    </select>
    <button class="button" type="submit" [disabled]="loading() || comboForm.invalid">{{ loading() ? 'Armando…' : 'Armar combo' }}</button>
  </form>
  @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
  <div aria-live="polite">
    @if (recommendation(); as result) {
      <p class="suggestion">{{ result.suggestion }}</p>
      @if (result.products.length) {
        <ul class="result-list">
          @for (item of result.products; track item.productId) {
            <li><span><strong>{{ item.quantity }} × {{ item.name }}</strong><small>Vence {{ item.expirationDate | calendarDate }}</small></span><span>{{ item.total | cop }}</span></li>
          }
        </ul>
        <div class="totals"><span>Total</span><strong>{{ result.total | cop }}</strong></div>
        <div class="totals"><span>Ahorro</span><strong>{{ result.savings | cop }}</strong></div>
      }
    }
  </div>
</aside>`,
})
export class ComboBuilderComponent {
  private readonly api = inject(ApiService);
  readonly neighborhoods = input<string[]>([]);
  readonly recommendation = signal<Recommendation | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  budget: number | null = 20000;
  neighborhood = '';

  async build() {
    this.loading.set(true);
    this.error.set('');
    try {
      this.recommendation.set(await this.api.recommend({ budget: Number(this.budget), neighborhood: this.neighborhood, productIds: [] }));
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo armar el combo.');
    } finally {
      this.loading.set(false);
    }
  }
}
