import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ApiError } from '../../api.service';
import { AuthService } from '../../auth.service';
import { LoginComponent } from './login.component';

describe('LoginComponent', () => {
  let auth: { login: jasmine.Spy; sessionNotice: jasmine.Spy };

  const setup = (notice = '') => {
    auth = { login: jasmine.createSpy('login'), sessionNotice: jasmine.createSpy('sessionNotice').and.returnValue(notice) };
    TestBed.configureTestingModule({ imports: [LoginComponent], providers: [provideRouter([]), { provide: AuthService, useValue: auth }] });
    const fixture = TestBed.createComponent(LoginComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, page, button: page.querySelector<HTMLButtonElement>('button[type=submit]')! };
  };

  it('keeps the button disabled until both fields are filled', () => {
    const { fixture, button } = setup();
    expect(button.disabled).toBeTrue();
    fixture.componentInstance.email.set('ana@correo.co');
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
    fixture.componentInstance.password.set('x');
    fixture.detectChanges();
    expect(button.disabled).toBeFalse();
  });

  it('shows the API message when the credentials are wrong and lets the user try again', async () => {
    const { fixture, page, button } = setup();
    auth.login.and.rejectWith(new ApiError('El correo o la contraseña son incorrectos.', 401));
    fixture.componentInstance.email.set('ana@correo.co');
    fixture.componentInstance.password.set('equivocada');
    await fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(auth.login).toHaveBeenCalledWith('ana@correo.co', 'equivocada');
    expect(page.querySelector('[role=alert]')?.textContent).toBe('El correo o la contraseña son incorrectos.');
    expect(button.disabled).toBeFalse();
    expect(button.textContent).toBe('Iniciar sesión');
  });

  it('shows "Entrando…" while waiting and clears the previous error', async () => {
    const { fixture, button } = setup();
    let finish!: () => void;
    auth.login.and.returnValue(new Promise<void>((resolve) => (finish = resolve)));
    fixture.componentInstance.error.set('Error anterior');
    fixture.componentInstance.email.set('ana@correo.co');
    fixture.componentInstance.password.set('cliente12345');
    const pending = fixture.componentInstance.submit();
    fixture.detectChanges();
    expect(button.textContent).toBe('Entrando…');
    expect(button.disabled).toBeTrue();
    expect(fixture.componentInstance.error()).toBe('');
    finish();
    await pending;
    expect(fixture.componentInstance.loading()).toBeFalse();
  });

  it('shows the notice of an expired session and does not talk about alerts while they are paused', () => {
    const { page } = setup('Tu sesión expiró. Vuelve a iniciar sesión.');
    expect(page.querySelector('.notice[role=status]')?.textContent).toBe('Tu sesión expiró. Vuelve a iniciar sesión.');
    expect(page.textContent).not.toMatch(/alerta|aviso/i);
    expect(page.querySelector('a[href="/forgot-password"]')).not.toBeNull();
  });
});
