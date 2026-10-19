import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { storeGuard } from './auth.guard';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import type { AuthUser } from './models';
import { writeSession } from './session.storage';

const storeUser: AuthUser = { id: 'u1', name: 'Luz', role: 'store', storeId: 's1' };

const setup = (user: AuthUser | null) => {
  localStorage.clear();
  if (user) writeSession({ token: 'token-1', user });
  TestBed.configureTestingModule({
    providers: [provideRouter([]), provideHttpClient(withInterceptors([authInterceptor])), provideHttpClientTesting()],
  });
  return { auth: TestBed.inject(AuthService), http: TestBed.inject(HttpClient), backend: TestBed.inject(HttpTestingController), router: TestBed.inject(Router) };
};

const runGuard = () => TestBed.runInInjectionContext(() => storeGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));

describe('storeGuard', () => {
  afterEach(() => localStorage.clear());

  it('sends visitors without a session to the login page', () => {
    const { router } = setup(null);
    expect(router.serializeUrl(runGuard() as UrlTree)).toBe('/login');
  });

  it('keeps admins out of the store panel', () => {
    const { router } = setup({ id: 'a1', name: 'Admin', role: 'admin' });
    expect(router.serializeUrl(runGuard() as UrlTree)).toBe('/');
  });

  it('lets store owners in', () => {
    setup(storeUser);
    expect(runGuard()).toBeTrue();
  });
});

describe('authInterceptor', () => {
  afterEach(() => localStorage.clear());

  it('adds the token to API calls', async () => {
    const { http, backend } = setup(storeUser);
    const pending = firstValueFrom(http.get('/api/products/mine'));
    const request = backend.expectOne('/api/products/mine');
    expect(request.request.headers.get('Authorization')).toBe('Bearer token-1');
    request.flush({ data: [] });
    await pending;
  });

  it('closes the session and goes to login on a 401', async () => {
    const { http, backend, auth, router } = setup(storeUser);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const pending = firstValueFrom(http.get('/api/products/mine')).catch(() => undefined);
    backend.expectOne('/api/products/mine').flush({ message: 'caducó' }, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('stockbarrios-token')).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does not close the session for a failed login attempt', async () => {
    const { http, backend, auth } = setup(storeUser);
    const pending = firstValueFrom(http.post('/api/auth/login', {})).catch(() => undefined);
    backend.expectOne('/api/auth/login').flush({ message: 'incorrecto' }, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(auth.user()).not.toBeNull();
  });
});

describe('AuthService.validateSession', () => {
  afterEach(() => localStorage.clear());

  it('refreshes the stored user when the token is valid', async () => {
    const { auth, backend } = setup({ ...storeUser, storeId: undefined });
    const pending = auth.validateSession();
    backend.expectOne('/api/auth/me').flush({ user: storeUser });
    await pending;
    expect(auth.user()?.storeId).toBe('s1');
  });

  it('keeps the session when the API cannot be reached', async () => {
    const { auth, backend } = setup(storeUser);
    const pending = auth.validateSession();
    backend.expectOne('/api/auth/me').error(new ProgressEvent('error'), { status: 0 });
    await pending;
    expect(auth.user()).not.toBeNull();
  });

  it('closes the session when the API rejects the token', async () => {
    const { auth, backend, router } = setup(storeUser);
    spyOn(router, 'navigate').and.resolveTo(true);
    const pending = auth.validateSession();
    backend.expectOne('/api/auth/me').flush({ message: 'inválido' }, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(auth.user()).toBeNull();
  });
});
