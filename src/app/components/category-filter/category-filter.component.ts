import { ChangeDetectionStrategy, Component, input, output } from '@angular/core';

let nextId = 0;

// The single filter of Ofertas and Catálogo: one category or all of them. Radio buttons underneath, shown as pills,
// so the arrow keys move between options and screen readers announce the choice.
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
