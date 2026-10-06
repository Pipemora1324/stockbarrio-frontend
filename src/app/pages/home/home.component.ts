import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import type { Product, Store } from '../../models';

@Component({ selector: 'app-home', standalone: true, imports: [CommonModule, RouterLink], template: `
<main class="home">
  <section class="hero"><div class="hero-copy"><span class="eyebrow">Menos desperdicio, más barrio</span><h1>Compra inteligente.<br><em>Recicla con conciencia.</em></h1><p>Descubre tiendas cercanas, ofertas por vencimiento y combos sugeridos por inteligencia artificial.</p><div class="hero-actions"><a class="button" routerLink="/catalogo">Explorar ofertas</a><a class="button button-light" routerLink="/chat">Hablar con IA</a></div></div><div class="hero-visual"><div class="visual-card"><span>Ofertas hoy</span><strong>{{ products().length }}</strong><small>productos disponibles</small></div><div class="mini-card"><span>🌱</span><p><strong>Menos desperdicio</strong><br>Solo productos próximos a vencer</p></div></div></section>
  <section class="section"><div class="section-heading"><div><span class="eyebrow">Cercanas a ti</span><h2>Tiendas del barrio</h2></div><a routerLink="/catalogo">Ver todo →</a></div><div class="cards-grid"><article class="card" *ngFor="let store of stores()"><div class="store-icon">⌂</div><h3>{{ store.name }}</h3><p>{{ store.neighborhood }} · {{ store.address }}</p><a class="text-link" [routerLink]="['/catalogo']" [queryParams]="{ barrio: store.neighborhood }">Ver productos →</a></article></div></section>
  <section class="section section-green"><div class="section-heading"><div><span class="eyebrow">Ofertas relámpago</span><h2>Productos que vuelven a ahorrar</h2></div></div><div class="cards-grid product-grid"><article class="card product-card" *ngFor="let product of products() | slice:0:4"><div class="product-image">🥫</div><span class="badge">-{{ product.discountPercent }}%</span><h3>{{ product.name }}</h3><p>{{ product.storeName }} · {{ product.neighborhood }}</p><div class="price-row"><strong>{{ product.offerPrice | currency:'EUR' }}</strong><s>{{ product.price | currency:'EUR' }}</s></div><small>Vence {{ product.expirationDate | date:'dd/MM/yyyy' }}</small></article></div></section>
</main>`, styleUrl: './home.component.scss' })
export class HomeComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly stores = signal<Store[]>([]);
  readonly products = signal<Product[]>([]);
  ngOnInit() { void this.load(); }
  private async load() { try { this.stores.set(await this.api.getStores()); this.products.set(await this.api.getProducts()); } catch { this.products.set([]); } }
}
