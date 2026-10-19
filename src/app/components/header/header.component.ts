import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../auth.service';

@Component({ selector: 'app-header', standalone: true, imports: [CommonModule, RouterLink], template: `
<header class="site-header">
  <a class="brand" routerLink="/"><span class="brand-mark">SB</span><span>StockBarrio <strong>IA</strong></span></a>
  <nav><a routerLink="/">Inicio</a><a routerLink="/catalogo">Catálogo</a><a routerLink="/chat">Asistente IA</a><a routerLink="/admin" *ngIf="auth.isStore()">Mi tienda</a></nav>
  <div class="header-actions"><span class="user-name" *ngIf="auth.user() as user">{{ user.name }}</span><a class="button button-small" routerLink="/login" *ngIf="!auth.user()">Entrar</a><button class="button button-small button-outline" type="button" *ngIf="auth.user()" (click)="auth.logout()">Salir</button></div>
</header>` , styleUrl: './header.component.scss' })
export class HeaderComponent { protected readonly auth = inject(AuthService); }
