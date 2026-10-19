import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

type AccountType = 'customer' | 'store';

@Component({ selector: 'app-register', imports: [FormsModule, RouterLink], changeDetection: ChangeDetectionStrategy.OnPush, template: `
<main class="register-page"><section class="register-card">
  <span class="eyebrow">{{ accountType() === 'store' ? 'Registro de tienda' : 'Registro de cliente' }}</span>
  <h1>{{ accountType() === 'store' ? 'Conecta tu negocio' : 'Ahorra en tu barrio' }}</h1>
  <p>{{ accountType() === 'store' ? 'Crea una cuenta para controlar el inventario de tu tienda y sus ofertas.' : 'Crea una cuenta para recibir avisos cuando haya descuentos en lo que te interesa.' }}</p>
  <div class="account-type" role="radiogroup" aria-label="Tipo de cuenta">
    <button type="button" role="radio" [attr.aria-checked]="accountType() === 'customer'" [class.active]="accountType() === 'customer'" (click)="accountType.set('customer')">Soy cliente</button>
    <button type="button" role="radio" [attr.aria-checked]="accountType() === 'store'" [class.active]="accountType() === 'store'" (click)="accountType.set('store')">Tengo una tienda</button>
  </div>
  <form (ngSubmit)="submit()">
    <label>Nombre completo<input name="name" [(ngModel)]="name" autocomplete="name" required minlength="2"></label>
    <label>Correo electrónico<input name="email" [(ngModel)]="email" type="email" autocomplete="email" required></label>
    <label>Contraseña<input name="password" [(ngModel)]="password" type="password" autocomplete="new-password" minlength="8" required><small>Mínimo 8 caracteres.</small></label>
    @if (isStore()) {
      <label>Nombre de la tienda<input name="storeName" [(ngModel)]="storeName" required></label>
      <label>Barrio<input name="neighborhood" [(ngModel)]="neighborhood" required></label>
      <label>Dirección<input name="address" [(ngModel)]="address" autocomplete="street-address" required></label>
      <label>Teléfono<input name="phone" [(ngModel)]="phone" type="tel" autocomplete="tel"></label>
    }
    <button class="button" type="submit" [disabled]="loading()">{{ loading() ? 'Creando cuenta…' : 'Crear cuenta' }}</button>
    @if (error()) { <p class="error" role="alert">{{ error() }}</p> }
  </form>
  <a routerLink="/login">¿Ya tienes cuenta? Entra</a>
</section></main>`, styleUrl: './register.component.scss' })
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  readonly accountType = signal<AccountType>(inject(ActivatedRoute).snapshot.queryParamMap.get('tipo') === 'tienda' ? 'store' : 'customer');
  readonly isStore = computed(() => this.accountType() === 'store');
  name = ''; email = ''; password = ''; storeName = ''; neighborhood = ''; address = ''; phone = '';
  loading = signal(false); error = signal('');

  async submit() {
    this.loading.set(true);
    this.error.set('');
    const account = { name: this.name, email: this.email, password: this.password };
    try {
      await this.auth.register(this.isStore()
        ? { ...account, accountType: 'store', storeName: this.storeName, neighborhood: this.neighborhood, address: this.address, phone: this.phone }
        : { ...account, accountType: 'customer' });
    } catch (caught) {
      this.error.set(caught instanceof Error ? caught.message : 'No se pudo crear la cuenta.');
    } finally {
      this.loading.set(false);
    }
  }
}
