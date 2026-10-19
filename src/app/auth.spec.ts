import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { customerGuard, signedInGuard, storeGuard } from './auth.guard';
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

const runGuard = (guard = storeGuard) => TestBed.runInInjectionContext(() => guard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
const customer: AuthUser = { id: 'c1', name: 'Ana', role: 'customer' };

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

describe('customerGuard and signedInGuard', () => {
  afterEach(() => localStorage.clear());

  it('keeps stores out of the customer pages and visitors out of both', () => {
    let { router } = setup(storeUser);
    expect(router.serializeUrl(runGuard(customerGuard) as UrlTree)).toBe('/');
    expect(runGuard(signedInGuard)).toBeTrue();
    TestBed.resetTestingModule();
    ({ router } = setup(null));
    expect(router.serializeUrl(runGuard(customerGuard) as UrlTree)).toBe('/login');
    expect(router.serializeUrl(runGuard(signedInGuard) as UrlTree)).toBe('/login');
  });

  it('lets customers in and keeps them out of the store panel', () => {
    const { router } = setup(customer);
    expect(runGuard(customerGuard)).toBeTrue();
    expect(router.serializeUrl(runGuard(storeGuard) as UrlTree)).toBe('/');
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

  it('does not close a newer session when an older request answers 401', async () => {
    const { http, backend, auth } = setup(storeUser);
    const pending = firstValueFrom(http.get('/api/products/mine')).catch(() => undefined);
    auth.replaceSession('token-2', storeUser);
    backend.expectOne('/api/products/mine').flush({ message: 'caducó' }, { status: 401, statusText: 'Unauthorized' });
    await pending;
    expect(auth.token()).toBe('token-2');
  });

  it('does not add the token to calls outside the API', async () => {
    const { http, backend } = setup(storeUser);
    const pending = firstValueFrom(http.get('https://tiles.example.com/1/2/3.png'));
    const request = backend.expectOne('https://tiles.example.com/1/2/3.png');
    expect(request.request.headers.has('Authorization')).toBeFalse();
    request.flush({});
    await pending;
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

describe('AuthService sessions', () => {
  afterEach(() => localStorage.clear());

  it('saves the session after login and sends each role to its home', async () => {
    const { auth, backend, router } = setup(null);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    const pending = auth.login('luz@tienda.co', 'tienda12345');
    const request = backend.expectOne('/api/auth/login');
    expect(request.request.body).toEqual({ email: 'luz@tienda.co', password: 'tienda12345' });
    request.flush({ token: 'nuevo', user: storeUser });
    await pending;
    expect(auth.isStore()).toBeTrue();
    expect(localStorage.getItem('stockbarrios-token')).toBe('nuevo');
    expect(navigate).toHaveBeenCalledWith(['/admin']);
  });

  it('keeps no session when the login fails', async () => {
    const { auth, backend } = setup(null);
    const pending = auth.login('luz@tienda.co', 'mala').catch((error: Error) => error.message);
    backend.expectOne('/api/auth/login').flush({ message: 'El correo o la contraseña son incorrectos.' }, { status: 401, statusText: 'Unauthorized' });
    expect(await pending).toBe('El correo o la contraseña son incorrectos.');
    expect(auth.user()).toBeNull();
    expect(localStorage.getItem('stockbarrios-token')).toBeNull();
  });

  it('clears a previous expiration notice after signing in again', async () => {
    const { auth, backend, router } = setup(storeUser);
    spyOn(router, 'navigate').and.resolveTo(true);
    auth.expireSession();
    expect(auth.sessionNotice()).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
    const pending = auth.register({ accountType: 'customer', name: 'Ana', email: 'ana@correo.co', password: 'cliente12345' });
    backend.expectOne('/api/auth/register').flush({ token: 't', user: customer });
    await pending;
    expect(auth.sessionNotice()).toBe('');
    expect(auth.isCustomer()).toBeTrue();
  });

  it('logs out to the home page and signs out with a notice to the login page', () => {
    const { auth, router } = setup(storeUser);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    auth.logout();
    expect(auth.user()).toBeNull();
    expect(navigate).toHaveBeenCalledWith(['/']);
    auth.replaceSession('t2', customer);
    auth.signOutWithNotice('Tu correo cambió.');
    expect(auth.token()).toBeNull();
    expect(auth.sessionNotice()).toBe('Tu correo cambió.');
    expect(navigate).toHaveBeenCalledWith(['/login']);
  });

  it('does nothing when an expired session is closed twice', () => {
    const { auth, router } = setup(null);
    const navigate = spyOn(router, 'navigate').and.resolveTo(true);
    auth.expireSession();
    expect(navigate).not.toHaveBeenCalled();
    expect(auth.sessionNotice()).toBe('');
  });
});
