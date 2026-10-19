import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ApiError, ApiService } from '../../api.service';
import type { Product, Store } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { StoreLocationComponent } from './store-location.component';
import { ProductFormComponent } from './product-form.component';
import { SuggestionsPanelComponent } from './suggestions-panel.component';


@Component({ selector: 'app-admin', changeDetection: ChangeDetectionStrategy.OnPush, imports: [FormsModule, RouterLink, CopCurrencyPipe, CalendarDatePipe, SuggestionsPanelComponent, StoreLocationComponent, ProductFormComponent], template: `
<main class="admin"><header><div><span class="eyebrow">Panel privado</span><h1>{{ store()?.name ?? 'Inventario de tu tienda' }}</h1>@if (store(); as current) { <p class="store-meta">{{ current.neighborhood }} · {{ current.address }}</p> }</div>@if (state() === 'ready') { <button class="button" type="button" (click)="startCreate()">+ Nuevo producto</button> }</header>
@if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }
@switch (state()) {
@case ('loading') { <section class="table-card"><p class="muted" role="status">Cargando el inventario…</p></section> }
@case ('no-store') { <section class="table-card"><h2>Tu cuenta no tiene una tienda asociada</h2><p class="muted">Para gestionar inventario necesitas una cuenta de tienda. Si crees que es un error, cierra sesión y vuelve a entrar, o registra tu tienda.</p><div class="state-actions"><a class="button" routerLink="/register" [queryParams]="{ tipo: 'tienda' }">Registrar una tienda</a><button class="button button-light" type="button" (click)="auth.logout()">Cerrar sesión</button></div></section> }
@case ('error') { <section class="table-card"><p class="alert alert-error" role="alert">{{ loadError() }}</p><button class="button" type="button" (click)="load()">Reintentar</button></section> }
@case ('ready') {
<section class="stats"><article><span>Productos</span><strong>{{ products().length }}</strong></article><article><span>Stock total</span><strong>{{ totalStock() }}</strong></article><article><span>Ofertas</span><strong>{{ discountCount() }}</strong></article></section>
<app-suggestions-panel (applied)="reloadProducts()" />
@if (actionError()) { <p class="alert alert-error" role="alert">{{ actionError() }}</p> }
<section class="table-card"><div class="table-toolbar"><h2>Productos</h2><label class="sr-only" for="inventory-search">Buscar producto</label><input id="inventory-search" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Buscar producto"></div>
@if (!products().length) { <p class="muted">Todavía no tienes productos. Crea el primero con «Nuevo producto».</p> } @else if (!filteredProducts().length) { <p class="muted">Ningún producto coincide con «{{ search() }}».</p> } @else {
<div class="table-wrap"><table><thead><tr><th scope="col">Producto</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Vencimiento</th><th scope="col">Oferta</th><th scope="col">Acciones</th></tr></thead><tbody>@for (product of filteredProducts(); track product.id) { <tr><td data-label="Producto"><strong>{{ product.name }}</strong><small>{{ product.category }}</small></td><td data-label="Precio">{{ product.price | cop }}@if (product.discountPercent > 0) { <small>{{ product.offerPrice | cop }} con descuento</small> }</td><td data-label="Stock">{{ product.stock }}</td><td data-label="Vence">{{ product.expirationDate | calendarDate }}</td><td data-label="Oferta">{{ product.discountPercent }}%</td><td class="actions"><button type="button" (click)="edit(product)" [attr.aria-label]="'Editar ' + product.name">Editar</button><button type="button" class="danger" [disabled]="removingId() === product.id" (click)="remove(product)" [attr.aria-label]="'Eliminar ' + product.name">{{ removingId() === product.id ? 'Eliminando…' : 'Eliminar' }}</button></td></tr> }</tbody></table></div> }
</section>
<app-store-location [store]="store()" (saved)="store.set($event)" />
@if (formOpen()) { @for (key of [formKey()]; track key) { <app-product-form [product]="editing()" (saved)="onSaved($event)" (cancelled)="closeForm()" /> } }
}
}
</main>`, styleUrl: './admin.component.scss' })
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  protected readonly auth = inject(AuthService);
  readonly state = signal<'loading' | 'ready' | 'no-store' | 'error'>('loading');
  readonly products = signal<Product[]>([]);
  readonly store = signal<Store | null>(null);
  readonly search = signal('');
  readonly removingId = signal<string | null>(null);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly formKey = signal(0);
  readonly notice = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<Product | null>(null);
  // Suggestions depend on the inventory, so they are refreshed after every product change.
  private readonly suggestionsPanel = viewChild(SuggestionsPanelComponent);
  readonly filteredProducts = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.products().filter((product) => product.name.toLowerCase().includes(term)) : this.products();
  });
  readonly totalStock = computed(() => this.products().reduce((sum, product) => sum + Number(product.stock), 0));
  readonly discountCount = computed(() => this.products().filter((product) => product.discountPercent > 0).length);

  ngOnInit() {
    void this.load();
  }

  async load() {
    this.state.set('loading');
    this.loadError.set('');
    try {
      const inventory = await this.api.getMyInventory();
      this.products.set(inventory.products);
      this.store.set(inventory.store);
      this.state.set('ready');
    } catch (caught) {
      if (caught instanceof ApiError && caught.status === 403) {
        this.state.set('no-store');
        return;
      }
      this.loadError.set(caught instanceof Error ? caught.message : 'No se pudo cargar el inventario.');
      this.state.set('error');
    }
  }

  // Refreshes the table after a discount is applied without hiding the panel.
  async reloadProducts() {
    try {
      this.products.set((await this.api.getMyInventory()).products);
    } catch (caught) {
      this.actionError.set(caught instanceof Error ? caught.message : 'No se pudo actualizar el inventario.');
    }
  }

  startCreate() {
    this.openForm(null);
  }

  edit(product: Product) {
    this.openForm(product);
  }

  closeForm() {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  async onSaved(message: string) {
    this.notice.set(message);
    this.closeForm();
    await this.load();
    void this.suggestionsPanel()?.load();
  }

  // A new key recreates the form, so switching from one product to another never keeps old values.
  private openForm(product: Product | null) {
    this.notice.set('');
    this.editing.set(product);
    this.formKey.update((key) => key + 1);
    this.formOpen.set(true);
  }

  async remove(product: Product) {
    if (!window.confirm(`¿Quieres eliminar «${product.name}»?`)) return;
    this.removingId.set(product.id);
    this.actionError.set('');
    this.notice.set('');
    try {
      await this.api.deleteProduct(product.id);
      this.products.update((items) => items.filter((item) => item.id !== product.id));
      if (this.editing()?.id === product.id) this.closeForm();
      this.notice.set('El producto se eliminó correctamente.');
      void this.suggestionsPanel()?.load();
    } catch (caught) {
      this.actionError.set(caught instanceof Error ? caught.message : 'No se pudo eliminar el producto.');
    } finally {
      this.removingId.set(null);
    }
  }
}
