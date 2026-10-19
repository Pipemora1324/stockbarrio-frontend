import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import type { Offer, OfferQuery, OfferSort, Product } from '../../models';
import { LocationService } from '../../services/location.service';

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
});

const sortLabels: Record<OfferSort, string> = { discount: 'Mayor descuento', nearest: 'Más cerca', expiring: 'Vence primero' };

@Component({
  selector: 'app-offers',
  imports: [FormsModule, RouterLink, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './offers.component.scss',
  template: `
<main class="offers-page">
  <header class="page-header">
    <span class="eyebrow">Ofertas</span>
    <h1>Descuentos de hoy en tu barrio</h1>
    <p>Productos con descuento en las tiendas cercanas, muchos por vencer pronto. Filtra por barrio, categoría o cercanía y ordena como prefieras.</p>
  </header>

  <form class="filters" role="search" (ngSubmit)="search()" aria-label="Filtrar ofertas">
    <label>Barrio
      <select name="neighborhood" [ngModel]="neighborhood()" (ngModelChange)="neighborhood.set($event); search()">
        <option value="">Todos los barrios</option>
        @for (item of neighborhoods(); track item) { <option [value]="item">{{ item }}</option> }
      </select>
    </label>
    <label>Categoría
      <select name="category" [ngModel]="category()" (ngModelChange)="category.set($event); search()">
        <option value="">Todas las categorías</option>
        @for (item of categories(); track item) { <option [value]="item">{{ item }}</option> }
      </select>
    </label>
    <label>Producto
      <input name="search" type="search" maxlength="80" placeholder="Ej. leche" [ngModel]="text()" (ngModelChange)="text.set($event)">
    </label>
    <label>Ordenar por
      <select name="sort" [ngModel]="sort()" (ngModelChange)="changeSort($event)">
        @for (option of sortOptions; track option) { <option [value]="option">{{ sortLabels[option] }}</option> }
      </select>
    </label>
    <div class="near">
      @if (location.location()) {
        <label>Distancia
          <select name="radius" [ngModel]="radiusKm()" (ngModelChange)="radiusKm.set($event); search()">
            <option [ngValue]="null">Cualquier distancia</option>
            @for (option of radiusOptions; track option) { <option [ngValue]="option">Hasta {{ option }} km</option> }
          </select>
        </label>
        <button class="link-button" type="button" (click)="forgetLocation()">Dejar de usar mi ubicación</button>
      } @else {
        <button class="button button-light" type="button" [disabled]="location.locating()" (click)="useLocation()">{{ location.locating() ? 'Buscando tu ubicación…' : '📍 Cerca de mí' }}</button>
      }
    </div>
    <button class="button" type="submit">Buscar</button>
  </form>
  @if (locationError()) { <p class="alert alert-error" role="alert">{{ locationError() }}</p> }

  <section class="results" aria-live="polite" aria-labelledby="offers-count">
    <h2 id="offers-count" class="results-title">@if (loading()) { Buscando ofertas… } @else { {{ total() }} {{ total() === 1 ? 'oferta' : 'ofertas' }}@if (location.location()) { <small> · distancias aproximadas desde tu ubicación</small> } }</h2>
    @if (error()) {
      <div class="state state-error" role="alert"><p>{{ error() }}</p><button class="button" type="button" (click)="search()">Reintentar</button></div>
    } @else if (!loading() && !offers().length) {
      <div class="state">
        <p>No hay ofertas con estos filtros.</p>
        @if (hasFilters()) { <button class="button button-light" type="button" (click)="clearFilters()">Quitar filtros</button> } @else { <p>Pregúntale al <a routerLink="/chat">asistente</a> por lo que necesitas o revisa el <a routerLink="/catalogo">catálogo</a>.</p> }
      </div>
    } @else {
      <ul class="cards-grid">
        @for (offer of offers(); track offer.productId) { <li><app-product-card [product]="cardOf(offer)" [distanceKm]="offer.distanceKm" /></li> }
      </ul>
    }
  </section>
</main>`,
})
export class OffersComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly location = inject(LocationService);
  protected readonly sortOptions: OfferSort[] = ['discount', 'nearest', 'expiring'];
  protected readonly sortLabels = sortLabels;
  protected readonly radiusOptions = [1, 2, 5, 10];
  readonly neighborhoods = signal<string[]>([]);
  readonly categories = signal<string[]>([]);
  readonly neighborhood = signal('');
  readonly category = signal('');
  readonly text = signal('');
  readonly sort = signal<OfferSort>('discount');
  readonly radiusKm = signal<number | null>(null);
  readonly offers = signal<Offer[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly locationError = signal('');
  readonly hasFilters = computed(() => Boolean(this.neighborhood() || this.category() || this.text().trim() || this.radiusKm()));
  private readonly cards = new WeakMap<Offer, Product>();
  private requestId = 0;

  ngOnInit() {
    const params = this.route.snapshot.queryParamMap;
    this.neighborhood.set(params.get('barrio') ?? '');
    this.category.set(params.get('categoria') ?? '');
    this.text.set(params.get('q') ?? '');
    const sort = params.get('orden') as OfferSort | null;
    if (sort === 'discount' || sort === 'expiring') this.sort.set(sort);
    this.api.getNeighborhoods().then((items) => this.neighborhoods.set(items), () => this.neighborhoods.set([]));
    this.api.getCategories().then((items) => this.categories.set(items), () => this.categories.set([]));
    void this.search();
  }

  cardOf(offer: Offer): Product {
    let card = this.cards.get(offer);
    if (!card) {
      card = toCardProduct(offer);
      this.cards.set(offer, card);
    }
    return card;
  }

  async changeSort(sort: OfferSort) {
    if (sort === 'nearest' && !this.location.location()) {
      const located = await this.useLocation();
      if (!located) {
        this.sort.set('discount');
        return;
      }
    }
    this.sort.set(sort);
    void this.search();
  }

  async useLocation(): Promise<boolean> {
    this.locationError.set('');
    try {
      await this.location.requestLocation();
      void this.search();
      return true;
    } catch (caught) {
      this.locationError.set(caught instanceof Error ? caught.message : 'No pudimos usar tu ubicación.');
      return false;
    }
  }

  forgetLocation() {
    this.location.clear();
    this.radiusKm.set(null);
    if (this.sort() === 'nearest') this.sort.set('discount');
    void this.search();
  }

  clearFilters() {
    this.neighborhood.set('');
    this.category.set('');
    this.text.set('');
    this.radiusKm.set(null);
    void this.search();
  }

  async search() {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    this.syncUrl();
    const coordinates = this.location.location();
    const query: OfferQuery = {
      sort: this.sort(),
      ...(this.neighborhood() ? { neighborhood: this.neighborhood() } : {}),
      ...(this.category() ? { category: this.category() } : {}),
      ...(this.text().trim().length >= 2 ? { search: this.text().trim() } : {}),
      ...(coordinates ? { latitude: coordinates.latitude, longitude: coordinates.longitude } : {}),
      ...(coordinates && this.radiusKm() ? { radiusKm: Number(this.radiusKm()) } : {}),
    };
    try {
      const response = await this.api.searchOffers(query);
      if (id !== this.requestId) return;
      this.offers.set(response.data);
      this.total.set(response.total);
    } catch (caught) {
      if (id !== this.requestId) return;
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar las ofertas.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  // Keeps the filters in the address so an offers view can be shared; the location is never written there.
  private syncUrl() {
    void this.router.navigate([], {
      relativeTo: this.route,
      replaceUrl: true,
      queryParams: { barrio: this.neighborhood() || null, categoria: this.category() || null, q: this.text().trim() || null, orden: this.sort() === 'nearest' ? null : this.sort() },
    });
  }
}
