import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { fakeAsync, flushMicrotasks, TestBed, tick } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import type { AuthUser } from './models';
import { LoginComponent } from './pages/login/login.component';
import { RecoverWithCodeComponent } from './pages/account/recover-with-code.component';
import { RegisterComponent } from './pages/register/register.component';
import { SupabaseAuthFailure, SupabaseService, toAuthFailure } from './services/supabase.service';
import { writeSession } from './session.storage';

type Spy = jasmine.Spy;
interface FakeAuth {
  signInWithPassword: Spy;
  signUp: Spy;
  resend: Spy;
  resetPasswordForEmail: Spy;
  verifyOtp: Spy;
  updateUser: Spy;
  signOut: Spy;
  getSession: Spy;
  onAuthStateChange: Spy;
}

const storeUser: AuthUser = { id: 'u1', name: 'Luz', email: 'luz@tienda.co', role: 'store', storeId: 's1' };
const authError = (code: string, status = 400) => Object.assign(new Error(code), { code, status, name: 'AuthApiError' });
const session = (token = 'token-supabase-1') => ({ access_token: token, refresh_token: 'r', expires_in: 3600, token_type: 'bearer', user: { id: 'sb-1' } });

describe('Supabase Auth mode', () => {
  let fake: FakeAuth;
  let stateListener: ((event: string, value: unknown) => void) | null;

  const setup = (query: Record<string, string> = {}, stored?: { token: string; user: AuthUser }) => {
    localStorage.clear();
    if (stored) writeSession(stored);
    stateListener = null;
    fake = {
      signInWithPassword: jasmine.createSpy('signInWithPassword').and.resolveTo({ data: { session: session(), user: {} }, error: null }),
      signUp: jasmine.createSpy('signUp').and.resolveTo({ data: { user: {}, session: null }, error: null }),
      resend: jasmine.createSpy('resend').and.resolveTo({ data: {}, error: null }),
      resetPasswordForEmail: jasmine.createSpy('resetPasswordForEmail').and.resolveTo({ data: {}, error: null }),
      verifyOtp: jasmine.createSpy('verifyOtp').and.resolveTo({ data: { session: session('token-recuperacion') }, error: null }),
      updateUser: jasmine.createSpy('updateUser').and.resolveTo({ data: { user: {} }, error: null }),
      signOut: jasmine.createSpy('signOut').and.resolveTo({ error: null }),
      getSession: jasmine.createSpy('getSession').and.resolveTo({ data: { session: null } }),
      onAuthStateChange: jasmine.createSpy('onAuthStateChange').and.callFake((listener: (event: string, value: unknown) => void) => {
        stateListener = listener;
        return { data: { subscription: { unsubscribe: () => undefined } } };
      }),
    };
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: SupabaseService, useValue: { auth: () => Promise.resolve(fake) } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(query) } } },
      ],
    });
    const router = TestBed.inject(Router);
    return { auth: TestBed.inject(AuthService), backend: TestBed.inject(HttpTestingController), navigate: spyOn(router, 'navigate').and.resolveTo(true) };
  };

  beforeEach(() => {
    environment.authProvider = 'supabase';
  });

  afterEach(() => {
    environment.authProvider = 'legacy';
    localStorage.clear();
  });

  // Lets the awaited supabase promises settle so the next HTTP request is sent.
  const settle = () => new Promise((resolve) => setTimeout(resolve));

  describe('login', () => {
    it('signs in with Supabase and asks the API for the profile with the access token', async () => {
      const { auth, backend, navigate } = setup();
      const pending = auth.login(' Luz@Tienda.CO ', 'tienda12345');
      await settle();
      expect(fake.signInWithPassword).toHaveBeenCalledWith({ email: 'luz@tienda.co', password: 'tienda12345' });
      const me = backend.expectOne('/api/auth/me');
      expect(me.request.headers.get('Authorization')).toBe('Bearer token-supabase-1');
      me.flush({ user: storeUser });
      await pending;
      expect(auth.token()).toBe('token-supabase-1');
      expect(auth.isStore()).toBeTrue();
      expect(navigate).toHaveBeenCalledWith(['/admin']);
    });

    it('explains wrong credentials and keeps no session', async () => {
      const { auth } = setup();
      fake.signInWithPassword.and.resolveTo({ data: { session: null, user: null }, error: authError('invalid_credentials') });
      await expectAsync(auth.login('luz@tienda.co', 'mala')).toBeRejectedWithError('El correo o la contraseña son incorrectos.');
      expect(auth.user()).toBeNull();
    });

    it('closes the Supabase session when the API refuses the profile', async () => {
      const { auth, backend } = setup();
      const pending = auth.login('luz@tienda.co', 'tienda12345').catch((error: Error) => error.message);
      await settle();
      backend.expectOne('/api/auth/me').flush({ message: 'Confirma tu correo con el enlace que te enviamos antes de entrar.' }, { status: 403, statusText: 'Forbidden' });
      expect(await pending).toBe('Confirma tu correo con el enlace que te enviamos antes de entrar.');
      expect(fake.signOut).toHaveBeenCalledWith({ scope: 'local' });
      expect(auth.user()).toBeNull();
    });

    it('offers to resend the confirmation when the email is not confirmed', async () => {
      setup();
      fake.signInWithPassword.and.resolveTo({ data: { session: null }, error: authError('email_not_confirmed') });
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
      fixture.componentInstance.email.set('ana@correo.co');
      fixture.componentInstance.password.set('cliente12345');
      await fixture.componentInstance.submit();
      fixture.detectChanges();
      const page = fixture.nativeElement as HTMLElement;
      expect(page.querySelector('[role=alert]')?.textContent).toContain('Todavía no has confirmado tu correo');
      page.querySelector<HTMLButtonElement>('button.button-light')!.click();
      await settle();
      fixture.detectChanges();
      expect(fake.resend).toHaveBeenCalledWith({ type: 'signup', email: 'ana@correo.co', options: { emailRedirectTo: `${location.origin}/login?confirmado=1` } });
      expect(page.textContent).toContain('Te enviamos otro enlace de confirmación');
    });

    it('shows that the email was confirmed when Supabase sends the person back', () => {
      const { navigate } = setup({ confirmado: '1' });
      const fixture = TestBed.createComponent(LoginComponent);
      fixture.detectChanges();
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Tu correo quedó confirmado. Ya puedes iniciar sesión.');
      expect(navigate).toHaveBeenCalledWith([], jasmine.objectContaining({ queryParams: {}, replaceUrl: true }));
    });
  });

  describe('sign up', () => {
    it('sends the profile as metadata and asks to confirm the email, without opening a session', async () => {
      setup();
      const fixture = TestBed.createComponent(RegisterComponent);
      fixture.detectChanges();
      const page = fixture.componentInstance;
      page.accountType.set('store');
      page.set('name', 'Luz Marina');
      page.set('email', 'Luz@Tienda.co');
      page.set('password', 'tienda12345');
      page.set('storeName', 'Tienda Doña Luz');
      page.set('neighborhood', 'Chapinero');
      page.set('address', 'Calle 57 # 9-20');
      await page.submit();
      fixture.detectChanges();
      expect(fake.signUp).toHaveBeenCalledWith({
        email: 'luz@tienda.co',
        password: 'tienda12345',
        options: {
          data: { name: 'Luz Marina', accountType: 'store', storeName: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57 # 9-20' },
          emailRedirectTo: `${location.origin}/login?confirmado=1`,
        },
      });
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('Te enviamos un enlace a luz@tienda.co');
      expect(TestBed.inject(AuthService).user()).toBeNull();
    });

    it('shows Supabase errors in Spanish', async () => {
      const { auth } = setup();
      fake.signUp.and.resolveTo({ data: { user: null }, error: authError('over_email_send_rate_limit', 429) });
      await expectAsync(auth.register({ email: 'a@b.co', password: 'x' })).toBeRejectedWithError(/Espera unos minutos/);
    });
  });

  describe('password recovery with a code', () => {
    const openCodeStep = async () => {
      const fixture = TestBed.createComponent(RecoverWithCodeComponent);
      fixture.detectChanges();
      const page = fixture.componentInstance;
      page.email.set('ana@correo.co');
      await page.sendCode();
      fixture.detectChanges();
      return { fixture, page };
    };

    it('changes the password with the right code and goes to the login with a notice', async () => {
      const { navigate } = setup();
      const { page, fixture } = await openCodeStep();
      expect(fake.resetPasswordForEmail).toHaveBeenCalledWith('ana@correo.co');
      expect((fixture.nativeElement as HTMLElement).textContent).toContain('te enviamos un código de 6 dígitos');
      page.setCode(' 123 456 ');
      page.password.set('nuevaClave2026');
      page.confirm.set('nuevaClave2026');
      await page.changePassword();
      expect(fake.verifyOtp).toHaveBeenCalledWith({ email: 'ana@correo.co', token: '123456', type: 'recovery' });
      expect(fake.updateUser).toHaveBeenCalledWith({ password: 'nuevaClave2026' });
      expect(fake.signOut).toHaveBeenCalledWith({ scope: 'global' });
      expect(TestBed.inject(AuthService).sessionNotice()).toContain('Tu contraseña se cambió');
      expect(navigate).toHaveBeenCalledWith(['/login']);
    });

    it('keeps the form and explains a wrong or expired code', async () => {
      setup();
      const { page, fixture } = await openCodeStep();
      fake.verifyOtp.and.resolveTo({ data: { session: null }, error: authError('otp_expired', 403) });
      page.setCode('000000');
      page.password.set('nuevaClave2026');
      page.confirm.set('nuevaClave2026');
      await page.changePassword();
      fixture.detectChanges();
      expect(page.failure()).toBe('El código no es válido o ya venció. Pide otro.');
      expect(page.step()).toBe('code');
      expect(fake.updateUser).not.toHaveBeenCalled();
    });

    it('asks for 6 digits and a valid new password before calling Supabase', async () => {
      setup();
      const { page } = await openCodeStep();
      page.setCode('12a4');
      expect(page.code()).toBe('124');
      expect(page.codeError()).toContain('6 dígitos');
      page.setCode('123456');
      page.email.set('ana2026@correo.co');
      page.password.set('ana2026@correo.co');
      expect(page.passwordError()).toContain('igual a tu correo');
      await page.changePassword();
      expect(fake.verifyOtp).not.toHaveBeenCalled();
    });

    it('lets the person ask for another code after waiting', fakeAsync(() => {
      setup();
      const fixture = TestBed.createComponent(RecoverWithCodeComponent);
      fixture.detectChanges();
      const page = fixture.componentInstance;
      page.email.set('ana@correo.co');
      void page.sendCode();
      flushMicrotasks();
      fixture.detectChanges();
      const again = () => (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('.code-actions .button-light')!;
      expect(again().disabled).toBeTrue();
      expect(again().textContent).toContain('Pedir otro código en 60 s');
      tick(60_000);
      fixture.detectChanges();
      expect(again().disabled).toBeFalse();
      again().click();
      flushMicrotasks();
      expect(fake.resetPasswordForEmail).toHaveBeenCalledTimes(2);
      fixture.destroy();
    }));
  });

  describe('session', () => {
    it('closes the stored session on start when Supabase no longer has one', async () => {
      const { auth } = setup({}, { token: 'viejo', user: storeUser });
      expect(auth.user()).not.toBeNull();
      await auth.validateSession();
      expect(auth.user()).toBeNull();
      expect(auth.sessionNotice()).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
    });

    it('updates the token the interceptor sends when Supabase refreshes it, and expires on sign out', async () => {
      const { auth, backend } = setup();
      fake.getSession.and.resolveTo({ data: { session: session('token-a') } });
      const pending = auth.validateSession();
      await settle();
      backend.expectOne('/api/auth/me').flush({ user: storeUser });
      await pending;
      await settle();
      expect(auth.token()).toBe('token-a');
      stateListener!('TOKEN_REFRESHED', session('token-b'));
      expect(auth.token()).toBe('token-b');
      stateListener!('SIGNED_OUT', null);
      expect(auth.user()).toBeNull();
      expect(auth.sessionNotice()).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
    });
  });

  describe('profile', () => {
    it('checks the current password, changes it in Supabase and closes the other sessions', async () => {
      const { auth } = setup({}, { token: 'token-a', user: storeUser });
      const message = await auth.changePassword('tienda12345', 'nuevaClave2026');
      expect(fake.signInWithPassword).toHaveBeenCalledWith({ email: 'luz@tienda.co', password: 'tienda12345' });
      expect(fake.updateUser).toHaveBeenCalledWith({ password: 'nuevaClave2026' });
      expect(fake.signOut).toHaveBeenCalledWith({ scope: 'others' });
      expect(message).toContain('Tu contraseña se cambió');

      fake.signInWithPassword.and.resolveTo({ data: {}, error: authError('invalid_credentials') });
      await expectAsync(auth.changePassword('mala', 'otraClave2026')).toBeRejectedWithError('La contraseña actual no es correcta.');
    });

    it('changes the email through Supabase with a confirmation link', async () => {
      const { auth } = setup({}, { token: 'token-a', user: storeUser });
      const message = await auth.requestEmailChange('nuevo@tienda.co', 'tienda12345');
      expect(fake.updateUser).toHaveBeenCalledWith({ email: 'nuevo@tienda.co' }, { emailRedirectTo: `${location.origin}/login?correo=1` });
      expect(message).toContain('Te enviamos un enlace a nuevo@tienda.co');
    });

    it('changes the name in the API and keeps the Supabase token', async () => {
      const { auth, backend } = setup({}, { token: 'token-a', user: storeUser });
      const pending = auth.updateName('Luz Marina');
      const request = backend.expectOne('/api/account/name');
      expect(request.request.headers.get('Authorization')).toBe('Bearer token-a');
      request.flush({ user: { ...storeUser, name: 'Luz Marina' }, message: 'Tu nombre se actualizó.' });
      expect(await pending).toBe('Tu nombre se actualizó.');
      expect([auth.token(), auth.user()?.name]).toEqual(['token-a', 'Luz Marina']);
    });
  });

  it('translates network failures and unknown errors', () => {
    expect(toAuthFailure({ name: 'AuthRetryableFetchError', status: 0 }).message).toContain('No se pudo conectar');
    expect(toAuthFailure({ code: 'algo_raro' })).toEqual(jasmine.any(SupabaseAuthFailure));
    expect(toAuthFailure({ status: 429 }).code).toBe('over_request_rate_limit');
  });
});
