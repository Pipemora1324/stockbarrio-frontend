import { ChangeDetectionStrategy, Component, computed, inject, OnInit, signal } from '@angular/core';
import { PasswordFieldComponent } from '../../components/password-field/password-field.component';
import { FormsModule } from '@angular/forms';
import { ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';
import type { AccountProfile } from '../../models';
import * as rules from '../../validation/rules';

const roleLabels: Record<AccountProfile['role'], string> = { store: 'Tienda', customer: 'Cliente', admin: 'Administrador' };

interface FormState {
  busy: boolean;
  message: string;
  failure: string;
}

const idle = (): FormState => ({ busy: false, message: '', failure: '' });

@Component({
  selector: 'app-profile',
  imports: [PasswordFieldComponent, FormsModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './profile.component.scss',
  template: `
<main class="profile-page">
  <header class="page-header">
    <span class="eyebrow">Mi cuenta</span>
    <h1>Perfil</h1>
    @if (profile(); as current) { <p>{{ roleLabels[current.role] }} · {{ current.email }}</p> }
  </header>
  @if (loadError()) { <p class="form-message failure" role="alert">{{ loadError() }}</p> }

  <section class="card" aria-labelledby="name-title">
    <h2 id="name-title">Tu nombre</h2>
    <form (ngSubmit)="saveName()" novalidate>
      <label for="profile-name">Nombre completo</label>
      <input id="profile-name" name="name" autocomplete="name" maxlength="60" [ngModel]="name()" (ngModelChange)="name.set($event)" [attr.aria-invalid]="nameError() ? true : null" aria-describedby="profile-name-error">
      @if (nameError()) { <small class="field-error" id="profile-name-error">{{ nameError() }}</small> }
      <div class="actions"><button class="button" type="submit" [disabled]="nameState().busy || !!nameError() || name().trim() === profile()?.name">{{ nameState().busy ? 'Guardando…' : 'Guardar nombre' }}</button></div>
      @if (nameState().message) { <p class="form-message success" role="status">{{ nameState().message }}</p> }
      @if (nameState().failure) { <p class="form-message failure" role="alert">{{ nameState().failure }}</p> }
    </form>
  </section>

  <section class="card" aria-labelledby="password-title">
    <h2 id="password-title">Cambiar contraseña</h2>
    <p class="hint">Al cambiarla cerramos tus otras sesiones abiertas; esta sigue activa.</p>
    <form (ngSubmit)="savePassword()" novalidate>
      <label for="profile-current">Contraseña actual</label>
      <app-password-field><input id="profile-current" name="currentPassword" type="password" autocomplete="current-password" maxlength="200" [ngModel]="currentPassword()" (ngModelChange)="currentPassword.set($event)"></app-password-field>
      <label for="profile-new">Contraseña nueva</label>
      <app-password-field><input id="profile-new" name="newPassword" type="password" autocomplete="new-password" maxlength="72" [ngModel]="newPassword()" (ngModelChange)="newPassword.set($event)" (blur)="newTouched.set(true)" [attr.aria-invalid]="newTouched() && newPasswordError() ? true : null" aria-describedby="profile-new-help"></app-password-field>
      <small class="field-help" id="profile-new-help">@if (newTouched() && newPasswordError()) { <span class="field-error">{{ newPasswordError() }}</span> } @else { Entre 8 y 72 caracteres, con al menos una letra y un número. }</small>
      <label for="profile-confirm">Repite la contraseña nueva</label>
      <app-password-field><input id="profile-confirm" name="confirmPassword" type="password" autocomplete="new-password" maxlength="72" [ngModel]="confirmPassword()" (ngModelChange)="confirmPassword.set($event)" [attr.aria-invalid]="confirmPassword() && confirmError() ? true : null" aria-describedby="profile-confirm-error"></app-password-field>
      @if (confirmPassword() && confirmError()) { <small class="field-error" id="profile-confirm-error">{{ confirmError() }}</small> }
      <div class="actions"><button class="button" type="submit" [disabled]="passwordState().busy || passwordInvalid()">{{ passwordState().busy ? 'Guardando…' : 'Cambiar contraseña' }}</button></div>
      @if (passwordState().message) { <p class="form-message success" role="status">{{ passwordState().message }}</p> }
      @if (passwordState().failure) { <p class="form-message failure" role="alert">{{ passwordState().failure }}</p> }
    </form>
  </section>

  <section class="card" aria-labelledby="email-title">
    <h2 id="email-title">Cambiar correo</h2>
    <p class="hint">Te enviaremos un enlace al correo nuevo. El cambio se hace cuando lo abras; después tendrás que iniciar sesión con el correo nuevo.</p>
    @if (profile()?.pendingEmail) { <p class="form-message success" role="status">Hay un cambio pendiente a {{ profile()?.pendingEmail }}. Revisa ese correo.</p> }
    <form (ngSubmit)="saveEmail()" novalidate>
      <label for="profile-email">Correo nuevo</label>
      <input id="profile-email" name="newEmail" type="email" autocomplete="email" maxlength="254" [ngModel]="newEmail()" (ngModelChange)="newEmail.set($event)" (blur)="emailTouched.set(true)" [attr.aria-invalid]="emailTouched() && newEmailError() ? true : null" aria-describedby="profile-email-error">
      @if (emailTouched() && newEmailError()) { <small class="field-error" id="profile-email-error">{{ newEmailError() }}</small> }
      <label for="profile-email-password">Contraseña actual</label>
      <app-password-field><input id="profile-email-password" name="emailPassword" type="password" autocomplete="current-password" maxlength="200" [ngModel]="emailPassword()" (ngModelChange)="emailPassword.set($event)"></app-password-field>
      <div class="actions"><button class="button" type="submit" [disabled]="emailState().busy || !!newEmailError() || !emailPassword()">{{ emailState().busy ? 'Enviando…' : 'Enviar enlace de confirmación' }}</button></div>
      @if (emailState().message) { <p class="form-message success" role="status">{{ emailState().message }}</p> }
      @if (emailState().failure) { <p class="form-message failure" role="alert">{{ emailState().failure }}</p> }
    </form>
  </section>
</main>`,
})
export class ProfileComponent implements OnInit {
  private readonly api = inject(ApiService);
  private readonly auth = inject(AuthService);
  protected readonly roleLabels = roleLabels;
  readonly profile = signal<AccountProfile | null>(null);
  readonly loadError = signal('');
  readonly name = signal('');
  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly newTouched = signal(false);
  readonly newEmail = signal('');
  readonly emailPassword = signal('');
  readonly emailTouched = signal(false);
  readonly nameState = signal<FormState>(idle());
  readonly passwordState = signal<FormState>(idle());
  readonly emailState = signal<FormState>(idle());

  readonly nameError = computed(() => rules.personName(this.name()));
  readonly newPasswordError = computed(() => rules.password(this.newPassword(), this.profile()?.email ?? ''));
  readonly confirmError = computed(() => (this.confirmPassword() === this.newPassword() ? '' : 'Las contraseñas no coinciden.'));
  readonly passwordInvalid = computed(() => !this.currentPassword() || Boolean(this.newPasswordError() || this.confirmError()));
  readonly newEmailError = computed(() => rules.email(this.newEmail()) || (this.newEmail().trim().toLowerCase() === this.profile()?.email ? 'Es el mismo correo que ya tienes.' : ''));

  async ngOnInit() {
    try {
      const profile = await this.api.getAccount();
      this.profile.set(profile);
      this.name.set(profile.name);
    } catch (caught) {
      this.loadError.set(caught instanceof Error ? caught.message : 'No se pudo cargar tu perfil.');
    }
  }

  async saveName() {
    if (this.nameError()) return;
    await this.run(this.nameState, async () => {
      const name = this.name().trim();
      const message = await this.auth.updateName(name);
      this.profile.update((profile) => (profile ? { ...profile, name } : profile));
      return message;
    });
  }

  async savePassword() {
    if (this.passwordInvalid()) return;
    await this.run(this.passwordState, async () => {
      const message = await this.auth.changePassword(this.currentPassword(), this.newPassword());
      this.currentPassword.set('');
      this.newPassword.set('');
      this.confirmPassword.set('');
      this.newTouched.set(false);
      return message;
    });
  }

  async saveEmail() {
    if (this.newEmailError() || !this.emailPassword()) return;
    await this.run(this.emailState, async () => {
      const email = this.newEmail().trim().toLowerCase();
      const message = await this.auth.requestEmailChange(email, this.emailPassword());
      this.profile.update((profile) => (profile ? { ...profile, pendingEmail: email } : profile));
      this.emailPassword.set('');
      return message;
    });
  }

  private async run(state: ReturnType<typeof signal<FormState>>, action: () => Promise<string>) {
    state.set({ busy: true, message: '', failure: '' });
    try {
      state.set({ busy: false, message: await action(), failure: '' });
    } catch (caught) {
      state.set({ busy: false, message: '', failure: caught instanceof Error ? caught.message : 'No se pudo guardar.' });
    }
  }
}
