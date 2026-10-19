import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiError, ApiService, type ProductInput } from '../../api.service';
import type { Product, Store } from '../../models';
import { CalendarDatePipe } from '../../pipes/calendar-date.pipe';
import { CopCurrencyPipe } from '../../pipes/cop-currency.pipe';

const emptyForm = (): ProductInput => ({ name: '', category: 'Alimentación', description: '', price: 0, stock: 0, expirationDate: '', discountPercent: 0 });

@Component({ selector: 'app-admin', standalone: true, imports: [FormsModule, CopCurrencyPipe, CalendarDatePipe], template: `
<main class="admin"><header><div><span class="eyebrow">Panel privado</span><h1>{{ store()?.name ?? 'Inventario de tu tienda' }}</h1>@if (store(); as current) { <p class="store-meta">{{ current.neighborhood }} · {{ current.address }}</p> }</div>@if (state() === 'ready') { <button class="button" type="button" (click)="startCreate()">+ Nuevo producto</button> }</header>
@if (notice()) { <p class="alert alert-success" role="status">{{ notice() }}</p> }
@switch (state()) {
@case ('loading') { <section class="table-card"><p class="muted" role="status">Cargando el inventario…</p></section> }
@case ('no-store') { <section class="table-card"><h2>Tu cuenta no tiene una tienda asociada</h2><p class="muted">Para gestionar inventario necesitas una cuenta de tienda. Si crees que es un error, cierra sesión y vuelve a entrar, o registra tu tienda.</p></section> }
@case ('error') { <section class="table-card"><p class="alert alert-error" role="alert">{{ loadError() }}</p><button class="button" type="button" (click)="load()">Reintentar</button></section> }
@case ('ready') {
<section class="stats"><article><span>Productos</span><strong>{{ products().length }}</strong></article><article><span>Stock total</span><strong>{{ totalStock() }}</strong></article><article><span>Ofertas</span><strong>{{ discountCount() }}</strong></article></section>
@if (actionError()) { <p class="alert alert-error" role="alert">{{ actionError() }}</p> }
<section class="table-card"><div class="table-toolbar"><h2>Productos</h2><label class="sr-only" for="inventory-search">Buscar producto</label><input id="inventory-search" type="search" [ngModel]="search()" (ngModelChange)="search.set($event)" placeholder="Buscar producto"></div>
@if (!products().length) { <p class="muted">Todavía no tienes productos. Crea el primero con «Nuevo producto».</p> } @else if (!filteredProducts().length) { <p class="muted">Ningún producto coincide con «{{ search() }}».</p> } @else {
<div class="table-wrap"><table><thead><tr><th scope="col">Producto</th><th scope="col">Precio</th><th scope="col">Stock</th><th scope="col">Vencimiento</th><th scope="col">Oferta</th><th scope="col">Acciones</th></tr></thead><tbody>@for (product of filteredProducts(); track product.id) { <tr><td><strong>{{ product.name }}</strong><small>{{ product.category }}</small></td><td>{{ product.price | cop }}@if (product.discountPercent > 0) { <small>{{ product.offerPrice | cop }} con descuento</small> }</td><td>{{ product.stock }}</td><td>{{ product.expirationDate | calendarDate }}</td><td>{{ product.discountPercent }}%</td><td><button type="button" (click)="edit(product)">Editar</button><button type="button" class="danger" [disabled]="removingId() === product.id" (click)="remove(product)">{{ removingId() === product.id ? 'Eliminando…' : 'Eliminar' }}</button></td></tr> }</tbody></table></div> }
</section>
@if (formOpen()) { <section class="form-card"><h2>{{ editing() ? 'Editar producto' : 'Nuevo producto' }}</h2><form #productForm="ngForm" (ngSubmit)="save()"><label>Nombre<input name="name" [(ngModel)]="form.name" required minlength="2" maxlength="120"></label><label>Categoría<input name="category" [(ngModel)]="form.category" required minlength="2" maxlength="80"></label><label>Precio (COP)<input name="price" [(ngModel)]="form.price" type="number" min="1" step="1" required></label><label>Stock<input name="stock" [(ngModel)]="form.stock" type="number" min="0" step="1" required></label><label>Vencimiento<input name="expirationDate" [(ngModel)]="form.expirationDate" type="date" required></label><label>Descuento %<input name="discountPercent" [(ngModel)]="form.discountPercent" type="number" min="0" max="100" required></label><label class="full">Descripción<textarea name="description" [(ngModel)]="form.description" maxlength="500"></textarea></label>@if (formError()) { <p class="alert alert-error full" role="alert">{{ formError() }}</p> }<div class="form-actions"><button type="button" class="button button-light" (click)="closeForm()">Cancelar</button><button class="button" type="submit" [disabled]="saving() || productForm.invalid">{{ saving() ? 'Guardando…' : 'Guardar' }}</button></div></form></section> }
}
}
</main>`, styleUrl: './admin.component.scss' })
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  readonly state = signal<'loading' | 'ready' | 'no-store' | 'error'>('loading');
  readonly products = signal<Product[]>([]);
  readonly store = signal<Store | null>(null);
  readonly search = signal('');
  readonly saving = signal(false);
  readonly removingId = signal<string | null>(null);
  readonly loadError = signal('');
  readonly actionError = signal('');
  readonly formError = signal('');
  readonly notice = signal('');
  readonly formOpen = signal(false);
  readonly editing = signal<Product | null>(null);
  form: ProductInput = emptyForm();
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

  startCreate() {
    this.editing.set(null);
    this.form = emptyForm();
    this.formError.set('');
    this.formOpen.set(true);
  }

  edit(product: Product) {
    this.editing.set(product);
    this.form = { name: product.name, category: product.category, description: product.description, price: Number(product.price), stock: Number(product.stock), expirationDate: product.expirationDate.slice(0, 10), discountPercent: Number(product.discountPercent) };
    this.formError.set('');
    this.formOpen.set(true);
  }

  closeForm() {
    this.formOpen.set(false);
    this.editing.set(null);
    this.form = emptyForm();
    this.formError.set('');
  }

  async save() {
    this.saving.set(true);
    this.formError.set('');
    this.notice.set('');
    try {
      const payload = { ...this.form, price: Number(this.form.price), stock: Number(this.form.stock), discountPercent: Number(this.form.discountPercent) };
      const current = this.editing();
      if (current) await this.api.updateProduct(current.id, payload);
      else await this.api.saveProduct(payload);
      this.notice.set(current ? 'El producto se actualizó correctamente.' : 'El producto se creó correctamente.');
      this.closeForm();
      await this.load();
    } catch (caught) {
      this.formError.set(caught instanceof Error ? caught.message : 'No se pudo guardar el producto.');
    } finally {
      this.saving.set(false);
    }
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
    } catch (caught) {
      this.actionError.set(caught instanceof Error ? caught.message : 'No se pudo eliminar el producto.');
    } finally {
      this.removingId.set(null);
    }
  }
}
