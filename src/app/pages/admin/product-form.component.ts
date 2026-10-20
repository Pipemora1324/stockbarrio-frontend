import { afterNextRender, ChangeDetectionStrategy, Component, computed, ElementRef, inject, input, OnInit, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService, type ProductInput } from '../../api.service';
import { todayInBogota } from '../../dates';
import type { Product } from '../../models';
import * as rules from '../../validation/rules';

type Field = 'name' | 'category' | 'price' | 'stock' | 'expirationDate' | 'discountPercent' | 'offerStartsOn' | 'offerEndsOn' | 'description';

interface FormValues {
  name: string;
  category: string;
  description: string;
  price: number;
  stock: number;
  expirationDate: string;
  discountPercent: number;
  offerStartsOn: string;
  offerEndsOn: string;
}

const emptyProduct = (): FormValues => ({ name: '', category: '', description: '', price: 0, stock: 0, expirationDate: '', discountPercent: 0, offerStartsOn: '', offerEndsOn: '' });

@Component({
  selector: 'app-product-form',
  imports: [FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './product-form.component.scss',
  template: `
<section class="card form-card" aria-labelledby="product-form-title">
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
      <input id="product-discount" name="discountPercent" type="number" inputmode="numeric" min="0" [max]="maxDiscount" step="5" [ngModel]="values().discountPercent" (ngModelChange)="setDiscount($event)" (blur)="touch('discountPercent')" [attr.aria-invalid]="show('discountPercent') ? true : null" aria-describedby="product-discount-error product-discount-help">
      <small class="field-help" id="product-discount-help">Con 0 el producto queda sin oferta, en el catálogo.</small>
      @if (show('discountPercent')) { <small class="field-error" id="product-discount-error">{{ errors().discountPercent }}</small> }
    </div>
    @if (hasOffer()) {
      <fieldset class="offer-range full">
        <legend>Fechas de la oferta</legend>
        <div class="field">
          <label for="offer-start">Fecha de inicio</label>
          <input id="offer-start" name="offerStartsOn" type="date" [min]="startMin()" [max]="values().expirationDate || null" [ngModel]="values().offerStartsOn" (ngModelChange)="set('offerStartsOn', $event)" (blur)="touch('offerStartsOn')" [attr.aria-invalid]="show('offerStartsOn') ? true : null" aria-describedby="offer-start-error">
          @if (show('offerStartsOn')) { <small class="field-error" id="offer-start-error">{{ errors().offerStartsOn }}</small> }
        </div>
        <div class="field">
          <label for="offer-end">Fecha de finalización</label>
          <input id="offer-end" name="offerEndsOn" type="date" [min]="values().offerStartsOn || today" [max]="values().expirationDate || null" [ngModel]="values().offerEndsOn" (ngModelChange)="set('offerEndsOn', $event)" (blur)="touch('offerEndsOn')" [attr.aria-invalid]="show('offerEndsOn') ? true : null" aria-describedby="offer-end-error offer-end-help">
          <small class="field-help" id="offer-end-help">Hasta el vencimiento del producto como máximo. La oferta se ve solo entre estas dos fechas (hora de Colombia).</small>
          @if (show('offerEndsOn')) { <small class="field-error" id="offer-end-error">{{ errors().offerEndsOn }}</small> }
        </div>
      </fieldset>
    }
    <div class="field full">
      <label for="product-description">Descripción (opcional)</label>
      <textarea id="product-description" name="description" maxlength="500" rows="3" [ngModel]="values().description" (ngModelChange)="set('description', $event)"></textarea>
    </div>
    @if (error()) { <p class="alert alert-error full" role="alert">{{ error() }}</p> }
    <div class="form-actions full">
      <button type="button" class="button button-light" (click)="cancelled.emit()">Cancelar</button>
      <button class="button" type="submit" [disabled]="saving()">{{ saving() ? 'Guardando…' : 'Guardar' }}</button>
    </div>
  </form>
</section>`,
})
export class ProductFormComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly product = input<Product | null>(null);
  // Store where a new product is saved (the API uses the main store without it).
  readonly storeId = input<string | undefined>(undefined);
  readonly saved = output<string>();
  readonly cancelled = output<void>();
  protected readonly maxPrice = rules.maxPrice;
  protected readonly maxStock = rules.maxStock;
  protected readonly maxDiscount = rules.maxDiscount;
  protected readonly today = todayInBogota();
  readonly values = signal<FormValues>(emptyProduct());
  private readonly touched = signal<ReadonlySet<Field>>(new Set());
  readonly saving = signal(false);
  readonly error = signal('');
  readonly hasOffer = computed(() => Number(this.values().discountPercent) > 0);
  // A running offer keeps its start even if it is already in the past.
  private readonly savedStart = computed(() => this.product()?.offerStartsOn ?? null);
  private readonly savedEnd = computed(() => this.product()?.offerEndsOn ?? null);
  readonly startMin = computed(() => (this.savedStart() && this.savedStart()! < this.today ? this.savedStart()! : this.today));

  // A product saved before the list existed keeps its old category as a valid option.
  readonly categories = computed<readonly string[]>(() => {
    const current = this.product()?.category;
    return current && !rules.productCategories.includes(current as never) ? [...rules.productCategories, current] : rules.productCategories;
  });

  readonly errors = computed<Record<Field, string>>(() => {
    const value = this.values();
    const offer = this.hasOffer();
    return {
      name: rules.productName(value.name),
      category: rules.category(value.category, this.categories()),
      price: rules.price(value.price),
      stock: rules.stock(value.stock),
      expirationDate: rules.expirationDate(value.expirationDate, !this.product()),
      discountPercent: rules.discount(value.discountPercent) || rules.offerOnExpired(Number(value.discountPercent), value.expirationDate, this.today),
      offerStartsOn: offer ? rules.offerStart(value.offerStartsOn, this.today, this.savedStart()) : '',
      offerEndsOn: offer ? rules.offerEnd(value.offerEndsOn, value.offerStartsOn, value.expirationDate, this.today, this.savedEnd()) : '',
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
      this.values.set({
        name: product.name,
        category: product.category,
        description: product.description,
        price: Number(product.price),
        stock: Number(product.stock),
        expirationDate: product.expirationDate.slice(0, 10),
        discountPercent: Number(product.discountPercent),
        offerStartsOn: product.offerStartsOn ?? '',
        offerEndsOn: product.offerEndsOn ?? '',
      });
    }
  }

  set<K extends Field>(field: K, value: FormValues[K]) {
    this.values.update((current) => ({ ...current, [field]: value }));
  }

  // Turning a discount on proposes the range: from today until the expiration date (both editable).
  setDiscount(value: number) {
    this.values.update((current) => {
      const next = { ...current, discountPercent: value };
      if (Number(value) > 0) {
        next.offerStartsOn ||= this.today;
        next.offerEndsOn ||= current.expirationDate;
      }
      return next;
    });
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
    const offer = this.hasOffer();
    const payload: ProductInput = {
      name: value.name.trim(),
      category: value.category,
      description: value.description.trim(),
      price: Number(value.price),
      stock: Number(value.stock),
      expirationDate: value.expirationDate,
      discountPercent: Number(value.discountPercent),
      offerStartsOn: offer ? value.offerStartsOn : null,
      offerEndsOn: offer ? value.offerEndsOn : null,
    };
    try {
      const current = this.product();
      if (current) await this.api.updateProduct(current.id, payload);
      else await this.api.saveProduct(payload, this.storeId());
      this.saved.emit(current ? 'El producto se actualizó correctamente.' : 'El producto se creó correctamente.');
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo guardar el producto.');
    } finally {
      this.saving.set(false);
    }
  }
}
