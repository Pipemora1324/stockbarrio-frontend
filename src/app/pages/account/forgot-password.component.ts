import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import * as rules from '../../validation/rules';

@Component({
  selector: 'app-forgot-password',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<main class="auth-page">
  <section class="auth-card">
    <span class="eyebrow">Recuperar acceso</span>
    <h1>¿Olvidaste tu contraseña?</h1>
    <p>Escribe el correo con el que creaste tu cuenta y te enviaremos un enlace para crear una nueva. El enlace sirve una sola vez y vence en 30 minutos.</p>
    @if (sent()) {
      <p class="form-message success" role="status">{{ sent() }}</p>
      <p>Usa el correo con el que creaste tu cuenta. Si en unos minutos no te llega, revisa la carpeta de spam o pide otro enlace: el anterior deja de servir.</p>
      <button class="button button-light" type="button" (click)="sent.set('')">Pedir otro enlace</button>
      <a routerLink="/login">Volver a iniciar sesión</a>
    } @else {
      <form (ngSubmit)="submit()" novalidate>
        <label for="forgot-email">Correo electrónico</label>
        <input id="forgot-email" name="email" type="email" autocomplete="email" maxlength="254" [ngModel]="email()" (ngModelChange)="email.set($event)" (blur)="touched.set(true)" [attr.aria-invalid]="showError() ? true : null" aria-describedby="forgot-email-error">
        @if (showError()) { <small class="field-error" id="forgot-email-error">{{ error() }}</small> }
        <button class="button" type="submit" [disabled]="loading() || !!error()">{{ loading() ? 'Enviando…' : 'Enviar enlace' }}</button>
        @if (failure()) { <p class="form-message failure" role="alert">{{ failure() }}</p> }
      </form>
      <a routerLink="/login">Recordé mi contraseña</a>
    }
  </section>
</main>`,
})
export class ForgotPasswordComponent {
  private readonly api = inject(ApiService);
  readonly email = signal('');
  readonly touched = signal(false);
  readonly loading = signal(false);
  readonly sent = signal('');
  readonly failure = signal('');
  readonly error = computed(() => rules.email(this.email()));
  readonly showError = computed(() => this.touched() && Boolean(this.error()));

  async submit() {
    if (this.error()) return;
    this.loading.set(true);
    this.failure.set('');
    try {
      this.sent.set((await this.api.forgotPassword(this.email().trim().toLowerCase())).message);
    } catch (caught) {
      this.failure.set(caught instanceof Error ? caught.message : 'No se pudo enviar el enlace.');
    } finally {
      this.loading.set(false);
    }
  }
}
