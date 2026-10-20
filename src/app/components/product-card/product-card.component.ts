import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daysUntil, expirationLabel } from '../../dates';
import type { Product } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { IconComponent } from '../icon/icon.component';
import { iconForCategory } from './category-icon';

// A product shown as a price tag. Offers say until when they last; the rest say when the product expires.
@Component({
  selector: 'app-product-card',
  imports: [CopCurrencyPipe, CalendarDatePipe, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-card.component.scss',
  template: `
<article class="price-tag" [class.featured]="featured()" [class.on-offer]="onOffer()">
  @if (onOffer()) { <span class="ribbon" [attr.aria-label]="product().discountPercent + ' % de descuento'">-{{ product().discountPercent }}%</span> }
  <div class="tag-top">
    <span class="stamp" [attr.data-tone]="icon().tone"><app-icon [name]="icon().icon" /></span>
    <span class="category">{{ product().category }}</span>
  </div>
  <h3>{{ product().name }}</h3>
  @if (showStore() && product().storeName) { <p class="store"><app-icon name="store" />{{ product().storeName }} · {{ product().neighborhood }}</p> }
  <p class="price">
    <strong>{{ product().offerPrice | cop }}</strong>
    @if (onOffer() && product().offerPrice < product().price) { <s><span class="sr-only">Antes </span>{{ product().price | cop }}</s> }
  </p>
  <p class="meta">
    @if (onOffer() && product().offerEndsOn) {
      <span class="until" [class.urgent]="offerDays() <= 1"><app-icon name="clock" />{{ offerLabel() }}</span>
    } @else {
      <span [class.urgent]="days() <= 1">{{ expiresLabel() }} · {{ product().expirationDate | calendarDate }}</span>
    }
    <span class="stock">{{ product().stock > 0 ? 'Stock ' + product().stock : 'Agotado' }}</span>
  </p>
</article>`,
})
export class ProductCardComponent {
  readonly product = input.required<Product>();
  // Bigger and brighter: used for the biggest discounts.
  readonly featured = input(false);
  readonly showStore = input(true);
  protected readonly icon = computed(() => iconForCategory(this.product().category));
  protected readonly onOffer = computed(() => this.product().discountPercent > 0);
  protected readonly days = computed(() => daysUntil(this.product().expirationDate));
  protected readonly expiresLabel = computed(() => expirationLabel(this.days()));
  protected readonly offerDays = computed(() => daysUntil(this.product().offerEndsOn ?? this.product().expirationDate));
  protected readonly offerLabel = computed(() => offerUntilLabel(this.product().offerEndsOn ?? '', this.offerDays()));
}

// "Oferta hasta hoy", "Oferta hasta mañana" or "Oferta hasta el 24/10".
export const offerUntilLabel = (endsOn: string, days: number) => {
  if (days <= 0) return 'Oferta solo por hoy';
  if (days === 1) return 'Oferta hasta mañana';
  const [, month, day] = endsOn.split('-');
  return `Oferta hasta el ${day}/${month}`;
};
