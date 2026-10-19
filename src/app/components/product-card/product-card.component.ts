import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daysUntil, expirationLabel } from '../../dates';
import type { Product } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { DistancePipe } from '../../pipes/distance.pipe';
import { iconForCategory } from './category-icon';

@Component({
  selector: 'app-product-card',
  imports: [CopCurrencyPipe, CalendarDatePipe, DistancePipe],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-card.component.scss',
  template: `
<article class="product-card">
  <div class="media" [style.background]="icon().background">
    @if (product().imageUrl) {
      <img [src]="product().imageUrl" [alt]="product().name" loading="lazy" decoding="async" width="320" height="200">
    } @else {
      <span class="icon" aria-hidden="true">{{ icon().icon }}</span>
    }
    @if (product().discountPercent > 0) { <span class="badge">-{{ product().discountPercent }}%</span> }
  </div>
  <div class="body">
    <span class="category">{{ product().category }}</span>
    <h3>{{ product().name }}</h3>
    @if (product().storeName) { <p class="store">{{ product().storeName }} · {{ product().neighborhood }}@if (distanceKm() !== null) { · <span class="distance">{{ distanceKm() | distance }}</span> }</p> }
    <p class="price"><strong>{{ product().offerPrice | cop }}</strong>@if (product().offerPrice < product().price) { <s><span class="sr-only">Antes </span>{{ product().price | cop }}</s> }</p>
    <p class="meta"><span [class.urgent]="days() <= 1">{{ expiresLabel() }}</span> · {{ product().expirationDate | calendarDate }} · Stock {{ product().stock }}</p>
  </div>
</article>`,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  readonly distanceKm = input<number | null>(null);
  protected readonly icon = computed(() => iconForCategory(this.product().category));
  protected readonly days = computed(() => daysUntil(this.product().expirationDate));
  protected readonly expiresLabel = computed(() => expirationLabel(this.days()));
}
