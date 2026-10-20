import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { ApiService } from '../../api.service';
import { IconComponent } from '../../components/icon/icon.component';
import type { InventoryProduct, OfferStatus, OwnedStore } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';
import { ProductFormComponent } from './product-form.component';
import { StoresManagerComponent } from './stores-manager.component';
import { SuggestionsPanelComponent } from './suggestions-panel.component';

// What the panel says about each product today.
export type ProductState = OfferStatus | 'expired';
export const stateLabels: Record<ProductState, string> = {
  active: 'Oferta activa',
  scheduled: 'Oferta programada',
  ended: 'Oferta terminada',
  none: 'Sin oferta',
  expired: 'Vencido',
};
export const productState = (product: InventoryProduct): ProductState => (product.expired ? 'expired' : product.offerStatus);

@Component({
  selector: 'app-admin',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, RouterLink, CopCurrencyPipe, CalendarDatePipe, IconComponent, StoresManagerComponent, SuggestionsPanelComponent, ProductFormComponent],
  styleUrl: './admin.component.scss',
  template: `
<main class="page admin">
  <header class="admin-header">
    <div>
      <span class="eyebrow"><app-icon name="store" />Mi tienda</span>
      <h1>{{ current()?.name ?? 'Panel de tu tienda' }}</h1>
      <p class="muted">Hola, {{ auth.user()?.name }}. Aquí manejas tus locales, tu inventario y tus ofertas. <a routerLink="/perfil">Mi cuenta</a></p>
    </div>
  </header>

  @if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }

  @switch (state()) {
    @case ('loading') { <div class="skeleton panel-skeleton" aria-hidden="true"></div><p class="sr-only" role="status">Cargando tu panel…</p> }
    @case ('error') { <div class="state state-error" role="alert"><p>{{ loadError() }}</p><button class="button" type="button" (click)="load()"><app-icon name="refresh" />Reintentar</button></div> }
    @default {
      <app-stores-manager [stores]="stores()" [selectedId]="selectedId()" [max]="maxStores()" (selected)="select($event)" (changed)="onStoresChanged($event)" />

      @if (current(); as store) {
        <section class="stats" aria-label="Resumen del local">
          <article><span>Productos</span><strong>{{ products().length }}</strong></article>
          <article><span>Stock total</span><strong>{{ totalStock() }}</strong></article>
          <article><span>Ofertas activas</span><strong>{{ activeOffers() }}</strong></article>
        </section>

        <app-suggestions-panel [storeId]="store.id" (applied)="reloadProducts()" />

        <section class="card inventory" aria-labelledby="inventory-title">
          <div class="table-toolbar">
            <h2 id="inventory-title">Inventario de {{ store.name }}</h2>
            <div class="toolbar-actions">
              <label class="sr-only" for="inventory-search">Buscar producto</label>
              <input id="inventory-search" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Buscar producto">
              <button class="button" type="button" (click)="startCreate()"><app-icon name="plus" />Nuevo producto</button>
            </div>
          </div>
          @if (actionError()) { <p class="alert alert-error" role="alert">{{ actionError() }}</p> }
          @if (inventoryLoading()) {
            <p class="muted" role="status">Cargando el inventario…</p>
          } @else if (!products().length) {
            <div class="state">
              <h3>Este local todavía no tiene productos</h3>
              <p>Agrega el primero con su precio, stock y fecha de vencimiento. Si le pones descuento, eliges desde y hasta cuándo dura la oferta.</p>
              <div class="state-actions"><button class="button" type="button" (click)="startCreate()"><app-icon name="plus" />Agregar producto</button></div>
            </div>
          } @else if (!filteredProducts().length) {
            <p class="muted">Ningún producto coincide con «{{ search() }}».</p>
          } @else {
            <div class="table-wrap">
              <table class="data-table">
                <caption class="sr-only">Productos de {{ store.name }}</caption>
                <thead><tr><th scope="col">Producto</th><th scope="col">Precio</th><th scope="col">Oferta</th><th scope="col">Estado</th><th scope="col">Stock</th><th scope="col">Vence</th><th scope="col"><span class="sr-only">Acciones</span></th></tr></thead>
                <tbody>
                  @for (product of filteredProducts(); track product.id) {
                    <tr>
                      <td data-label="Producto"><strong>{{ product.name }}</strong><small>{{ product.category }}</small>@if (product.description) { <small class="description">{{ product.description }}</small> }</td>
                      <td class="nowrap" data-label="Precio">{{ product.price | cop }}@if (product.discountPercent > 0) { <small>{{ product.offerPrice | cop }} con descuento</small> }</td>
                      <td class="nowrap" data-label="Oferta">
                        @if (product.discountPercent > 0 && product.offerStartsOn) {
                          <strong>{{ product.discountPercent }} %</strong><small>{{ product.offerStartsOn | calendarDate }} al {{ product.offerEndsOn | calendarDate }}</small>
                        } @else { <span class="muted">—</span> }
                      </td>
                      <td data-label="Estado"><span [class]="'status status-' + stateOf(product)">{{ labels[stateOf(product)] }}</span></td>
                      <td class="nowrap" data-label="Stock">{{ product.stock }}</td>
                      <td class="nowrap" data-label="Vence">{{ product.expirationDate | calendarDate }}</td>
                      <td class="cell-actions">
                        <button class="button button-light button-small" type="button" (click)="edit(product)" [attr.aria-label]="'Editar ' + product.name"><app-icon name="edit" />Editar</button>
                        <button class="button button-danger button-small" type="button" [disabled]="removingId() === product.id" (click)="remove(product)" [attr.aria-label]="'Eliminar ' + product.name"><app-icon name="trash" />{{ removingId() === product.id ? 'Eliminando…' : 'Eliminar' }}</button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>

        @if (formOpen()) {
          @for (key of [formKey()]; track key) { <app-product-form [product]="editing()" [storeId]="store.id" (saved)="onSaved($event)" (cancelled)="closeForm()" /> }
        }
      }
    }
  }
</main>`,
})
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  protected readonly auth = inject(AuthService);
  protected readonly labels = stateLabels;
  readonly state = signal<'loading' | 'ready' | 'error'>('loading');
  readonly stores = signal<OwnedStore[]>([]);
  readonly maxStores = signal(10);
  readonly selectedId = signal<string | null>(null);
  readonly products = signal<InventoryProduct[]>([]);
  readonly inventoryLoading = signal(false);
  readonly search = signal('');
  readonly removingId = signal<string | null>(null);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly formKey = signal(0);
  readonly notice = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<InventoryProduct | null>(null);
  // Suggestions depend on the inventory, so they are refreshed after every product change.
  private readonly suggestionsPanel = viewChild(SuggestionsPanelComponent);
  readonly current = computed(() => this.stores().find((store) => store.id === this.selectedId()) ?? null);
  readonly filteredProducts = computed(() => {
    const term = this.search().trim().toLowerCase();
    return term ? this.products().filter((product) => `${product.name} ${product.category}`.toLowerCase().includes(term)) : this.products();
  });
  readonly totalStock = computed(() => this.products().reduce((sum, product) => sum + Number(product.stock), 0));
  readonly activeOffers = computed(() => this.products().filter((product) => product.offerStatus === 'active').length);

  ngOnInit() {
    void this.load(this.route.snapshot.queryParamMap.get('local'));
  }

  stateOf(product: InventoryProduct) {
    return productState(product);
  }

  // Loads the stores and the inventory of the chosen one (or of the first one).
  async load(preferredId: string | null = this.selectedId()) {
    this.state.set('loading');
    this.loadError.set('');
    try {
      const { stores, max } = await this.api.getMyStores();
      this.stores.set(stores);
      this.maxStores.set(max);
      this.state.set('ready');
      const chosen = stores.find((store) => store.id === preferredId) ?? stores[0] ?? null;
      if (chosen) await this.select(chosen.id);
      else this.selectedId.set(null);
    } catch (caught) {
      this.loadError.set(caught instanceof Error ? caught.message : 'No se pudo cargar tu panel.');
      this.state.set('error');
    }
  }

  async select(storeId: string) {
    if (storeId !== this.selectedId()) this.closeForm();
    this.selectedId.set(storeId);
    this.search.set('');
    void this.router.navigate([], { relativeTo: this.route, replaceUrl: true, queryParams: { local: storeId } });
    await this.reloadProducts(true);
  }

  async reloadProducts(showLoading = false) {
    const storeId = this.selectedId();
    if (!storeId) return;
    if (showLoading) this.inventoryLoading.set(true);
    this.actionError.set('');
    try {
      const inventory = await this.api.getMyInventory(storeId);
      if (storeId !== this.selectedId()) return;
      this.products.set(inventory.products);
    } catch (caught) {
      this.actionError.set(caught instanceof Error ? caught.message : 'No se pudo cargar el inventario.');
    } finally {
      this.inventoryLoading.set(false);
    }
  }

  async onStoresChanged(change: { message: string; selectId: string | null }) {
    this.notice.set(change.message);
    await this.load(change.selectId);
  }

  startCreate() {
    this.openForm(null);
  }

  edit(product: InventoryProduct) {
    this.openForm(product);
  }

  closeForm() {
    this.formOpen.set(false);
    this.editing.set(null);
  }

  async onSaved(message: string) {
    this.notice.set(message);
    this.closeForm();
    await this.reloadProducts();
    void this.suggestionsPanel()?.load();
  }

  // A new key recreates the form, so switching from one product to another never keeps old values.
  private openForm(product: InventoryProduct | null) {
    this.notice.set('');
    this.editing.set(product);
    this.formKey.update((key) => key + 1);
    this.formOpen.set(true);
  }

  async remove(product: InventoryProduct) {
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
