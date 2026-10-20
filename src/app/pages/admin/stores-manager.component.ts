import { ChangeDetectionStrategy, Component, computed, inject, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { IconComponent } from '../../components/icon/icon.component';
import type { OwnedStore, StoreInput } from '../../models';
import * as rules from '../../validation/rules';

type StoreField = keyof StoreInput;

// Deleting a store also removes all its products from Stock Barrio, so the question says it.
export const deleteStoreQuestion = (store: OwnedStore) => {
  const products = store.productCount === 1 ? 'su producto' : store.productCount ? `sus ${store.productCount} productos` : 'todos sus productos';
  return `¿Eliminar el local «${store.name}»? También se quitarán ${products} de Stock Barrio (ofertas, catálogo y asistente).`;
};
const emptyStore = (): StoreInput => ({ name: '', neighborhood: '', address: '', phone: '' });

// The seller's stores (Local 1, Local 2...): pick one, create, rename or delete it (with confirmation).
@Component({
  selector: 'app-stores-manager',
  imports: [FormsModule, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './stores-manager.component.scss',
  template: `
<section class="stores" aria-labelledby="stores-title">
  <div class="stores-head">
    <h2 id="stores-title">Mis locales</h2>
    @if (stores().length < max()) {
      <button class="button button-light button-small" type="button" (click)="openCreate()" [attr.aria-expanded]="creating()" aria-controls="new-store-form"><app-icon name="plus" />Nuevo local</button>
    } @else {
      <small class="muted">Llegaste al máximo de {{ max() }} locales.</small>
    }
  </div>

  @if (stores().length) {
    <div class="store-tabs" role="radiogroup" aria-label="Elige el local que quieres ver">
      @for (store of stores(); track store.id; let index = $index) {
        <button type="button" class="store-tab" role="radio" [attr.aria-checked]="store.id === selectedId()" [class.selected]="store.id === selectedId()" (click)="selected.emit(store.id)">
          <span class="tab-number">Local {{ index + 1 }}</span>
          <strong>{{ store.name }}</strong>
          <small>{{ store.neighborhood }} · {{ store.productCount }} {{ store.productCount === 1 ? 'producto' : 'productos' }}</small>
        </button>
      }
    </div>
  }

  @if (current(); as store) {
    @if (renaming()) {
      <form class="inline-form" (ngSubmit)="rename(store)" novalidate aria-label="Renombrar local">
        <div class="field">
          <label for="rename-store">Nuevo nombre de «{{ store.name }}»</label>
          <input id="rename-store" name="name" maxlength="80" [ngModel]="newName()" (ngModelChange)="newName.set($event)" [attr.aria-invalid]="renameError() ? true : null" aria-describedby="rename-error">
          @if (renameError()) { <small class="field-error" id="rename-error">{{ renameError() }}</small> }
        </div>
        <div class="inline-actions">
          <button class="button button-small" type="submit" [disabled]="busy() || !!renameError()">Guardar nombre</button>
          <button class="button button-light button-small" type="button" (click)="renaming.set(false)">Cancelar</button>
        </div>
      </form>
    } @else {
      <div class="store-actions">
        <span class="muted"><app-icon name="pin" />{{ store.address }}@if (store.phone) { · Tel. {{ store.phone }} }</span>
        <span class="inline-actions">
          <button class="button button-light button-small" type="button" (click)="startRename(store)"><app-icon name="edit" />Renombrar</button>
          <button class="button button-danger button-small" type="button" [disabled]="busy()" (click)="remove(store)"><app-icon name="trash" />Eliminar local</button>
        </span>
      </div>
    }
  }

  @if (creating()) {
    <form id="new-store-form" class="card new-store" (ngSubmit)="create()" novalidate aria-labelledby="new-store-title">
      <h3 id="new-store-title">{{ stores().length ? 'Nuevo local' : 'Crea tu primer local' }}</h3>
      @for (field of fields; track field.key) {
        <div class="field">
          <label [for]="'store-' + field.key">{{ field.label }}</label>
          <input [id]="'store-' + field.key" [name]="field.key" [attr.maxlength]="field.max" [attr.inputmode]="field.key === 'phone' ? 'tel' : null" [placeholder]="field.placeholder" [ngModel]="draft()[field.key]" (ngModelChange)="setDraft(field.key, $event)" (blur)="touch(field.key)" [attr.aria-invalid]="show(field.key) ? true : null" [attr.aria-describedby]="'store-' + field.key + '-error'">
          @if (show(field.key)) { <small class="field-error" [id]="'store-' + field.key + '-error'">{{ errors()[field.key] }}</small> }
        </div>
      }
      <div class="inline-actions">
        <button class="button" type="submit" [disabled]="busy()"><app-icon name="check" />Crear local</button>
        @if (stores().length) { <button class="button button-light" type="button" (click)="creatingRequested.set(false)">Cancelar</button> }
      </div>
    </form>
  }
  @if (error()) { <p class="alert alert-error" role="alert">{{ error() }}</p> }
</section>`,
})
export class StoresManagerComponent {
  private readonly api = inject(ApiService);
  readonly stores = input<OwnedStore[]>([]);
  readonly selectedId = input<string | null>(null);
  readonly max = input(10);
  readonly selected = output<string>();
  // After a create, rename or delete: the message to show and the store to select (null: the first one).
  readonly changed = output<{ message: string; selectId: string | null }>();
  protected readonly fields: ReadonlyArray<{ key: StoreField; label: string; max: number; placeholder: string }> = [
    { key: 'name', label: 'Nombre del local', max: 80, placeholder: 'Ej. Tienda La Esquina' },
    { key: 'neighborhood', label: 'Barrio', max: 80, placeholder: 'Ej. Kennedy' },
    { key: 'address', label: 'Dirección', max: 200, placeholder: 'Ej. Calle 10 # 5-20' },
    { key: 'phone', label: 'Teléfono (opcional)', max: 20, placeholder: 'Ej. 3001234567' },
  ];
  readonly creatingRequested = signal(false);
  // With no stores the form is always open: it is the empty state of the panel.
  readonly creating = computed(() => this.creatingRequested() || !this.stores().length);
  readonly renaming = signal(false);
  readonly newName = signal('');
  readonly busy = signal(false);
  readonly error = signal('');
  readonly draft = signal<StoreInput>(emptyStore());
  private readonly touched = signal<ReadonlySet<StoreField>>(new Set());
  readonly current = computed(() => this.stores().find((store) => store.id === this.selectedId()) ?? null);
  readonly errors = computed<Record<StoreField, string>>(() => {
    const value = this.draft();
    return { name: rules.storeName(value.name), neighborhood: rules.neighborhood(value.neighborhood), address: rules.address(value.address), phone: rules.phone(value.phone) };
  });
  readonly renameError = computed(() => rules.storeName(this.newName()));

  openCreate() {
    this.draft.set(emptyStore());
    this.touched.set(new Set());
    this.creatingRequested.set(true);
  }

  setDraft(field: StoreField, value: string) {
    this.draft.update((current) => ({ ...current, [field]: value }));
  }

  touch(field: StoreField) {
    this.touched.update((current) => new Set(current).add(field));
  }

  show(field: StoreField) {
    return this.touched().has(field) && Boolean(this.errors()[field]);
  }

  startRename(store: OwnedStore) {
    this.newName.set(store.name);
    this.renaming.set(true);
  }

  async create() {
    if (rules.hasErrors(this.errors())) {
      this.touched.set(new Set(this.fields.map((field) => field.key)));
      return;
    }
    const value = this.draft();
    await this.run(async () => {
      const result = await this.api.createStore({ name: value.name.trim(), neighborhood: value.neighborhood.trim(), address: value.address.trim(), phone: value.phone.trim() });
      this.creatingRequested.set(false);
      return { message: result.message, selectId: result.data.id };
    });
  }

  async rename(store: OwnedStore) {
    if (this.renameError()) return;
    await this.run(async () => {
      const result = await this.api.updateStore(store.id, { name: this.newName().trim() });
      this.renaming.set(false);
      return { message: result.message, selectId: store.id };
    });
  }

  async remove(store: OwnedStore) {
    if (!window.confirm(deleteStoreQuestion(store))) return;
    await this.run(async () => ({ message: (await this.api.deleteStore(store.id)).message, selectId: null }));
  }

  private async run(action: () => Promise<{ message: string; selectId: string | null }>) {
    this.busy.set(true);
    this.error.set('');
    try {
      this.changed.emit(await action());
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo completar la acción.');
    } finally {
      this.busy.set(false);
    }
  }
}
