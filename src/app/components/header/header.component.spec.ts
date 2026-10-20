import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth.service';
import type { AuthUser } from '../../models';
import { NotificationsService } from '../../services/notifications.service';
import { themeStorageKey } from '../../services/theme.service';
import { compactAfterPx, HeaderComponent } from './header.component';

describe('HeaderComponent', () => {
  const user = signal<AuthUser | null>(null);
  const logout = jasmine.createSpy('logout');

  const setup = (signedIn: AuthUser | null = null) => {
    user.set(signedIn);
    TestBed.configureTestingModule({
      imports: [HeaderComponent],
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: { user, isStore: () => user()?.role === 'store', isCustomer: () => user()?.role === 'customer', logout },
        },
        { provide: NotificationsService, useValue: { unread: signal(0) } },
      ],
    });
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    return { fixture, page: fixture.nativeElement as HTMLElement };
  };
  const links = (page: HTMLElement) => [...page.querySelectorAll('nav a')].map((link) => link.textContent?.trim());

  afterEach(() => {
    localStorage.removeItem(themeStorageKey);
    document.documentElement.removeAttribute('data-theme');
  });

  it('shows only the SB mark and "Stock Barrio", without "Inicio" nor "IA"', () => {
    const { page } = setup();
    expect(page.querySelector('.brand-mark')?.textContent).toBe('SB');
    expect(page.querySelector('.brand-name')?.textContent).toBe('Stock Barrio');
    expect(page.querySelector('.brand')?.getAttribute('aria-label')).toBe('Stock Barrio, ir al inicio');
    expect(links(page)).toEqual(['Ofertas', 'Catálogo', 'Asistente']);
    expect(page.textContent).not.toMatch(/\bIA\b|Inicio/);
    expect(page.querySelector('a[routerLink="/login"], a[href="/login"]')).not.toBeNull();
  });

  it('adds "Mi tienda" for stores and "Mi cuenta" for customers', () => {
    expect(links(setup({ id: 'u1', name: 'Ana', role: 'store' }).page)).toEqual(['Ofertas', 'Catálogo', 'Asistente', 'Mi tienda']);
    TestBed.resetTestingModule();
    const { page } = setup({ id: 'u2', name: 'Luis', role: 'customer' });
    expect(links(page)).toEqual(['Ofertas', 'Catálogo', 'Asistente', 'Mi cuenta']);
    page.querySelector<HTMLButtonElement>('.header-actions button')!.click();
    expect(logout).toHaveBeenCalled();
  });

  it('opens and closes the mobile menu with an accessible toggle and Escape', () => {
    const { fixture, page } = setup();
    const toggle = page.querySelector<HTMLButtonElement>('.menu-toggle')!;
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
    expect(toggle.getAttribute('aria-controls')).toBe('main-menu');
    toggle.click();
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('true');
    expect(page.querySelector('#main-menu')?.classList).toContain('open');
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' }));
    fixture.detectChanges();
    expect(toggle.getAttribute('aria-expanded')).toBe('false');
  });

  it('switches the theme from a labelled button and remembers it', () => {
    const { fixture, page } = setup();
    const button = page.querySelector<HTMLButtonElement>('.theme-toggle')!;
    document.documentElement.setAttribute('data-theme', 'light');
    fixture.componentInstance['theme'].set('light');
    fixture.detectChanges();
    expect(button.getAttribute('aria-label')).toBe('Cambiar a tema oscuro');
    button.click();
    fixture.detectChanges();
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark');
    expect(localStorage.getItem(themeStorageKey)).toBe('dark');
    expect(button.getAttribute('aria-label')).toBe('Cambiar a tema claro');
  });

  it('gets compact after scrolling and back at the top', () => {
    const { fixture } = setup();
    const component = fixture.componentInstance;
    component.onScroll(compactAfterPx + 1);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList).toContain('compact');
    component.onScroll(0);
    fixture.detectChanges();
    expect(fixture.nativeElement.classList).not.toContain('compact');
  });
});
