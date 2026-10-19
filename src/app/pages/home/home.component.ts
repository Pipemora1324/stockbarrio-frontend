import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import type { Product, Store } from '../../models';

const featuredCount = 4;
const storesShown = 8;

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCardComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.component.scss',
  template: `
<main class="home">
  <section class="hero">
    <div class="hero-copy">
      <span class="eyebrow">Menos desperdicio, más barrio</span>
      <h1>Compra inteligente.<br><em>Ahorra en tu barrio.</em></h1>
      <p>Encuentra en las tiendas cercanas los productos que necesitas, con descuentos en lo que está por vencer. Pregúntale al asistente y te muestra la opción más barata o la más cerca.</p>
      <div class="hero-actions">
        <a class="button" routerLink="/ofertas">Ver ofertas de hoy</a>
        <a class="button button-light" routerLink="/chat">Preguntar al asistente</a>
      </div>
    </div>
    <div class="hero-visual">
      <a class="visual-card" routerLink="/ofertas" [attr.aria-label]="'Ver ' + discounted().length + ' ofertas de hoy'"><span>Ofertas hoy</span><strong>{{ loading() ? '…' : discounted().length }}</strong><small>productos con descuento · Ver todas →</small></a>
      <div class="mini-card" aria-hidden="true"><span>🌱</span><p><strong>Menos desperdicio</strong><br>Productos próximos a vencer a mejor precio</p></div>
    </div>
  </section>

  <section class="section" aria-labelledby="stores-title">
    <div class="section-heading">
      <div><span class="eyebrow">Cerca de ti</span><h2 id="stores-title">Tiendas del barrio</h2></div>
      <a routerLink="/catalogo">Ver todo el catálogo →</a>
    </div>
    @if (loading()) {
      <p class="state" role="status">Cargando tiendas…</p>
    } @else if (error()) {
      <div class="state state-error" role="alert"><p>{{ error() }}</p><button class="button" type="button" (click)="load()">Reintentar</button></div>
    } @else if (!stores().length) {
      <p class="state">Todavía no hay tiendas registradas. ¿Tienes una? <a routerLink="/register" [queryParams]="{ tipo: 'tienda' }">Regístrala gratis</a>.</p>
    } @else {
      <ul class="cards-grid">
        @for (store of shownStores(); track store.id) {
          <li class="card store-card">
            <div class="store-icon" aria-hidden="true">🏪</div>
            <h3>{{ store.name }}</h3>
            <p>{{ store.neighborhood }} · {{ store.address }}</p>
            <a class="text-link" [routerLink]="['/catalogo']" [queryParams]="{ barrio: store.neighborhood }">Ver productos de {{ store.neighborhood }} →</a>
          </li>
        }
      </ul>
    }
  </section>

  @if (!loading() && !error() && featured().length) {
    <section class="section section-green" aria-labelledby="deals-title">
      <div class="section-heading">
        <div><span class="eyebrow">Ofertas relámpago</span><h2 id="deals-title">Productos que vuelven a ahorrar</h2></div>
        <a routerLink="/ofertas">Ver todas las ofertas →</a>
      </div>
      <ul class="cards-grid">
        @for (product of featured(); track product.id) { <li><app-product-card [product]="product" /></li> }
      </ul>
    </section>
  }
</main>`,
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly stores = signal<Store[]>([]);
  readonly products = signal<Product[]>([]);
  readonly loading = signal(true);
  readonly error = signal('');
  readonly shownStores = computed(() => this.stores().slice(0, storesShown));
  readonly discounted = computed(() => this.products().filter((product) => product.discountPercent > 0));
  // Discounted products first (the API already sorts by expiration), then the rest to fill the row.
  readonly featured = computed(() => [...this.discounted(), ...this.products().filter((product) => product.discountPercent === 0)].slice(0, featuredCount));

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.loading.set(true);
    this.error.set('');
    try {
      const [stores, products] = await Promise.all([this.api.getStores(), this.api.getProducts()]);
      this.stores.set(stores);
      this.products.set(products);
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudieron cargar las tiendas.');
    } finally {
      this.loading.set(false);
    }
  }
}
