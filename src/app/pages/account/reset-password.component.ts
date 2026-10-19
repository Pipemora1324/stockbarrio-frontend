import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';
import * as rules from '../../validation/rules';

@Component({
  selector: 'app-reset-password',
  imports: [FormsModule, RouterLink],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
<main class="auth-page">
  <section class="auth-card">
    <span class="eyebrow">Nueva contraseña</span>
    <h1>Crea tu nueva contraseña</h1>
    @if (!token) {
      <p class="form-message failure" role="alert">El enlace está incompleto. Pide uno nuevo desde «¿Olvidaste tu contraseña?».</p>
      <a routerLink="/forgot-password">Pedir un enlace nuevo</a>
    } @else {
      <p>Al cambiarla cerraremos las sesiones que tengas abiertas en otros dispositivos.</p>
      <form (ngSubmit)="submit()" novalidate>
        <label for="reset-password">Contraseña nueva</label>
        <input id="reset-password" name="password" type="password" autocomplete="new-password" maxlength="72" [ngModel]="password()" (ngModelChange)="password.set($event)" (blur)="touched.set(true)" [attr.aria-invalid]="touched() && passwordError() ? true : null" aria-describedby="reset-password-help">
        <small class="field-help" id="reset-password-help">@if (touched() && passwordError()) { <span class="field-error">{{ passwordError() }}</span> } @else { Entre 8 y 72 caracteres, con al menos una letra y un número. }</small>
        <label for="reset-confirm">Repite la contraseña</label>
        <input id="reset-confirm" name="confirm" type="password" autocomplete="new-password" maxlength="72" [ngModel]="confirm()" (ngModelChange)="confirm.set($event)" (blur)="confirmTouched.set(true)" [attr.aria-invalid]="confirmTouched() && confirmError() ? true : null" aria-describedby="reset-confirm-error">
        @if (confirmTouched() && confirmError()) { <small class="field-error" id="reset-confirm-error">{{ confirmError() }}</small> }
        <button class="button" type="submit" [disabled]="loading() || invalid()">{{ loading() ? 'Guardando…' : 'Cambiar contraseña' }}</button>
        @if (failure()) { <p class="form-message failure" role="alert">{{ failure() }} <a routerLink="/forgot-password">Pedir un enlace nuevo</a></p> }
      </form>
    }
  </section>
</main>`,
})
export class ResetPasswordComponent {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly token = inject(ActivatedRoute).snapshot.queryParamMap.get('token') ?? '';
  readonly password = signal('');
  readonly confirm = signal('');
  readonly touched = signal(false);
  readonly confirmTouched = signal(false);
  readonly loading = signal(false);
  readonly failure = signal('');
  readonly passwordError = computed(() => rules.password(this.password()));
  readonly confirmError = computed(() => (this.confirm() === this.password() ? '' : 'Las contraseñas no coinciden.'));
  readonly invalid = computed(() => Boolean(this.passwordError() || this.confirmError()));

  async submit() {
    if (this.invalid()) return;
    this.loading.set(true);
    this.failure.set('');
    try {
      const response = await this.api.resetPassword(this.token, this.password());
      this.auth.signOutWithNotice(response.message);
    } catch (caught) {
      this.failure.set(caught instanceof Error ? caught.message : 'No se pudo cambiar la contraseña.');
    } finally {
      this.loading.set(false);
    }
  }
}
