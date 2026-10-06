import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({ selector: 'app-register', standalone: true, imports: [CommonModule, FormsModule], template: `
<main class="register-page"><section class="register-card"><span class="eyebrow">Registro de tienda</span><h1>Conecta tu negocio</h1><p>Crea una cuenta para controlar su inventario y sus ofertas.</p><form (ngSubmit)="submit()"><label>Nombre completo<input name="name" [(ngModel)]="name" required></label><label>Correo electrónico<input name="email" [(ngModel)]="email" type="email" required></label><label>Contraseña<input name="password" [(ngModel)]="password" type="password" minlength="8" required></label><label>Nombre de la tienda<input name="storeName" [(ngModel)]="storeName" required></label><label>Barrio<input name="neighborhood" [(ngModel)]="neighborhood" required></label><label>Dirección<input name="address" [(ngModel)]="address" required></label><label>Teléfono<input name="phone" [(ngModel)]="phone"></label><button class="button" type="submit" [disabled]="loading()">Crear cuenta</button><p class="error" *ngIf="error()">{{ error() }}</p></form><a href="/login">¿Ya tienes cuenta? Entra</a></section></main>`, styleUrl: './register.component.scss' })
export class RegisterComponent {
  private readonly auth = inject(AuthService);
  name = ''; email = ''; password = ''; storeName = ''; neighborhood = ''; address = ''; phone = '';
  loading = signal(false); error = signal('');
  async submit() { this.loading.set(true); this.error.set(''); try { await this.auth.register({ name: this.name, email: this.email, password: this.password, storeName: this.storeName, neighborhood: this.neighborhood, address: this.address, phone: this.phone }); } catch (caught) { this.error.set(caught instanceof Error ? caught.message : 'No se pudo crear la cuenta.'); } finally { this.loading.set(false); } }
}
