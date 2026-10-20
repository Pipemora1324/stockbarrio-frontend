import { AfterContentInit, ChangeDetectionStrategy, Component, ElementRef, inject, signal } from '@angular/core';
import { IconComponent } from '../icon/icon.component';

// Wraps a password <input> (projected as is, with its own bindings, validation and autocomplete) and adds an eye
// button to show or hide it. The button only switches the input type, so the form value never changes.
@Component({
  selector: 'app-password-field',
  imports: [IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'password-field' },
  styles: [
    `:host { position: relative; display: block; }
     .toggle {
       position: absolute; top: 50%; right: 0.3rem; display: grid; place-items: center;
       width: 2.4rem; height: 2.4rem; padding: 0; border: 0; border-radius: var(--radius-sm);
       background: transparent; color: var(--color-muted); cursor: pointer; transform: translateY(-50%);
       transition: color 0.15s ease, background-color 0.15s ease; --icon-size: 1.3rem;
     }
     .toggle:hover { background: var(--color-surface-2); color: var(--color-ink); }
     .toggle[aria-pressed='true'] { color: var(--color-ink); }
     .toggle:focus-visible { outline: 3px solid var(--color-blue); outline-offset: 0; }`,
  ],
  template: `<ng-content />
<button type="button" class="toggle" [attr.aria-label]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'" [attr.aria-pressed]="visible()" [attr.aria-controls]="inputId()" [attr.title]="visible() ? 'Ocultar contraseña' : 'Mostrar contraseña'" (mousedown)="keepFocus($event)" (click)="toggle()">
  <app-icon [name]="visible() ? 'eyeOff' : 'eye'" />
</button>`,
})
export class PasswordFieldComponent implements AfterContentInit {
  private readonly host = inject<ElementRef<HTMLElement>>(ElementRef);
  readonly visible = signal(false);
  readonly inputId = signal<string | null>(null);
  private input: HTMLInputElement | null = null;

  ngAfterContentInit() {
    this.input = this.host.nativeElement.querySelector('input');
    this.inputId.set(this.input?.id || null);
  }

  // With the mouse the input keeps the focus (and the cursor) instead of moving it to the button.
  keepFocus(event: MouseEvent) {
    if (this.input && this.host.nativeElement.ownerDocument.activeElement === this.input) event.preventDefault();
  }

  toggle() {
    const input = this.input;
    if (!input) return;
    const focused = input.ownerDocument.activeElement === input;
    const { selectionStart, selectionEnd } = input;
    this.visible.update((value) => !value);
    input.type = this.visible() ? 'text' : 'password';
    if (focused && selectionStart !== null && selectionEnd !== null) input.setSelectionRange(selectionStart, selectionEnd);
  }
}
