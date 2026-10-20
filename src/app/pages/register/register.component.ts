import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth.service';
import * as rules from '../../validation/rules';

type AccountType = 'customer' | 'store';
type Field = 'name' | 'email' | 'password' | 'storeName' | 'neighborhood' | 'address' | 'phone';

@Component({ selector: 'app-register', imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<main class="register-page"><section class="card register-card">
  <span class="eyebrow">{{ isStore() ? 'Registro de tienda' : 'Registro de cliente' }}</span>
  <h1>{{ isStore() ? 'Conecta tu negocio' : 'Ahorra en tu barrio' }}</h1>
  <p>{{ isStore() ? 'Crea una cuenta para controlar el inventario de tu tienda y sus ofertas.' : (alertsEnabled ? 'Crea una cuenta para recibir avisos cuando haya descuentos en lo que te interesa.' : 'Crea una cuenta para guardar tu perfil y encontrar las ofertas de tu barrio.') }}</p>
  <div class="account-type" role="radiogroup" aria-label="Tipo de cuenta">
    <button type="button" role="radio" [attr.aria-checked]="!isStore()" [class.active]="!isStore()" (click)="accountType.set('customer')">Soy cliente</button>
    <button type="button" role="radio" [attr.aria-checked]="isStore()" [class.active]="isStore()" (click)="accountType.set('store')">Tengo una tienda</button>
  </div>
  @if (confirmEmail()) {
  <div class="confirm-state" role="status">
    <h2>Revisa tu correo</h2>
    <p>Te enviamos un enlace a <strong>{{ confirmEmail() }}</strong> para confirmar tu cuenta. Ábrelo y luego inicia sesión. Si no llega en unos minutos, revisa la carpeta de spam.</p>
    <a class="button" routerLink="/login">Ir a iniciar sesión</a>
  </div>
  } @else {
  <form (ngSubmit)="submit()" novalidate>
    <label for="register-name">Nombre completo</label>
    <input id="register-name" name="name" autocomplete="name" maxlength="60" [ngModel]="values().name" (ngModelChange)="set('name', $event)" (blur)="touch('name')" [attr.aria-invalid]="show('name') ? true : null" aria-describedby="register-name-error">
    @if (show('name')) { <small class="field-error" id="register-name-error">{{ errors().name }}</small> }

    <label for="register-email">Correo electrónico</label>
    <input id="register-email" name="email" type="email" autocomplete="email" maxlength="254" [ngModel]="values().email" (ngModelChange)="set('email', $event)" (blur)="touch('email')" [attr.aria-invalid]="show('email') ? true : null" aria-describedby="register-email-error">
    @if (show('email')) { <small class="field-error" id="register-email-error">{{ errors().email }}</small> }

    <label for="register-password">Contraseña</label>
    <input id="register-password" name="password" type="password" autocomplete="new-password" maxlength="72" [ngModel]="values().password" (ngModelChange)="set('password', $event)" (blur)="touch('password')" [attr.aria-invalid]="show('password') ? true : null" aria-describedby="register-password-help">
    <small class="field-help" id="register-password-help">@if (show('password')) { <span class="field-error">{{ errors().password }}</span> } @else { Entre 8 y 72 caracteres, con al menos una letra y un número. }</small>

    @if (isStore()) {
      <label for="register-store">Nombre de la tienda</label>
      <input id="register-store" name="storeName" maxlength="80" [ngModel]="values().storeName" (ngModelChange)="set('storeName', $event)" (blur)="touch('storeName')" [attr.aria-invalid]="show('storeName') ? true : null" aria-describedby="register-store-error">
      @if (show('storeName')) { <small class="field-error" id="register-store-error">{{ errors().storeName }}</small> }

      <label for="register-neighborhood">Barrio</label>
      <input id="register-neighborhood" name="neighborhood" maxlength="80" [ngModel]="values().neighborhood" (ngModelChange)="set('neighborhood', $event)" (blur)="touch('neighborhood')" [attr.aria-invalid]="show('neighborhood') ? true : null" aria-describedby="register-neighborhood-error">
      @if (show('neighborhood')) { <small class="field-error" id="register-neighborhood-error">{{ errors().neighborhood }}</small> }

      <label for="register-address">Dirección</label>
      <input id="register-address" name="address" autocomplete="street-address" maxlength="200" [ngModel]="values().address" (ngModelChange)="set('address', $event)" (blur)="touch('address')" [attr.aria-invalid]="show('address') ? true : null" aria-describedby="register-address-error">
      @if (show('address')) { <small class="field-error" id="register-address-error">{{ errors().address }}</small> }

      <label for="register-phone">Teléfono (opcional)</label>
      <input id="register-phone" name="phone" type="tel" autocomplete="tel" maxlength="20" placeholder="Ej. 310 123 4567" [ngModel]="values().phone" (ngModelChange)="set('phone', $event)" (blur)="touch('phone')" [attr.aria-invalid]="show('phone') ? true : null" aria-describedby="register-phone-error">
      @if (show('phone')) { <small class="field-error" id="register-phone-error">{{ errors().phone }}</small> }
    }
    <button class="button" type="submit" [disabled]="loading() || invalid()">{{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}</button>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
  </form>
  }
  <a routerLink="/login">¿Ya tienes cuenta? Entra</a>
</section></main>`, styleUrl: './register.component.scss' })
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  protected readonly alertsEnabled = environment.enableAlerts;
  readonly accountType = signal<AccountType>(inject(ActivatedRoute).snapshot.queryParamMap.get('tipo') === 'tienda' ? 'store' : 'customer');
  readonly isStore = computed(() => this.accountType() === 'store');
  readonly values = signal<Record<Field, string>>({ name: '', email: '', password: '', storeName: '', neighborhood: '', address: '', phone: '' });
  private readonly touched = signal<ReadonlySet<Field>>(new Set());
  readonly loading = signal(false);
  readonly error = signal('');
  // Supabase mode: the account is ready after the person opens the confirmation link sent to this address.
  readonly confirmEmail = signal('');

  readonly errors = computed<Record<Field, string>>(() => {
    const value = this.values();
    const store = this.isStore();
    return {
      name: rules.personName(value.name),
      email: rules.email(value.email),
      password: rules.password(value.password, value.email),
      storeName: store ? rules.storeName(value.storeName) : '',
      neighborhood: store ? rules.neighborhood(value.neighborhood) : '',
      address: store ? rules.address(value.address) : '',
      phone: store ? rules.phone(value.phone) : '',
    };
  });
  readonly invalid = computed(() => rules.hasErrors(this.errors()));

  set(field: Field, value: string) {
    this.values.update((current) => ({ ...current, [field]: value ?? '' }));
  }

  touch(field: Field) {
    this.touched.update((current) => new Set(current).add(field));
  }

  // A field shows its message once the user has left it and it still has a problem.
  show(field: Field) {
    return this.touched().has(field) && Boolean(this.errors()[field]);
  }

  async submit() {
    if (this.invalid()) return;
    this.loading.set(true);
    this.error.set('');
    const value = this.values();
    const account = { name: value.name.trim(), email: value.email.trim().toLowerCase(), password: value.password };
    try {
      const result = await this.auth.register(this.isStore()
        ? { ...account, accountType: 'store', storeName: value.storeName.trim(), neighborhood: value.neighborhood.trim(), address: value.address.trim(), ...(value.phone.trim() ? { phone: value.phone.trim() } : {}) }
        : { ...account, accountType: 'customer' });
      if (result === 'confirm-email') this.confirmEmail.set(account.email);
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo crear la cuenta.');
    } finally {
      this.loading.set(false);
    }
  }
}
