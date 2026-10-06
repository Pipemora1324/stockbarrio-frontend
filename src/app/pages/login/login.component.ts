import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../auth.service';

@Component({ selector: 'app-login', standalone: true, imports: [CommonModule, FormsModule], template: `
<main class="login-page"><section class="login-card"><span class="eyebrow">Acceso privado</span><h1>Bienvenido a StockBarrio</h1><p>Inicia sesión para gestionar tu tienda y su inventario.</p><form (ngSubmit)="submit()"><label>Correo electrónico<input name="email" [(ngModel)]="email" type="email" required></label><label>Contraseña<input name="password" [(ngModel)]="password" type="password" required></label><button class="button" type="submit" [disabled]="loading()">Iniciar sesión</button><p class="error" *ngIf="error()">{{ error() }}</p></form><a href="/register">¿No tienes cuenta? Regístrate</a></section><aside class="login-visual"><span>SB</span><h2>Tu barrio, siempre informado.</h2><p>Controla stock, precios y ofertas con una vista clara y segura.</p></aside></main>`, styleUrl: './login.component.scss' })
export class LoginComponent {
  private readonly auth = inject(AuthService); email = signal(''); password = signal(''); loading = signal(false); error = signal('');
  async submit() { this.loading.set(true); this.error.set(''); try { await this.auth.login(this.email(), this.password()); } catch (caught) { this.error.set(caught instanceof Error ? caught.message : 'No se pudo iniciar sesión.'); } finally { this.loading.set(false); } }
}
