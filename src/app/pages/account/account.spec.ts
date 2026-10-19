import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiError, ApiService } from '../../api.service';
import { AuthService } from '../../auth.service';
import { writeSession } from '../../session.storage';
import { ConfirmEmailComponent } from './confirm-email.component';
import { ForgotPasswordComponent } from './forgot-password.component';
import { ProfileComponent } from './profile.component';
import { ResetPasswordComponent } from './reset-password.component';

describe('account pages', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = (token = '') => {
    localStorage.clear();
    api = jasmine.createSpyObj<ApiService>('ApiService', ['forgotPassword', 'resetPassword', 'getAccount', 'updateName', 'changePassword', 'requestEmailChange', 'confirmEmailChange', 'me']);
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

  const user = { id: 'u1', name: 'Ana Pérez', email: 'ana2026@correo.co', role: 'customer' as const };
  const openProfile = async () => {
    api.getAccount.and.resolveTo({ ...user, pendingEmail: null });
    const fixture = TestBed.createComponent(ProfileComponent);
    await fixture.componentInstance.ngOnInit();
    return { fixture, page: fixture.componentInstance };
  };

  it('confirms the new email from the link and closes the old session', async () => {
    setup('token-de-confirmacion-largo-1234');
    writeSession({ token: 'viejo', user });
    api.confirmEmailChange.and.resolveTo({ message: 'Tu correo se actualizó. Inicia sesión con el correo nuevo.' });
    const fixture = TestBed.createComponent(ConfirmEmailComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    expect(api.confirmEmailChange).toHaveBeenCalledWith('token-de-confirmacion-largo-1234');
    expect(TestBed.inject(AuthService).token()).toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('a[href="/login"]')).not.toBeNull();
  });

  it('keeps the session and explains when the confirmation link fails or is incomplete', async () => {
    setup('token-de-confirmacion-largo-1234');
    writeSession({ token: 'vigente', user });
    api.confirmEmailChange.and.rejectWith(new ApiError('El enlace no es válido o ya venció. Pide uno nuevo.', 400));
    const fixture = TestBed.createComponent(ConfirmEmailComponent);
    await fixture.componentInstance.ngOnInit();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('[role=alert]')?.textContent).toContain('ya venció');
    expect(TestBed.inject(AuthService).token()).toBe('vigente');

    TestBed.resetTestingModule();
    setup();
    const empty = TestBed.createComponent(ConfirmEmailComponent);
    await empty.componentInstance.ngOnInit();
    expect(empty.componentInstance.failure()).toContain('El enlace está incompleto');
    expect(api.confirmEmailChange).not.toHaveBeenCalled();
  });

  it('changes the name with a new session and refuses an invalid one', async () => {
    setup();
    const { page } = await openProfile();
    page.name.set('Ana 2');
    await page.saveName();
    expect(api.updateName).not.toHaveBeenCalled();
    api.updateName.and.resolveTo({ token: 'token-nombre', user: { ...user, name: 'Ana María Pérez' }, message: 'Tu nombre se actualizó.' });
    page.name.set('  Ana María Pérez ');
    await page.saveName();
    expect(api.updateName).toHaveBeenCalledWith('Ana María Pérez');
    expect(TestBed.inject(AuthService).user()?.name).toBe('Ana María Pérez');
    expect(page.profile()?.name).toBe('Ana María Pérez');
  });

  it('asks for a different email and the current password before sending the link', async () => {
    setup();
    const { page } = await openProfile();
    page.newEmail.set(' ANA2026@correo.co ');
    expect(page.newEmailError()).toBe('Es el mismo correo que ya tienes.');
    page.newEmail.set('Nuevo@Correo.co');
    await page.saveEmail();
    expect(api.requestEmailChange).not.toHaveBeenCalled();

    api.requestEmailChange.and.resolveTo({ message: 'Te enviamos un enlace a nuevo@correo.co.' });
    page.emailPassword.set('cliente12345');
    await page.saveEmail();
    expect(api.requestEmailChange).toHaveBeenCalledWith('nuevo@correo.co', 'cliente12345');
    expect(page.profile()?.pendingEmail).toBe('nuevo@correo.co');
    expect(page.emailPassword()).toBe('');
    expect(page.emailState().message).toContain('Te enviamos un enlace');
  });

  it('shows the API errors of each form and of loading the profile', async () => {
    setup();
    const { page } = await openProfile();
    api.changePassword.and.rejectWith(new ApiError('La contraseña actual no es correcta.', 400));
    page.currentPassword.set('equivocada1');
    page.newPassword.set('nuevaClave2026');
    page.confirmPassword.set('otraClave2026');
    expect(page.confirmError()).toBe('Las contraseñas no coinciden.');
    await page.savePassword();
    expect(api.changePassword).not.toHaveBeenCalled();
    page.confirmPassword.set('nuevaClave2026');
    await page.savePassword();
    expect(page.passwordState()).toEqual({ busy: false, message: '', failure: 'La contraseña actual no es correcta.' });
    expect(page.currentPassword()).toBe('equivocada1', 'the form keeps what was typed after a failure');

    api.getAccount.and.rejectWith(new ApiError('Tu sesión ya no es válida. Vuelve a iniciar sesión.', 401));
    const broken = TestBed.createComponent(ProfileComponent).componentInstance;
    await broken.ngOnInit();
    expect(broken.loadError()).toContain('Vuelve a iniciar sesión');
  });
});
