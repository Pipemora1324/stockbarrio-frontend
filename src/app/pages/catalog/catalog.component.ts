import { ChangeDetectionStrategy, Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { catchError, debounceTime, from, map, merge, of, Subject, switchMap, tap } from 'rxjs';
import { ApiService } from '../../api.service';
import type { Product } from '../../models';
import { ProductCardComponent } from '../../components/product-card/product-card.component';

type FilterName = 'neighborhood' | 'category' | 'search';

const searchDebounceMs = 350;

@Component({ selector: 'app-catalog', imports: [FormsModule, RouterLink, ProductCardComponent], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<main class="catalog"><section class="page-hero"><span class="eyebrow">Catálogo interactivo</span><h1>Ofertas cerca de ti</h1><p>Filtra por barrio, categoría o producto para encontrar el mejor valor.</p></section><form class="filters" role="search" (ngSubmit)="searchNow()"><label for="filter-neighborhood">Barrio<input id="filter-neighborhood" name="neighborhood" [ngModel]="neighborhood()" (ngModelChange)="updateFilter('neighborhood', $event)" placeholder="Ej. Chapinero"></label><label for="filter-category">Categoría<input id="filter-category" name="category" [ngModel]="category()" (ngModelChange)="updateFilter('category', $event)" placeholder="Ej. Lácteos"></label><label for="filter-search">Buscar<input id="filter-search" name="search" type="search" [ngModel]="search()" (ngModelChange)="updateFilter('search', $event)" placeholder="Nombre del producto"></label><button class="button" type="submit">Filtrar</button></form><section class="results" aria-live="polite"><div class="results-header"><h2>@if (loading()) { Buscando… } @else { {{ products().length }} {{ products().length === 1 ? 'producto' : 'productos' }} }</h2><a routerLink="/chat">Crear combo con IA →</a></div>@if (error()) { <div class="empty error" role="alert">{{ error() }} <button class="button" type="button" (click)="searchNow()">Reintentar</button></div> } @else if (!loading() && !products().length) { <div class="empty">No encontramos productos con estos filtros.</div> } @else { <ul class="cards-grid">@for (product of products(); track product.id) { <li><app-product-card [product]="product" /></li> }</ul> }</section></main>`, styleUrl: './catalog.component.scss' })
export class CatalogComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);
  private readonly typed$ = new Subject<void>();
  private readonly immediate$ = new Subject<void>();
  readonly neighborhood = signal('');
  readonly category = signal('');
  readonly search = signal('');
  readonly products = signal<Product[]>([]);
  readonly loading = signal(false);
  readonly error = signal('');

  ngOnInit() {
    merge(this.typed$.pipe(debounceTime(searchDebounceMs)), this.immediate$)
      .pipe(
        tap(() => {
          this.loading.set(true);
          this.error.set('');
        }),
        // switchMap drops responses from older searches so results never arrive out of order.
        switchMap(() =>
          from(this.api.getProducts({ neighborhood: this.neighborhood(), category: this.category(), search: this.search() })).pipe(
            map((products) => ({ products, error: '' })),
            catchError((caught: unknown) => of({ products: [] as Product[], error: caught instanceof Error ? caught.message : 'No se pudieron cargar los productos.' })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ products, error }) => {
        this.products.set(products);
        this.error.set(error);
        this.loading.set(false);
      });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.neighborhood.set(params.get('barrio') ?? '');
      this.searchNow();
    });
  }

  updateFilter(filter: FilterName, value: string) {
    this[filter].set(value ?? '');
    this.typed$.next();
  }

  searchNow() {
    this.immediate$.next();
  }
}
