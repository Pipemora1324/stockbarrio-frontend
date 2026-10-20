import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { daysUntil, expirationLabel } from '../../dates';
import type { Product } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { IconComponent } from '../icon/icon.component';
import { iconForCategory } from './category-icon';

// Un producto mostrado como etiqueta de precio. Las ofertas dicen hasta cuándo duran; los demás, cuándo vence el producto.
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
  @if (onOffer() && offerTag()) { <span class="offer-tag">En oferta</span> }
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
  // Más grande y llamativa: se usa para los descuentos más grandes.
  readonly featured = input(false);
  readonly showStore = input(true);
  // Etiqueta "En oferta", para las listas que mezclan productos con oferta y sin ella (el catálogo).
  readonly offerTag = input(false);
  protected readonly icon = computed(() => iconForCategory(this.product().category));
  protected readonly onOffer = computed(() => this.product().discountPercent > 0);
  protected readonly days = computed(() => daysUntil(this.product().expirationDate));
  protected readonly expiresLabel = computed(() => expirationLabel(this.days()));
  protected readonly offerDays = computed(() => daysUntil(this.product().offerEndsOn ?? this.product().expirationDate));
  protected readonly offerLabel = computed(() => offerUntilLabel(this.product().offerEndsOn ?? '', this.offerDays()));
}

// "Oferta solo por hoy", "Oferta hasta mañana" u "Oferta hasta el 24/10".
export const offerUntilLabel = (endsOn: string, days: number) => {
  if (days <= 0) return 'Oferta solo por hoy';
  if (days === 1) return 'Oferta hasta mañana';
  const [, month, day] = endsOn.split('-');
  return `Oferta hasta el ${day}/${month}`;
};
