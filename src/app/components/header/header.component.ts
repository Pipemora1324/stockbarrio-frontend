import { ChangeDetectionStrategy, Component, computed, DestroyRef, HostListener, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive } from '@angular/router';
import { filter } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthService } from '../../auth.service';
import { NotificationsService } from '../../services/notifications.service';
import { ThemeService } from '../../services/theme.service';
import { IconComponent } from '../icon/icon.component';

// From this many pixels of scroll the header gets compact and solid.
export const compactAfterPx = 24;

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive, IconComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styleUrl: './header.component.scss',
  host: { '[class.compact]': 'compact()', '[class.menu-is-open]': 'menuOpen()' },
  template: `
<header class="site-header">
  <a class="brand" routerLink="/" aria-label="Stock Barrio, ir al inicio">
    <span class="brand-mark" aria-hidden="true">SB</span>
    <span class="brand-name">Stock Barrio</span>
  </a>
  <div class="header-tools">
    <button class="icon-button theme-toggle" type="button" (click)="theme.toggle()" [attr.aria-label]="themeLabel()" [attr.title]="themeLabel()">
      <app-icon [name]="theme.theme() === 'dark' ? 'sun' : 'moon'" />
    </button>
    <button class="icon-button menu-toggle" type="button" [attr.aria-expanded]="menuOpen()" aria-controls="main-menu" (click)="menuOpen.set(!menuOpen())">
      <span class="sr-only">{{ menuOpen() ? 'Cerrar menú' : 'Abrir menú' }}</span>
      <span class="menu-icon" [class.open]="menuOpen()" aria-hidden="true"></span>
    </button>
  </div>
  <div id="main-menu" class="menu" [class.open]="menuOpen()">
    <nav aria-label="Principal">
      <a routerLink="/ofertas" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icon name="tag" />Ofertas</a>
      <a routerLink="/catalogo" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icon name="catalog" />Catálogo</a>
      <a routerLink="/chat" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icon name="chat" />Asistente</a>
      @if (auth.isStore()) {
        <a routerLink="/admin" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icon name="store" />Mi tienda</a>
      } @else if (auth.user()) {
        <a routerLink="/perfil" routerLinkActive="active" ariaCurrentWhenActive="page"><app-icon name="user" />Mi cuenta</a>
      }
      @if (alertsEnabled && auth.isCustomer()) { <a routerLink="/alertas" routerLinkActive="active">Mis alertas</a> }
    </nav>
    <div class="header-actions">
      @if (alertsEnabled && auth.isCustomer()) {
        <a class="icon-button bell" routerLink="/notificaciones" [attr.aria-label]="notifications.unread() ? 'Notificaciones: ' + notifications.unread() + ' sin leer' : 'Notificaciones'">
          <app-icon name="bell" />
          @if (notifications.unread()) { <span class="bell-count" aria-hidden="true">{{ notifications.unread() > 99 ? '99+' : notifications.unread() }}</span> }
        </a>
      }
      @if (auth.user()) {
        <button class="button button-light button-small" type="button" (click)="auth.logout()"><app-icon name="logout" />Salir</button>
      } @else {
        <a class="button button-light button-small" routerLink="/register">Crear cuenta</a>
        <a class="button button-small" routerLink="/login">Entrar</a>
      }
    </div>
  </div>
</header>`,
})
export class HeaderComponent {
  protected readonly auth = inject(AuthService);
  protected readonly notifications = inject(NotificationsService);
  protected readonly theme = inject(ThemeService);
  protected readonly alertsEnabled = environment.enableAlerts;
  readonly menuOpen = signal(false);
  readonly compact = signal(false);
  protected readonly themeLabel = computed(() => (this.theme.theme() === 'dark' ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro'));

  constructor() {
    inject(Router)
      .events.pipe(filter((event) => event instanceof NavigationEnd), takeUntilDestroyed(inject(DestroyRef)))
      .subscribe(() => this.menuOpen.set(false));
    this.onScroll();
  }

  @HostListener('window:scroll')
  onScroll(scrollY = globalThis.scrollY ?? 0) {
    this.compact.set(scrollY > compactAfterPx);
  }

  @HostListener('document:keydown.escape')
  closeMenu() {
    this.menuOpen.set(false);
  }
}
