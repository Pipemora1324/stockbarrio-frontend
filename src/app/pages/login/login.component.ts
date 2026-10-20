import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { PasswordFieldComponent } from '../../components/password-field/password-field.component';
import { FormsModule } from '@angular/forms';
import * as rules from '../../validation/rules';
import { IllustrationComponent } from '../../components/illustration/illustration.component';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';
import { SupabaseAuthFailure } from '../../services/supabase.service';

// Messages for the links that Supabase sends back to /login.
const linkNotices: Record<string, string> = {
  confirmado: 'Tu correo quedó confirmado. Ya puedes iniciar sesión.',
  correo: 'Tu correo nuevo quedó confirmado. Inicia sesión con él.',
  vencido: 'El enlace ya se usó o venció. Inicia sesión y, si tu correo no está confirmado, te ofreceremos enviar otro.',
};

@Component({
  selector: 'app-login',
  imports: [PasswordFieldComponent, FormsModule, RouterLink, IllustrationComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login.component.scss',
  template: `
<main class="login-page">
  <section class="card login-card">
    <span class="eyebrow">Acceso</span>
    <h1>Bienvenido a Stock Barrio</h1>
    <p>Inicia sesión para gestionar tu tienda o tu cuenta de cliente.</p>
    @if (auth.sessionNotice()) { <p class="notice" role="status">{{ auth.sessionNotice() }}</p> }
    @if (linkNotice()) { <p class="notice" role="status">{{ linkNotice() }}</p> }
    <form (ngSubmit)="submit()">
      <label>Correo electrónico<input name="email" [(ngModel)]="email" (blur)="email.set(normalize(email()))" type="email" autocomplete="email" required></label>
      <div class="password-label"><label for="login-password">Contraseña</label><app-password-field><input id="login-password" name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required></app-password-field></div>
      <a class="forgot" routerLink="/forgot-password">¿Olvidaste tu contraseña?</a>
      <button class="button" type="submit" [disabled]="loading() || !canSubmit()">{{ loading() ? 'Entrando…' : 'Iniciar sesión' }}</button>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
      @if (canResend()) { <button class="button button-light" type="button" [disabled]="resending()" (click)="resend()">{{ resending() ? 'Enviando…' : 'Reenviar correo de confirmación' }}</button> }
      @if (resent()) { <p class="notice" role="status">{{ resent() }}</p> }
    </form>
    <a routerLink="/register">¿No tienes cuenta? Regístrate</a>
  </section>
  <aside class="login-visual" aria-hidden="true">
    <app-illustration name="stall" />
    <h2>Tu barrio, siempre informado.</h2>
    <p>Controla stock, precios y ofertas, o encuentra los descuentos de las tiendas de tu barrio.</p>
  </aside>
</main>`,
})
export class LoginComponent implements OnInit {
  protected readonly auth = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  readonly linkNotice = signal('');
  readonly canResend = signal(false);
  readonly resending = signal(false);
  readonly resent = signal('');
  readonly email = signal('');
  protected readonly normalize = rules.normalizeEmail;
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  // Login only checks that both fields are filled: older accounts may not follow the current password rules.
  readonly canSubmit = computed(() => this.email().trim().length > 3 && this.password().length > 0);

  // Supabase comes back with ?confirmado=1, ?correo=1 or, when the link failed, #error_code=otp_expired.
  ngOnInit() {
    const query = this.route.snapshot.queryParamMap;
    const hash = new URLSearchParams(globalThis.location?.hash.slice(1) ?? '');
    const key = hash.get('error_code') || hash.get('error') ? 'vencido' : query.get('confirmado') ? 'confirmado' : query.get('correo') ? 'correo' : '';
    if (!key) return;
    this.linkNotice.set(linkNotices[key]);
    // The address keeps no tokens or error codes after reading them.
    void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  async submit() {
    this.loading.set(true);
    this.error.set('');
    this.canResend.set(false);
    this.resent.set('');
    try {
      await this.auth.login(rules.normalizeEmail(this.email()), this.password());
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.');
      this.canResend.set(caught instanceof SupabaseAuthFailure && caught.code === 'email_not_confirmed');
    } finally {
      this.loading.set(false);
    }
  }

  async resend() {
    this.resending.set(true);
    try {
      await this.auth.resendConfirmation(rules.normalizeEmail(this.email()));
      this.resent.set('Te enviamos otro enlace de confirmación. Revisa tu bandeja de entrada y la carpeta de spam.');
      this.canResend.set(false);
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo reenviar el correo.');
    } finally {
      this.resending.set(false);
    }
  }
}
