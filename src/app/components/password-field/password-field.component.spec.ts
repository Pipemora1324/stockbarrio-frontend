import { Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { LoginComponent } from '../../pages/login/login.component';
import { RegisterComponent } from '../../pages/register/register.component';
import { ProfileComponent } from '../../pages/account/profile.component';
import { RecoverWithCodeComponent } from '../../pages/account/recover-with-code.component';
import { ResetPasswordComponent } from '../../pages/account/reset-password.component';
import { PasswordFieldComponent } from './password-field.component';

@Component({
  imports: [PasswordFieldComponent, FormsModule],
  template: `<form (ngSubmit)="submitted = submitted + 1">
    <app-password-field><input id="clave" name="clave" type="password" autocomplete="current-password" [ngModel]="value()" (ngModelChange)="value.set($event)"></app-password-field>
  </form>`,
})
class Host {
  readonly value = signal('');
  submitted = 0;
}

describe('PasswordFieldComponent', () => {
  const setup = () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    attached = document.body.appendChild(page);
    return { fixture, page, input: page.querySelector<HTMLInputElement>('#clave')!, button: page.querySelector<HTMLButtonElement>('.toggle')! };
  };

  let attached: HTMLElement | null = null;
  afterEach(() => attached?.remove());

  it('is a separate button that never submits the form, linked to its input', () => {
    const { fixture, button } = setup();
    expect(button.type).toBe('button');
    expect(button.getAttribute('aria-controls')).toBe('clave');
    button.click();
    fixture.detectChanges();
    expect(fixture.componentInstance.submitted).toBe(0);
  });

  it('shows and hides the password with the right label and aria-pressed', () => {
    const { fixture, input, button } = setup();
    expect([input.type, button.getAttribute('aria-label'), button.getAttribute('aria-pressed')]).toEqual(['password', 'Mostrar contraseña', 'false']);
    button.click();
    fixture.detectChanges();
    expect([input.type, button.getAttribute('aria-label'), button.getAttribute('aria-pressed')]).toEqual(['text', 'Ocultar contraseña', 'true']);
    button.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(input.getAttribute('autocomplete')).toBe('current-password');
  });

  it('keeps the focus and the cursor position in the input when used with the mouse', async () => {
    const { fixture, input, button } = setup();
    await fixture.whenStable();
    input.value = 'clave2026';
    input.dispatchEvent(new Event('input'));
    input.focus();
    input.setSelectionRange(3, 5);
    const down = new MouseEvent('mousedown', { cancelable: true });
    button.dispatchEvent(down);
    expect(down.defaultPrevented).toBeTrue();
    button.click();
    fixture.detectChanges();
    expect(document.activeElement).toBe(input);
    expect([input.selectionStart, input.selectionEnd]).toEqual([3, 5]);
    expect(fixture.componentInstance.value()).toBe('clave2026', 'the value never changes');
  });

  it('lets keyboard users reach the button with Tab, with a visible focus', () => {
    const { button } = setup();
    button.focus();
    expect(document.activeElement).toBe(button);
    expect(button.tabIndex).toBe(0);
  });
});

describe('password fields of every screen', () => {
  const screens: Array<[string, unknown, string[]]> = [
    ['inicio de sesión', LoginComponent, ['current-password']],
    ['registro', RegisterComponent, ['new-password']],
    ['recuperación con código', RecoverWithCodeComponent, ['new-password', 'new-password']],
    ['nueva contraseña por enlace', ResetPasswordComponent, ['new-password', 'new-password']],
    ['perfil', ProfileComponent, ['current-password', 'new-password', 'new-password', 'current-password']],
  ];

  for (const [name, component, autocomplete] of screens) {
    it(`${name}: every password field has the eye button and the right autocomplete`, () => {
      // The reset page only shows its form with a token in the address.
      const route = { snapshot: { queryParamMap: convertToParamMap({ token: 'a'.repeat(43) }), fragment: null } };
      TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting(), { provide: ActivatedRoute, useValue: route }] });
      const fixture = TestBed.createComponent(component as never);
      const instance = fixture.componentInstance as { step?: { set: (value: string) => void } };
      // The code recovery shows its passwords in the second step.
      instance.step?.set('code');
      fixture.detectChanges();
      const page = fixture.nativeElement as HTMLElement;
      const fields = [...page.querySelectorAll('app-password-field')];
      expect(fields.length).withContext(name).toBe(autocomplete.length);
      expect(fields.map((field) => field.querySelector('input')!.getAttribute('autocomplete'))).toEqual(autocomplete);
      for (const field of fields) {
        const button = field.querySelector<HTMLButtonElement>('button.toggle')!;
        expect(button.getAttribute('aria-label')).toBe('Mostrar contraseña');
        expect(button.type).toBe('button');
        button.click();
        fixture.detectChanges();
        expect(field.querySelector('input')!.type).toBe('text');
      }
      expect(page.querySelectorAll('input[type=password]').length).toBe(0);
    });
  }
});
