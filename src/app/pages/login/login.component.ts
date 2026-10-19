import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({
  selector: 'app-login',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './login.component.scss',
  template: `
<main class="login-page">
  <section class="login-card">
    <span class="eyebrow">Acceso</span>
    <h1>Bienvenido a StockBarrio</h1>
    <p>Inicia sesión para gestionar tu tienda o para ver tus alertas de descuentos.</p>
    @if (auth.sessionNotice()) { <p class="notice" role="status">{{ auth.sessionNotice() }}</p> }
    <form (ngSubmit)="submit()">
      <label>Correo electrónico<input name="email" [(ngModel)]="email" type="email" autocomplete="email" required></label>
      <label>Contraseña<input name="password" [(ngModel)]="password" type="password" autocomplete="current-password" required></label>
      <button class="button" type="submit" [disabled]="loading() || !canSubmit()">{{ loading() ? 'Entrando…' : 'Iniciar sesión' }}</button>
      @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
    </form>
    <a routerLink="/register">¿No tienes cuenta? Regístrate</a>
  </section>
  <aside class="login-visual" aria-hidden="true">
    <span>SB</span>
    <h2>Tu barrio, siempre informado.</h2>
    <p>Controla stock, precios y ofertas, o recibe avisos cuando lo que buscas baje de precio.</p>
  </aside>
</main>`,
})
export class LoginComponent {
  protected readonly auth = inject(AuthService);
  readonly email = signal('');
  readonly password = signal('');
  readonly loading = signal(false);
  readonly error = signal('');
  // Login only checks that both fields are filled: older accounts may not follow the current password rules.
  readonly canSubmit = computed(() => this.email().trim().length > 3 && this.password().length > 0);

  async submit() {
    this.loading.set(true);
    this.error.set('');
    try {
      await this.auth.login(this.email(), this.password());
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.');
    } finally {
      this.loading.set(false);
    }
  }
}
