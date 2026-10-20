import { afterNextRender, ChangeDetectionStrategy, Component, inject, Injector, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { CategoryFilterComponent } from '../../components/category-filter/category-filter.component';
import { IconComponent } from '../../components/icon/icon.component';
import { IllustrationComponent } from '../../components/illustration/illustration.component';
import { ProductCardComponent } from '../../components/product-card/product-card.component';
import { RevealDirective } from '../../components/reveal.directive';
import type { CatalogGroup } from '../../models';

// Every product of the stores, grouped by store, with one filter: the category. Offers show their discounted price.
@Component({
  selector: 'app-catalog',
  imports: [RouterLink, ProductCardComponent, CategoryFilterComponent, IconComponent, IllustrationComponent, RevealDirective],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './catalog.component.scss',
  template: `
<main class="page catalog">
  <header class="page-header">
    <span class="eyebrow"><app-icon name="catalog" />Catálogo</span>
    <h1>Todo lo que hay en las tiendas</h1>
    <p>Todos los productos de cada local. Los que están en oferta muestran el precio con descuento; si solo quieres ver descuentos, entra a <a routerLink="/ofertas">Ofertas</a>.</p>
  </header>

  <app-category-filter label="Filtrar el catálogo por categoría" [categories]="categories()" [value]="category()" (valueChange)="choose($event)" />

  <section aria-labelledby="catalog-count">
    <h2 id="catalog-count" class="results-title" aria-live="polite">
      @if (loading()) { Buscando productos… } @else if (!error()) { {{ total() }} {{ total() === 1 ? 'producto' : 'productos' }} en {{ groups().length }} {{ groups().length === 1 ? 'local' : 'locales' }} }
    </h2>
    @if (error()) {
      <div class="state state-error" role="alert"><p>{{ error() }}</p><button class="button" type="button" (click)="load()"><app-icon name="refresh" />Reintentar</button></div>
    } @else if (loading()) {
      <div class="skeleton group-skeleton" aria-hidden="true"></div>
    } @else if (!groups().length) {
      <div class="state">
        <app-illustration class="state-art" name="empty-basket" />
        @if (category()) {
          <h3>No hay productos de {{ category() }}</h3>
          <p>Prueba con otra categoría o mira todo el catálogo.</p>
          <div class="state-actions"><button class="button" type="button" (click)="choose('')">Ver todo el catálogo</button></div>
        } @else {
          <h3>El catálogo está vacío por ahora</h3>
          <p>Todavía no hay productos publicados. Cuando las tiendas los agreguen aparecerán aquí; mientras tanto, registra tu tienda.</p>
          <div class="state-actions"><a class="button" routerLink="/ofertas"><app-icon name="tag" />Ver ofertas</a><a class="button button-light" routerLink="/register" [queryParams]="{ tipo: 'tienda' }"><app-icon name="store" />Registrar mi tienda</a></div>
        }
      </div>
    } @else {
      @for (group of groups(); track group.store.id) {
        <section class="store-group" [id]="'local-' + group.store.id" [attr.aria-labelledby]="'local-title-' + group.store.id" appReveal>
          <header class="store-header">
            <span class="store-sign" aria-hidden="true"><app-icon name="store" /></span>
            <div>
              <h3 [id]="'local-title-' + group.store.id">{{ group.store.name }}</h3>
              <p class="muted"><app-icon name="pin" />{{ group.store.neighborhood }} · {{ group.store.address }}</p>
            </div>
            <span class="count">{{ group.products.length }} {{ group.products.length === 1 ? 'producto' : 'productos' }}</span>
          </header>
          <ul class="cards-grid">
            @for (product of group.products; track product.id) { <li><app-product-card [product]="product" [showStore]="false" [offerTag]="true" /></li> }
          </ul>
        </section>
      }
    }
  </section>
</main>`,
})
export class CatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly injector = inject(Injector);
  readonly categories = signal<string[]>([]);
  readonly category = signal('');
  readonly groups = signal<CatalogGroup[]>([]);
  readonly total = signal(0);
  readonly loading = signal(true);
  readonly error = signal('');
  private requestId = 0;

  ngOnInit() {
    this.category.set(this.route.snapshot.queryParamMap.get('categoria') ?? '');
    this.api.getCategories().then((items) => this.categories.set(items), () => this.categories.set([]));
    void this.load();
  }

  choose(category: string) {
    this.category.set(category);
    void this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { categoria: category || null } });
    void this.load();
  }

  async load() {
    const id = ++this.requestId;
    this.loading.set(true);
    this.error.set('');
    try {
      const response = await this.api.getCatalog(this.category() || undefined);
      if (id !== this.requestId) return;
      this.groups.set(response.groups);
      this.total.set(response.total);
      this.scrollToStore();
    } catch (caught) {
      if (id !== this.requestId) return;
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo cargar el catálogo.');
    } finally {
      if (id === this.requestId) this.loading.set(false);
    }
  }

  // Links from the home page point to one store (#local-<id>); the groups arrive after the navigation.
  private scrollToStore() {
    const fragment = this.route.snapshot.fragment;
    if (!fragment) return;
    afterNextRender(() => document.getElementById(fragment)?.scrollIntoView?.({ behavior: 'smooth', block: 'start' }), { injector: this.injector });
  }
}
