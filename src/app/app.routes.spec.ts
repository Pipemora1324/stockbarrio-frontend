import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { routes } from './app.routes';
import { signedInGuard, storeGuard } from './auth.guard';
import type { AuthUser } from './models';
import { writeSession } from './session.storage';

describe('app routes', () => {
  afterEach(() => localStorage.clear());

  const navigate = async (url: string, user: AuthUser | null) => {
    localStorage.clear();
    if (user) writeSession({ token: 't', user });
    TestBed.configureTestingModule({ providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()] });
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl(url);
    return TestBed.inject(Router).url;
  };

  it('protects the store panel and the profile with their guards', () => {
    const byPath = new Map(routes.map((route) => [route.path, route]));
    expect(byPath.get('admin')?.canActivate).toEqual([storeGuard]);
    expect(byPath.get('perfil')?.canActivate).toEqual([signedInGuard]);
    for (const open of ['', 'catalogo', 'ofertas', 'chat', 'login', 'register', 'forgot-password', 'reset-password', 'confirm-email'])
      expect(byPath.get(open)?.canActivate).withContext(open).toBeUndefined();
  });

  it('loads every lazy page and gives each one a Spanish title', async () => {
    for (const route of routes.filter((item) => item.loadComponent)) {
      expect(typeof (await route.loadComponent!())).withContext(route.path!).toBe('function');
      expect(String(route.title)).withContext(route.path!).toMatch(/· StockBarrio$/);
    }
  });

  it('sends visitors to the login and customers to the home page when they open the store panel', async () => {
    expect(await navigate('/admin', null)).toBe('/login');
    TestBed.resetTestingModule();
    expect(await navigate('/admin', { id: 'c1', name: 'Ana', role: 'customer' })).toBe('/');
    TestBed.resetTestingModule();
    expect(await navigate('/perfil', null)).toBe('/login');
  });

  it('sends unknown addresses to the home page', async () => {
    expect(await navigate('/no-existe/para-nada', null)).toBe('/');
  });
});
