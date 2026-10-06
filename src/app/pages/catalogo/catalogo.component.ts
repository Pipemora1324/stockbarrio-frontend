import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Product } from '../../models';

@Component({ selector: 'app-catalogo', standalone: true, imports: [CommonModule, FormsModule, RouterLink], template: `
<main class="catalogo"><section class="page-hero"><span class="eyebrow">Catálogo interactivo</span><h1>Ofertas cerca de ti</h1><p>Filtra por barrio, categoría o producto para encontrar el mejor valor.</p></section><section class="filters"><label> Barrio<input [(ngModel)]="barrio" (keyup)="applyFilters()" placeholder="Ej. Centro"></label><label> Categoría<input [(ngModel)]="category" (keyup)="applyFilters()" placeholder="Ej. Verduras"></label><label> Buscar<input [(ngModel)]="search" (keyup)="applyFilters()" placeholder="Nombre del producto"></label><button class="button" (click)="applyFilters()">Filtrar</button></section><section class="results"><div class="results-header"><h2>{{ products().length }} productos</h2><a routerLink="/chat">Crear combo con IA →</a></div><div class="cards-grid" *ngIf="products().length; else empty"><article class="card product-card" *ngFor="let product of products()"><div class="product-image">🥫</div><span class="badge">-{{ product.discountPercent }}%</span><h3>{{ product.name }}</h3><p>{{ product.storeName }} · {{ product.neighborhood }}</p><div class="price-row"><strong>{{ product.offerPrice | currency:'EUR' }}</strong><s>{{ product.price | currency:'EUR' }}</s></div><small>Stock {{ product.stock }} · Vence {{ product.expirationDate | date:'dd/MM/yyyy' }}</small></article></div><ng-template #empty><div class="empty">No encontramos productos con estos filtros.</div></ng-template></section></main>`, styleUrl: './catalogo.component.scss' })
export class CatalogoComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  barrio = signal(''); category = signal(''); search = signal(''); products = signal<Product[]>([]);
  ngOnInit() { this.route.queryParamMap.subscribe((params) => { this.barrio.set(params.get('barrio') ?? ''); this.applyFilters(); }); }
  async applyFilters() { this.products.set(await this.api.getProducts({ neighborhood: this.barrio(), category: this.category(), search: this.search() })); }
}
