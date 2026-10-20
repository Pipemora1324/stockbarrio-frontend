import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { PasswordFieldComponent } from '../../components/password-field/password-field.component';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { ApiError, ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';
import * as rules from '../../validation/rules';

// Los tokens tienen 43 caracteres; uno más corto lo cortó el cliente de correo.
const minTokenLength = 20;

@Component({
  selector: 'app-reset-password',
  imports: [PasswordFieldComponent, FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<main class="auth-page">
  <section class="auth-card">
    <span class="eyebrow">Nueva contraseña</span>
    <h1>Crea tu nueva contraseña</h1>
    @if (!token) {
      <p class="form-message failure" role="alert">El enlace está incompleto. Ábrelo completo desde el correo o pide uno nuevo.</p>
      <a class="button" routerLink="/forgot-password">Pedir un enlace nuevo</a>
    } @else if (linkExpired()) {
      <p class="form-message failure" role="alert">{{ failure() }}</p>
      <p>Por seguridad, cada enlace sirve una sola vez y vence en 30 minutos.</p>
      <a class="button" routerLink="/forgot-password">Pedir un enlace nuevo</a>
    } @else {
      <p>Al cambiarla cerraremos las sesiones que tengas abiertas en otros dispositivos.</p>
      <form (ngSubmit)="submit()" novalidate>
        <label for="reset-password">Contraseña nueva</label>
        <app-password-field><input id="reset-password" name="password" type="password" autocomplete="new-password" maxlength="72" [ngModel]="password()" (ngModelChange)="password.set($event)" (blur)="touched.set(true)" [attr.aria-invalid]="touched() && passwordError() ? true : null" aria-describedby="reset-password-help"></app-password-field>
        <small class="field-help" id="reset-password-help">@if (touched() && passwordError()) { <span class="field-error">{{ passwordError() }}</span> } @else { Entre 8 y 72 caracteres, con al menos una letra y un número. }</small>
        <label for="reset-confirm">Repite la contraseña</label>
        <app-password-field><input id="reset-confirm" name="confirm" type="password" autocomplete="new-password" maxlength="72" [ngModel]="confirm()" (ngModelChange)="confirm.set($event)" (blur)="confirmTouched.set(true)" [attr.aria-invalid]="confirmTouched() && confirmError() ? true : null" aria-describedby="reset-confirm-error"></app-password-field>
        @if (confirmTouched() && confirmError()) { <small class="field-error" id="reset-confirm-error">{{ confirmError() }}</small> }
        <button class="button" type="submit" [disabled]="loading() || invalid()">{{ loading() ? 'Guardando…' : 'Cambiar contraseña' }}</button>
        @if (failure()) { <p class="form-message failure" role="alert">{{ failure() }}</p> }
      </form>
    }
  </section>
</main>`,
})
export class ResetPasswordComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly rawToken = (this.route.snapshot.queryParamMap.get('token') ?? '').trim();
  protected readonly token = this.rawToken.length >= minTokenLength ? this.rawToken : '';
  readonly password = signal('');
  readonly confirm = signal('');
  readonly touched = signal(false);
  readonly confirmTouched = signal(false);
  readonly loading = signal(false);
  readonly failure = signal('');
  // El enlace ya se usó, lo reemplazó uno más nuevo o venció: el formulario ya no puede funcionar.
  readonly linkExpired = signal(false);
  readonly passwordError = computed(() => rules.password(this.password()));
  readonly confirmError = computed(() => (this.confirm() === this.password() ? '' : 'Las contraseñas no coinciden.'));
  readonly invalid = computed(() => Boolean(this.passwordError() || this.confirmError()));

  // El token se queda solo en memoria: se quita de la barra de direcciones, del historial y de la cabecera Referer.
  ngOnInit() {
    if (this.rawToken) void this.router.navigate([], { relativeTo: this.route, queryParams: {}, replaceUrl: true });
  }

  async submit() {
    if (this.invalid()) return;
    this.loading.set(true);
    this.failure.set('');
    try {
      const response = await this.api.resetPassword(this.token, this.password());
      this.auth.signOutWithNotice(response.message);
    } catch (caught) {
      this.failure.set(caught instanceof Error ? caught.message : 'No se pudo cambiar la contraseña.');
      this.linkExpired.set(caught instanceof ApiError && caught.status === 400 && /enlace/i.test(caught.message));
    } finally {
      this.loading.set(false);
    }
  }
}
