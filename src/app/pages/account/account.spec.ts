import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ProfileComponent } from './profile.component';
import { ResetPasswordComponent } from './reset-password.component';

describe('account pages', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = (token = '') => {
    localStorage.clear();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['forgotPassword', 'resetPassword', 'getAccount', 'updateName', 'changePassword', 'requestEmailChange', 'me']);
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: ApiService, useValue: api },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(token ? { token } : {}) } } },
      ],
    });
  };

  it('asks for a valid email and shows the generic answer', async () => {
    setup();
    api.forgotPassword.and.resolveTo({ message: 'Si el correo está registrado, te enviamos un enlace.' });
    const fixture = TestBed.createComponent(ForgotPasswordComponent);
    fixture.detectChanges();
    const button = (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button[type=submit]')!;
    expect(button.disabled).toBeTrue();
    fixture.componentInstance.email.set(' Ana@Correo.co ');
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(api.forgotPassword).toHaveBeenCalledWith('ana@correo.co');
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Si el correo está registrado');
  });

  it('requires matching passwords and sends the user to the login with a notice', async () => {
    setup('token-de-prueba-de-mas-de-veinte');
    api.resetPassword.and.resolveTo({ message: 'Tu contraseña se cambió.' });
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    const page = fixture.componentInstance;
    page.password.set('nuevaClave2026');
    page.confirm.set('otraClave2026');
    expect(page.invalid()).toBeTrue();
    page.confirm.set('nuevaClave2026');
    expect(page.invalid()).toBeFalse();
    const auth = TestBed.inject(AuthService);
    const signOut = spyOn(auth, 'signOutWithNotice');
    await page.submit();
    expect(api.resetPassword).toHaveBeenCalledWith('token-de-prueba-de-mas-de-veinte', 'nuevaClave2026');
    expect(signOut).toHaveBeenCalledWith('Tu contraseña se cambió.');
  });

  it('explains when the reset link has no token', () => {
    setup();
    const fixture = TestBed.createComponent(ResetPasswordComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('El enlace está incompleto');
  });

  it('keeps the session with the new token after changing the password', async () => {
    setup();
    const user = { id: 'u1', name: 'Ana Pérez', email: 'ana2026@correo.co', role: 'customer' as const };
    api.getAccount.and.resolveTo({ ...user, pendingEmail: null });
    api.changePassword.and.resolveTo({ token: 'token-nuevo', user, message: 'Tu contraseña se cambió.' });
    const fixture = TestBed.createComponent(ProfileComponent);
    await fixture.componentInstance.ngOnInit();
    const page = fixture.componentInstance;
    page.currentPassword.set('cliente12345');
    page.newPassword.set('ana2026@correo.co');
    expect(page.newPasswordError()).toContain('igual a tu correo');
    page.newPassword.set('nuevaClave2026');
    page.confirmPassword.set('nuevaClave2026');
    expect(page.passwordInvalid()).toBeFalse();
    await page.savePassword();
    expect(TestBed.inject(AuthService).token()).toBe('token-nuevo');
    expect(page.passwordState().message).toBe('Tu contraseña se cambió.');
    expect(page.currentPassword()).toBe('');
  });
});
