import { ChangeDetectionStrategy, Component, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { AuthService } from '../../auth.service';
import { NotificationsService } from '../../services/notifications.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './header.component.scss',
  template: `
<header class="site-header">
  <a class="brand" routerLink="/" aria-label="StockBarrio, ir al inicio"><span class="brand-mark" aria-hidden="true">SB</span><span>StockBarrio <strong>IA</strong></span></a>
  <button class="menu-toggle" type="button" [attr.aria-expanded]="menuOpen()" aria-controls="main-menu" (click)="menuOpen.set(!menuOpen())">
    <span class="sr-only">{{ menuOpen() ? 'Cerrar menú' : 'Abrir menú' }}</span>
    <span class="menu-icon" [class.open]="menuOpen()" aria-hidden="true"></span>
  </button>
  <div id="main-menu" class="menu" [class.open]="menuOpen()">
    <nav aria-label="Principal">
      <a routerLink="/" routerLinkActive="active" [routerLinkActiveOptions]="{ exact: true }">Inicio</a>
      <a routerLink="/ofertas" routerLinkActive="active">Ofertas</a>
      <a routerLink="/catalogo" routerLinkActive="active">Catálogo</a>
      <a routerLink="/chat" routerLinkActive="active">Asistente</a>
      @if (auth.isStore()) { <a routerLink="/admin" routerLinkActive="active">Mi tienda</a> }
      @if (auth.isCustomer()) { <a routerLink="/alertas" routerLinkActive="active">Mis alertas</a> }
    </nav>
    <div class="header-actions">
      @if (auth.isCustomer()) {
        <a class="bell" routerLink="/notificaciones" [attr.aria-label]="notifications.unread() ? 'Notificaciones: ' + notifications.unread() + ' sin leer' : 'Notificaciones'">
          <span aria-hidden="true">🔔</span>
          @if (notifications.unread()) { <span class="bell-count" aria-hidden="true">{{ notifications.unread() > 99 ? '99+' : notifications.unread() }}</span> }
        </a>
      }
      @if (auth.user(); as user) {
        <a class="user-name" routerLink="/perfil" routerLinkActive="active" [attr.aria-label]="'Mi perfil: ' + user.name">{{ user.name }}</a>
        <button class="button button-small button-outline" type="button" (click)="auth.logout()">Salir</button>
      } @else {
        <a class="button button-small button-outline" routerLink="/register">Crear cuenta</a>
        <a class="button button-small" routerLink="/login">Entrar</a>
      }
    </div>
  </div>
</header>`,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  readonly menuOpen = signal(false);

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.menuOpen.set(false));
  }

  @HostListener('document:keydown.escape')
  closeMenu() {
    this.menuOpen.set(false);
  }
}
