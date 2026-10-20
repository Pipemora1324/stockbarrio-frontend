import { ChangeDetectionStrategy, Component, computed, DestroyRef, inject, signal } from '@angular/core';
import { PasswordFieldComponent } from '../../components/password-field/password-field.component';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import * as rules from '../../validation/rules';

// The code is valid for this long (Supabase setting "Email OTP Expiration"; see the README).
const codeMinutes = 60;
// Waiting time before another code can be requested, to stay under Supabase's sending limits.
const resendSeconds = 60;
export const genericCodeMessage = 'Si el correo está registrado, te enviamos un código de 6 dígitos. Revisa tu bandeja de entrada y la carpeta de spam.';

// Supabase mode of "¿Olvidaste tu contraseña?": the email brings a 6 digit code that is typed here.
@Component({
  selector: 'app-recover-with-code',
  imports: [PasswordFieldComponent, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<main class="auth-page">
  <section class="auth-card">
    <span class="eyebrow">Recuperar acceso</span>
    <h1>¿Olvidaste tu contraseña?</h1>
    @if (step() === 'email') {
      <p>Escribe el correo con el que creaste tu cuenta y te enviaremos un código de 6 dígitos para crear una contraseña nueva.</p>
      <form (ngSubmit)="sendCode()" novalidate>
        <label for="recover-email">Correo electrónico</label>
        <input id="recover-email" name="email" type="email" autocomplete="email" maxlength="254" [ngModel]="email()" (ngModelChange)="email.set($event)" (blur)="email.set(normalize(email())); emailTouched.set(true)" [attr.aria-invalid]="emailTouched() && emailError() ? true : null" aria-describedby="recover-email-error">
        @if (emailTouched() && emailError()) { <small class="field-error" id="recover-email-error">{{ emailError() }}</small> }
        <button class="button" type="submit" [disabled]="busy() || !!emailError()">{{ busy() ? 'Enviando…' : 'Enviar código' }}</button>
      </form>
    } @else {
      <p class="form-message success" role="status">{{ sentMessage }}</p>
      <p>El código vence en {{ codeMinutes }} minutos. Escríbelo junto con tu contraseña nueva.</p>
      <form (ngSubmit)="changePassword()" novalidate>
        <label for="recover-code">Código de 6 dígitos</label>
        <input id="recover-code" name="code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" [ngModel]="code()" (ngModelChange)="setCode($event)" (blur)="codeTouched.set(true)" [attr.aria-invalid]="codeTouched() && codeError() ? true : null" aria-describedby="recover-code-error">
        @if (codeTouched() && codeError()) { <small class="field-error" id="recover-code-error">{{ codeError() }}</small> }
        <label for="recover-password">Contraseña nueva</label>
        <app-password-field><input id="recover-password" name="password" type="password" autocomplete="new-password" maxlength="72" [ngModel]="password()" (ngModelChange)="password.set($event)" (blur)="passwordTouched.set(true)" [attr.aria-invalid]="passwordTouched() && passwordError() ? true : null" aria-describedby="recover-password-help"></app-password-field>
        <small class="field-help" id="recover-password-help">@if (passwordTouched() && passwordError()) { <span class="field-error">{{ passwordError() }}</span> } @else { Entre 8 y 72 caracteres, con al menos una letra y un número. }</small>
        <label for="recover-confirm">Repite la contraseña</label>
        <app-password-field><input id="recover-confirm" name="confirm" type="password" autocomplete="new-password" maxlength="72" [ngModel]="confirm()" (ngModelChange)="confirm.set($event)" [attr.aria-invalid]="confirm() && confirmError() ? true : null" aria-describedby="recover-confirm-error"></app-password-field>
        @if (confirm() && confirmError()) { <small class="field-error" id="recover-confirm-error">{{ confirmError() }}</small> }
        <button class="button" type="submit" [disabled]="busy() || invalid()">{{ busy() ? 'Guardando…' : 'Cambiar contraseña' }}</button>
      </form>
      <div class="code-actions">
        <button class="button button-light" type="button" [disabled]="busy() || waitSeconds() > 0" (click)="sendCode()">{{ waitSeconds() > 0 ? 'Pedir otro código en ' + waitSeconds() + ' s' : 'Pedir otro código' }}</button>
        <button class="link-button" type="button" (click)="changeEmail()">Usar otro correo</button>
      </div>
    }
    @if (failure()) { <p class="form-message failure" role="alert">{{ failure() }}</p> }
    <a routerLink="/login">Volver a iniciar sesión</a>
  </section>
</main>`,
  styles: `
.code-actions { display: flex; flex-wrap: wrap; align-items: center; gap: .8rem; margin-top: .8rem; }
.link-button { border: 0; padding: 0; background: none; color: var(--color-primary); font: inherit; font-weight: 700; text-decoration: underline; cursor: pointer; }
`,
})
export class RecoverWithCodeComponent {
  private readonly auth = inject(AuthService);
  protected readonly codeMinutes = codeMinutes;
  protected readonly sentMessage = genericCodeMessage;
  readonly step = signal<'email' | 'code'>('email');
  readonly email = signal('');
  readonly code = signal('');
  readonly password = signal('');
  readonly confirm = signal('');
  readonly emailTouched = signal(false);
  readonly codeTouched = signal(false);
  readonly passwordTouched = signal(false);
  readonly busy = signal(false);
  readonly failure = signal('');
  readonly waitSeconds = signal(0);
  private timer: ReturnType<typeof setInterval> | null = null;

  constructor() {
    inject(DestroyRef).onDestroy(() => {
      if (this.timer) clearInterval(this.timer);
    });
  }

  readonly emailError = computed(() => rules.email(this.email()));
  protected readonly normalize = rules.normalizeEmail;
  readonly codeError = computed(() => (/^\d{6}$/.test(this.code()) ? '' : 'Escribe los 6 dígitos del código que te llegó al correo.'));
  readonly passwordError = computed(() => rules.password(this.password(), this.email()));
  readonly confirmError = computed(() => (this.confirm() === this.password() ? '' : 'Las contraseñas no coinciden.'));
  readonly invalid = computed(() => Boolean(this.codeError() || this.passwordError() || this.confirmError()));

  // Only digits: a code pasted with spaces ("123 456") still works.
  setCode(value: string) {
    this.code.set((value ?? '').replace(/\D/g, '').slice(0, 6));
  }

  async sendCode() {
    if (this.emailError()) return;
    await this.run(async () => {
      await this.auth.requestRecoveryCode(this.email());
      this.step.set('code');
      this.startWaiting();
    });
  }

  async changePassword() {
    if (this.invalid()) return;
    await this.run(async () => {
      await this.auth.resetWithCode(this.email(), this.code(), this.password());
      this.auth.signOutWithNotice('Tu contraseña se cambió. Inicia sesión con la nueva; las sesiones anteriores se cerraron.');
    });
  }

  changeEmail() {
    this.step.set('email');
    this.code.set('');
    this.failure.set('');
  }

  private async run(action: () => Promise<void>) {
    this.busy.set(true);
    this.failure.set('');
    try {
      await action();
    } catch (caught) {
      this.failure.set(caught instanceof Error ? caught.message : 'No se pudo completar la operación.');
    } finally {
      this.busy.set(false);
    }
  }

  private startWaiting() {
    if (this.timer) clearInterval(this.timer);
    this.waitSeconds.set(resendSeconds);
    this.timer = setInterval(() => {
      this.waitSeconds.update((seconds) => Math.max(0, seconds - 1));
      if (this.waitSeconds() === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
      }
    }, 1000);
  }
}
