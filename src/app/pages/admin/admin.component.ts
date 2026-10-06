import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import type { Product } from '../../models';

@Component({ selector: 'app-admin', standalone: true, imports: [CommonModule, FormsModule], template: `
<main class="admin"><header><div><span class="eyebrow">Panel privado</span><h1>Inventario de tu tienda</h1></div><button class="button" (click)="resetForm()">+ Nuevo producto</button></header><section class="stats"><article><span>Productos</span><strong>{{ products().length }}</strong></article><article><span>Stock total</span><strong>{{ totalStock() }}</strong></article><article><span>Ofertas</span><strong>{{ discountCount() }}</strong></article></section><section class="table-card"><div class="table-toolbar"><h2>Productos</h2><input [(ngModel)]="search" (keyup)="filter()" placeholder="Buscar producto"></div><div class="table-wrap"><table><thead><tr><th>Producto</th><th>Precio</th><th>Stock</th><th>Vencimiento</th><th>Oferta</th><th>Acciones</th></tr></thead><tbody><tr *ngFor="let product of filteredProducts()"><td><strong>{{ product.name }}</strong><small>{{ product.category }}</small></td><td>{{ product.price | currency:'EUR' }}</td><td>{{ product.stock }}</td><td>{{ product.expirationDate | date:'dd/MM/yyyy' }}</td><td>{{ product.discountPercent }}%</td><td><button (click)="edit(product)">Editar</button><button class="danger" (click)="remove(product.id)">Eliminar</button></td></tr></tbody></table></div></section><section class="form-card" *ngIf="editing() || creating()"><h2>{{ editing() ? 'Editar producto' : 'Nuevo producto' }}</h2><form (submit)="save()"><label>Nombre<input [(ngModel)]="form.name" required></label><label>Categoría<input [(ngModel)]="form.category" required></label><label>Precio<input [(ngModel)]="form.price" type="number" min="0" required></label><label>Stock<input [(ngModel)]="form.stock" type="number" min="0" required></label><label>Vencimiento<input [(ngModel)]="form.expirationDate" type="date" required></label><label>Descuento %<input [(ngModel)]="form.discountPercent" type="number" min="0" max="100" required></label><label>Descripción<textarea [(ngModel)]="form.description"></textarea></label><div class="form-actions"><button type="button" class="button button-light" (click)="resetForm()">Cancelar</button><button class="button" type="submit" [disabled]="saving()">Guardar</button></div></form></section></main>`, styleUrl: './admin.component.scss' })
export class AdminComponent implements OnInit {
  private readonly api = inject(ApiService);
  products = signal<Product[]>([]);
  search = signal('');
  saving = signal(false);
  error = signal('');
  creating = signal(false);
  editing = signal<Product | null>(null);
  form = { name: '', category: 'Alimentación', description: '', price: 0, stock: 0, expirationDate: '', discountPercent: 0 };
  filteredProducts = signal<Product[]>([]);
  totalStock = signal(0);
  discountCount = signal(0);
  ngOnInit() { void this.load(); }
  async load() {
    const user = JSON.parse(localStorage.getItem('stockbarrios-user') ?? '{}') as { storeId?: string };
    this.products.set(await this.api.getStoreProducts(user.storeId ?? ''));
    this.updateStats();
  }
  updateStats() { this.totalStock.set(this.products().reduce((sum, product) => sum + product.stock, 0)); this.discountCount.set(this.products().filter((product) => product.discountPercent > 0).length); this.filteredProducts.set(this.products()); }
  filter() { this.filteredProducts.set(this.products().filter((product) => product.name.toLowerCase().includes(this.search().toLowerCase()))); }
  edit(product: Product) { this.editing.set(product); this.creating.set(false); this.form = { name: product.name, category: product.category, description: product.description, price: Number(product.price), stock: Number(product.stock), expirationDate: product.expirationDate.slice(0, 10), discountPercent: Number(product.discountPercent) }; }
  resetForm() { this.editing.set(null); this.creating.set(true); this.form = { name: '', category: 'Alimentación', description: '', price: 0, stock: 0, expirationDate: '', discountPercent: 0 }; }
  async save() { this.saving.set(true); this.error.set(''); try { const payload = { ...this.form, expirationDate: new Date(this.form.expirationDate).toISOString() }; if (this.editing()) await this.api.updateProduct(this.editing()!.id, payload); else await this.api.saveProduct(payload); this.resetForm(); await this.load(); } catch (caught) { this.error.set(caught instanceof Error ? caught.message : 'No se pudo guardar el producto.'); } finally { this.saving.set(false); } }
  async remove(id: string) { if (!window.confirm('¿Quieres eliminar este producto?')) return; await this.api.deleteProduct(id); await this.load(); }
}
