import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { homeBanners } from '../../banners';
import { IconComponent } from '../../components/icon/icon.component';
import { IllustrationComponent } from '../../components/illustration/illustration.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { RevealDirective } from '../../components/reveal.directive';
import type { Product, Store } from '../../models';
import { toCardProduct } from '../offers/offers.component';

export const homeMessage = 'Ayudamos al ciudadano a encontrar el mejor producto al mejor precio y con los mejores descuentos cerca de su barrio.';
export const featuredCount = 4;
export const storesShown = 9;

type Load<T> = { state: 'loading' } | { state: 'ready'; items: T[] } | { state: 'error'; message: string };

@Component({
  selector: 'app-home',
  imports: [RouterLink, ProductCardComponent, IconComponent, IllustrationComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './home.component.scss',
  template: `
<main class="page home">
  <section class="hero" aria-labelledby="home-title">
    <div class="hero-copy rise">
      <span class="eyebrow"><app-icon name="pin" />Tiendas de barrio</span>
      <h1 id="home-title">El mejor precio, <span class="highlight">a la vuelta</span> de la esquina.</h1>
      <p class="lead">{{ message }}</p>
      <div class="hero-actions">
        <a class="button" routerLink="/ofertas"><app-icon name="tag" />Ver ofertas de hoy</a>
        <a class="button button-light" routerLink="/chat"><app-icon name="chat" />Preguntar al asistente</a>
      </div>
    </div>
    <div class="hero-art">
      @if (banner; as photo) {
        <figure class="banner"><img [src]="photo.src" [alt]="photo.alt" width="640" height="480" decoding="async"><figcaption>{{ photo.credit }}</figcaption></figure>
      } @else {
        <app-illustration name="stall" />
      }
    </div>
  </section>

  <section class="section" aria-labelledby="stores-title" appReveal>
    <div class="section-heading">
      <div><span class="eyebrow">Locales afiliados</span><h2 id="stores-title">Tiendas de tu barrio</h2></div>
      <a class="text-link" routerLink="/catalogo">Ver el catálogo <app-icon name="arrow" /></a>
    </div>
    @switch (stores().state) {
      @case ('loading') { <ul class="store-grid" aria-busy="true"><li class="skeleton store-skeleton"></li><li class="skeleton store-skeleton"></li><li class="skeleton store-skeleton"></li></ul><p class="sr-only" role="status">Cargando tiendas…</p> }
      @case ('error') { <div class="state state-error" role="alert"><p>{{ errorOf(stores()) }}</p><button class="button" type="button" (click)="loadStores()"><app-icon name="refresh" />Reintentar</button></div> }
      @default {
        @if (!storeItems().length) {
          <div class="state">
            <app-illustration class="state-art" name="empty-store" />
            <h3>Aún no hay locales afiliados</h3>
            <p>Muy pronto verás aquí las tiendas de tu barrio. ¿Tienes una? Publica tus productos y tus descuentos gratis.</p>
            <div class="state-actions"><a class="button" routerLink="/register" [queryParams]="{ tipo: 'tienda' }"><app-icon name="store" />Registrar mi tienda</a></div>
          </div>
        } @else {
          <ul class="store-grid">
            @for (store of storeItems(); track store.id) {
              <li>
                <a class="store-card" routerLink="/catalogo" [fragment]="'local-' + store.id">
                  <span class="store-mark" aria-hidden="true">{{ initials(store.name) }}</span>
                  <span class="store-body">
                    <strong>{{ store.name }}</strong>
                    <span class="muted">{{ store.neighborhood }} · {{ store.address }}</span>
                  </span>
                  @if (store.offerCount) { <span class="ribbon">{{ store.offerCount }} {{ store.offerCount === 1 ? 'oferta' : 'ofertas' }}</span> }
                </a>
              </li>
            }
          </ul>
        }
      }
    }
  </section>

  <section class="section" aria-labelledby="deals-title" appReveal>
    <div class="section-heading">
      <div><span class="eyebrow">Ofertas destacadas</span><h2 id="deals-title">Los descuentos más grandes de hoy</h2></div>
      <a class="text-link" routerLink="/ofertas">Ver todas las ofertas <app-icon name="arrow" /></a>
    </div>
    @switch (offers().state) {
      @case ('loading') { <ul class="cards-grid" aria-busy="true"><li class="skeleton card-skeleton"></li><li class="skeleton card-skeleton"></li><li class="skeleton card-skeleton"></li></ul><p class="sr-only" role="status">Cargando ofertas…</p> }
      @case ('error') { <div class="state state-error" role="alert"><p>{{ errorOf(offers()) }}</p><button class="button" type="button" (click)="loadOffers()"><app-icon name="refresh" />Reintentar</button></div> }
      @default {
        @if (!offerItems().length) {
          <div class="state">
            <app-illustration class="state-art" name="empty-tag" />
            <h3>Hoy no hay ofertas activas</h3>
            <p>Cuando las tiendas publiquen descuentos aparecerán aquí. Mientras tanto, revisa el catálogo o pregúntale al asistente.</p>
            <div class="state-actions"><a class="button" routerLink="/catalogo"><app-icon name="catalog" />Ver el catálogo</a><a class="button button-light" routerLink="/chat"><app-icon name="chat" />Preguntar al asistente</a></div>
          </div>
        } @else {
          <ul class="cards-grid deals">
            @for (product of offerItems(); track product.id; let first = $first) { <li [class.lead-deal]="first"><app-product-card [product]="product" [featured]="first" /></li> }
          </ul>
        }
      }
    }
  </section>
</main>`,
})
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly message = homeMessage;
  protected readonly banner = homeBanners[0] ?? null;
  readonly stores = signal<Load<Store>>({ state: 'loading' });
  readonly offers = signal<Load<Product>>({ state: 'loading' });
  readonly storeItems = computed(() => {
    const current = this.stores();
    return current.state === 'ready' ? current.items.slice(0, storesShown) : [];
  });
  readonly offerItems = computed(() => {
    const current = this.offers();
    return current.state === 'ready' ? current.items : [];
  });

  ngOnInit() {
    void this.loadStores();
    void this.loadOffers();
  }

  errorOf(load: Load<unknown>) {
    return load.state === 'error' ? load.message : '';
  }

  // "Tienda La Esquina" -> "TL", para la marca redonda de cada local.
  initials(name: string) {
    return name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((word) => word[0]!.toUpperCase())
      .join('');
  }

  async loadStores() {
    this.stores.set({ state: 'loading' });
    try {
      this.stores.set({ state: 'ready', items: await this.api.getStores() });
    } catch (caught) {
      this.stores.set({ state: 'error', message: caught instanceof Error ? caught.message : 'No se pudieron cargar las tiendas.' });
    }
  }

  async loadOffers() {
    this.offers.set({ state: 'loading' });
    try {
      const response = await this.api.searchOffers({ sort: 'discount' });
      this.offers.set({ state: 'ready', items: response.data.slice(0, featuredCount).map(toCardProduct) });
    } catch (caught) {
      this.offers.set({ state: 'error', message: caught instanceof Error ? caught.message : 'No se pudieron cargar las ofertas.' });
    }
  }
}
