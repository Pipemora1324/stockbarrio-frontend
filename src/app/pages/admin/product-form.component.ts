import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, type ProductInput } from '../../api.service';
import { todayInBogota } from '../../dates';
import type { Product } from '../../models';
import * as rules from '../../validation/rules';

type Field = keyof ProductInput;

const emptyProduct = (): ProductInput => ({ name: '', category: '', description: '', price: 0, stock: 0, expirationDate: '', discountPercent: 0 });

@Component({
  selector: 'app-product-form',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-form.component.scss',
  template: `
<section class="form-card" aria-labelledby="product-form-title">
  <h2 id="product-form-title">{{ product() ? 'Editar producto' : 'Nuevo producto' }}</h2>
  <form (ngSubmit)="save()" novalidate>
    <div class="field">
      <label for="product-name">Nombre</label>
      <input id="product-name" name="name" maxlength="80" [ngModel]="values().name" (ngModelChange)="set('name', $event)" (blur)="touch('name')" [attr.aria-invalid]="show('name') ? true : null" aria-describedby="product-name-error">
      @if (show('name')) { <small class="field-error" id="product-name-error">{{ errors().name }}</small> }
    </div>
    <div class="field">
      <label for="product-category">Categoría</label>
      <select id="product-category" name="category" [ngModel]="values().category" (ngModelChange)="set('category', $event)" (blur)="touch('category')" [attr.aria-invalid]="show('category') ? true : null" aria-describedby="product-category-error">
        <option value="" disabled>Elige una categoría</option>
        @for (category of categories(); track category) { <option [value]="category">{{ category }}</option> }
      </select>
      @if (show('category')) { <small class="field-error" id="product-category-error">{{ errors().category }}</small> }
    </div>
    <div class="field">
      <label for="product-price">Precio (COP)</label>
      <input id="product-price" name="price" type="number" inputmode="numeric" min="1" [max]="maxPrice" step="50" [ngModel]="values().price" (ngModelChange)="set('price', $event)" (blur)="touch('price')" [attr.aria-invalid]="show('price') ? true : null" aria-describedby="product-price-error">
      @if (show('price')) { <small class="field-error" id="product-price-error">{{ errors().price }}</small> }
    </div>
    <div class="field">
      <label for="product-stock">Stock (unidades)</label>
      <input id="product-stock" name="stock" type="number" inputmode="numeric" min="0" [max]="maxStock" step="1" [ngModel]="values().stock" (ngModelChange)="set('stock', $event)" (blur)="touch('stock')" [attr.aria-invalid]="show('stock') ? true : null" aria-describedby="product-stock-error">
      @if (show('stock')) { <small class="field-error" id="product-stock-error">{{ errors().stock }}</small> }
    </div>
    <div class="field">
      <label for="product-expiration">Vencimiento</label>
      <input id="product-expiration" name="expirationDate" type="date" [min]="product() ? null : today" [ngModel]="values().expirationDate" (ngModelChange)="set('expirationDate', $event)" (blur)="touch('expirationDate')" [attr.aria-invalid]="show('expirationDate') ? true : null" aria-describedby="product-expiration-error">
      @if (show('expirationDate')) { <small class="field-error" id="product-expiration-error">{{ errors().expirationDate }}</small> }
    </div>
    <div class="field">
      <label for="product-discount">Descuento (%)</label>
      <input id="product-discount" name="discountPercent" type="number" inputmode="numeric" min="0" [max]="maxDiscount" step="5" [ngModel]="values().discountPercent" (ngModelChange)="set('discountPercent', $event)" (blur)="touch('discountPercent')" [attr.aria-invalid]="show('discountPercent') ? true : null" aria-describedby="product-discount-error">
      @if (show('discountPercent')) { <small class="field-error" id="product-discount-error">{{ errors().discountPercent }}</small> }
    </div>
    <div class="field full">
      <label for="product-description">Descripción (opcional)</label>
      <textarea id="product-description" name="description" maxlength="500" rows="3" [ngModel]="values().description" (ngModelChange)="set('description', $event)"></textarea>
    </div>
    @if (error()) { <p class="alert alert-error full" role="alert">{{ error() }}</p> }
    <div class="form-actions">
      <button type="button" class="button button-light" (click)="cancelled.emit()">Cancelar</button>
      <button class="button" type="submit" [disabled]="saving() || invalid()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
    </div>
  </form>
</section>`,
})
export class ProductFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly product = input<Product | null>(null);
  readonly saved = output<string>();
  readonly cancelled = output<void>();
  protected readonly maxPrice = rules.maxPrice;
  protected readonly maxStock = rules.maxStock;
  protected readonly maxDiscount = rules.maxDiscount;
  protected readonly today = todayInBogota();
  readonly values = signal<ProductInput>(emptyProduct());
  private readonly touched = signal<ReadonlySet<Field>>(new Set());
  readonly saving = signal(false);
  readonly error = signal('');

  // A product saved before the list existed keeps its old category as a valid option.
  readonly categories = computed<readonly string[]>(() => {
    const current = this.product()?.category;
    return current && !rules.productCategories.includes(current as never) ? [...rules.productCategories, current] : rules.productCategories;
  });

  readonly errors = computed<Record<Field, string>>(() => {
    const value = this.values();
    return {
      name: rules.productName(value.name),
      category: rules.category(value.category, this.categories()),
      price: rules.price(value.price),
      stock: rules.stock(value.stock),
      expirationDate: rules.expirationDate(value.expirationDate, !this.product()),
      discountPercent: rules.discount(value.discountPercent),
      description: value.description.length > 500 ? 'La descripción debe tener como máximo 500 caracteres.' : '',
    };
  });
  readonly invalid = computed(() => rules.hasErrors(this.errors()));

  constructor() {
    // On small screens the form opens below the table: bring it into view and focus the first field.
    afterNextRender(() => {
      this.host.nativeElement.scrollIntoView?.({ behavior: 'smooth', block: 'start' });
      this.host.nativeElement.querySelector<HTMLInputElement>('#product-name')?.focus({ preventScroll: true });
    });
  }

  ngOnInit() {
    const product = this.product();
    if (product) {
      this.values.set({ name: product.name, category: product.category, description: product.description, price: Number(product.price), stock: Number(product.stock), expirationDate: product.expirationDate.slice(0, 10), discountPercent: Number(product.discountPercent) });
    }
  }

  set<K extends Field>(field: K, value: ProductInput[K]) {
    this.values.update((current) => ({ ...current, [field]: value }));
  }

  touch(field: Field) {
    this.touched.update((current) => new Set(current).add(field));
  }

  show(field: Field) {
    return this.touched().has(field) && Boolean(this.errors()[field]);
  }

  async save() {
    if (this.invalid()) {
      this.touched.set(new Set(Object.keys(this.errors()) as Field[]));
      return;
    }
    this.saving.set(true);
    this.error.set('');
    const value = this.values();
    const payload: ProductInput = { ...value, name: value.name.trim(), description: value.description.trim(), price: Number(value.price), stock: Number(value.stock), discountPercent: Number(value.discountPercent) };
    try {
      const current = this.product();
      if (current) await this.api.updateProduct(current.id, payload);
      else await this.api.saveProduct(payload);
      this.saved.emit(current ? 'El producto se actualizó correctamente.' : 'El producto se creó correctamente.');
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo guardar el producto.');
    } finally {
      this.saving.set(false);
    }
  }
}
