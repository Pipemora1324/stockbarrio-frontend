import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { CategoryFilterComponent } from '../../components/category-filter/category-filter.component';
import { IconComponent } from '../../components/icon/icon.component';
import { IllustrationComponent } from '../../components/illustration/illustration.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { RevealDirective } from '../../components/reveal.directive';
import type { Offer, Product } from '../../models';

export const toCardProduct = (offer: Offer): Product => ({
  id: offer.productId,
  storeId: offer.store.id,
  storeName: offer.store.name,
  neighborhood: offer.store.neighborhood,
  name: offer.name,
  category: offer.category,
  description: offer.description,
  price: offer.price,
  offerPrice: offer.offerPrice,
  stock: offer.stock,
  expirationDate: offer.expirationDate,
  discountPercent: offer.discountPercent,
  imageUrl: offer.imageUrl,
  active: true,
  offerStartsOn: offer.offerStartsOn,
  offerEndsOn: offer.offerEndsOn,
});

// The biggest discounts stand out: at most this many, and only from this percent.
export const maxFeatured = 3;
export const featuredMinPercent = 30;

// Offers come sorted by the biggest discount first (the API default).
export const splitFeatured = (offers: Product[]) => {
  const featured = offers.slice(0, maxFeatured).filter((offer) => offer.discountPercent >= featuredMinPercent);
  return { featured, rest: offers.slice(featured.length) };
};

@Component({
  selector: 'app-offers',
  imports: [RouterLink, ProductCardComponent, CategoryFilterComponent, IconComponent, IllustrationComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './offers.component.scss',
  template: `
<main class="page offers-page">
  <header class="page-header">
    <span class="eyebrow"><app-icon name="tag" />Ofertas</span>
    <h1>Descuentos activos hoy</h1>
    <p>Productos con descuento en las tiendas de barrio, del más rebajado al menos. Cada oferta dice hasta cuándo dura.</p>
  </header>

  <app-category-filter label="Filtrar ofertas por categoría" [categories]="categories()" [value]="category()" (valueChange)="choose($event)" />

  <section class="results" aria-labelledby="offers-count">
    <h2 id="offers-count" class="results-title" aria-live="polite">
      @if (loading()) { Buscando ofertas… } @else if (!error()) { {{ total() }} {{ total() === 1 ? 'oferta activa' : 'ofertas activas' }}@if (category()) { <small> en {{ category() }}</small> } }
    </h2>
    @if (error()) {
      <div class="state state-error" role="alert"><p>{{ error() }}</p><button class="button" type="button" (click)="search()"><app-icon name="refresh" />Reintentar</button></div>
    } @else if (loading()) {
      <ul class="cards-grid" aria-hidden="true"><li class="skeleton card-skeleton"></li><li class="skeleton card-skeleton"></li><li class="skeleton card-skeleton"></li></ul>
    } @else if (!offers().length) {
      <div class="state">
        <app-illustration class="state-art" name="empty-tag" />
        @if (category()) {
          <h3>No hay ofertas de {{ category() }} hoy</h3>
          <p>Prueba con otra categoría o mira todas las ofertas activas.</p>
          <div class="state-actions"><button class="button" type="button" (click)="choose('')">Ver todas las ofertas</button></div>
        } @else {
          <h3>Hoy no hay ofertas activas</h3>
          <p>Cuando las tiendas publiquen descuentos aparecerán aquí. Revisa el catálogo o pregúntale al asistente por lo que necesitas.</p>
          <div class="state-actions"><a class="button" routerLink="/catalogo"><app-icon name="catalog" />Ver el catálogo</a><a class="button button-light" routerLink="/chat"><app-icon name="chat" />Preguntar al asistente</a></div>
        }
      </div>
    } @else {
      @if (split().featured.length) {
        <h3 class="group-title"><app-icon name="bolt" />Los más rebajados</h3>
        <ul class="cards-grid featured-grid">
          @for (offer of split().featured; track offer.id) { <li appReveal><app-product-card [product]="offer" [featured]="true" /></li> }
        </ul>
      }
      @if (split().rest.length) {
        @if (split().featured.length) { <h3 class="group-title">Más ofertas</h3> }
        <ul class="cards-grid">
          @for (offer of split().rest; track offer.id) { <li appReveal><app-product-card [product]="offer" /></li> }
        </ul>
      }
    }
  </section>
</main>`,
})
export class OffersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly categories = signal<string[]>([]);
  readonly category = signal('');
  readonly offers = signal<Product[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly split = computed(() => splitFeatured(this.offers()));
  private requestId = 0;

  ngOnInit() {
    this.category.set(this.route.snapshot.queryParamMap.get('categoria') ?? '');
    this.api.getCategories().then((items) => this.categories.set(items), () => this.categories.set([]));
    void this.search();
  }

  choose(category: string) {
    this.category.set(category);
    void this.search();
  }

  async search() {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    this.syncUrl();
    try {
      const response = await this.api.searchOffers({ sort: 'discount', ...(this.category() ? { category: this.category() } : {}) });
      if (id !== this.requestId) return;
      this.offers.set(response.data.map(toCardProduct));
      this.total.set(response.total);
    } catch (caught) {
      if (id !== this.requestId) return;
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar las ofertas.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  // Keeps the category in the address so an offers view can be shared.
  private syncUrl() {
    void this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { categoria: this.category() || null } });
  }
}
