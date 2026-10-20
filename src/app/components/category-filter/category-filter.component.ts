import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextId = 0;

// El único filtro de Ofertas y Catálogo: una categoría o todas. Botones de radio debajo, mostrados como píldoras,
// para que las flechas del teclado pasen entre opciones y los lectores de pantalla anuncien la elección.
@Component({
  selector: 'app-category-filter',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<fieldset class="category-filter">
  <legend class="sr-only">{{ label() }}</legend>
  <label class="pill"><input type="radio" [name]="name" value="" [checked]="!value()" (change)="valueChange.emit('')"><span>Todas</span></label>
  @for (category of categories(); track category) {
    <label class="pill"><input type="radio" [name]="name" [value]="category" [checked]="value() === category" (change)="valueChange.emit(category)"><span>{{ category }}</span></label>
  }
</fieldset>`,
})
export class CategoryFilterComponent {
  readonly label = input('Filtrar por categoría');
  readonly categories = input<readonly string[]>([]);
  readonly value = input('');
  readonly valueChange = output<string>();
  protected readonly name = `categoria-${++nextId}`;
}
