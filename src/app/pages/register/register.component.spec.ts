import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ApiError, ApiService } from '../../api.service';
import { emailTakenMessage, plusAliasMessage } from '../../validation/rules';
import { AuthService } from '../../auth.service';
import { RegisterComponent } from './register.component';

describe('RegisterComponent', () => {
  let register: jasmine.Spy;
  let checkEmail: jasmine.Spy;
  let resendConfirmation: jasmine.Spy;

  const setup = (tipo?: string) => {
    register = jasmine.createSpy('register').and.resolveTo();
    checkEmail = jasmine.createSpy('checkEmail').and.resolveTo({ available: true });
    resendConfirmation = jasmine.createSpy('resendConfirmation').and.resolveTo();
    TestBed.configureTestingModule({
      imports: [RegisterComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { register, resendConfirmation } },
        { provide: ApiService, useValue: { checkEmail } },
        { provide: ActivatedRoute, useValue: { snapshot: { queryParamMap: convertToParamMap(tipo ? { tipo } : {}) } } },
      ],
    });
    const fixture = TestBed.createComponent(RegisterComponent);
    fixture.detectChanges();
    const page = fixture.nativeElement as HTMLElement;
    return { fixture, page, component: fixture.componentInstance, button: () => page.querySelector<HTMLButtonElement>('button[type=submit]')! };
  };

  const fillCustomer = (component: RegisterComponent) => {
    component.set('name', '  Ana Pérez ');
    component.set('email', ' Ana@Correo.CO ');
    component.set('password', 'cliente12345');
  };

  it('starts as a customer and registers without store fields', async () => {
    const { fixture, component, page, button } = setup();
    expect(page.querySelector('#register-store')).toBeNull();
    expect(button().disabled).toBeTrue();
    fillCustomer(component);
    fixture.detectChanges();
    expect(button().disabled).toBeFalse();
    await component.submit();
    expect(register).toHaveBeenCalledOnceWith({ name: 'Ana Pérez', email: 'ana@correo.co', password: 'cliente12345', accountType: 'customer' });
  });

  it('opens the store form from ?tipo=tienda and asks for the store data', async () => {
    const { fixture, component, page, button } = setup('tienda');
    expect(component.isStore()).toBeTrue();
    expect(page.querySelector('#register-store')).not.toBeNull();
    fillCustomer(component);
    fixture.detectChanges();
    expect(button().disabled).toBeTrue();
    component.set('storeName', ' Tienda Doña Luz ');
    component.set('neighborhood', 'Chapinero');
    component.set('address', 'Calle 57 # 9-20');
    fixture.detectChanges();
    expect(button().disabled).toBeFalse();
    await component.submit();
    expect(register).toHaveBeenCalledOnceWith({
      name: 'Ana Pérez', email: 'ana@correo.co', password: 'cliente12345', accountType: 'store', storeName: 'Tienda Doña Luz', neighborhood: 'Chapinero', address: 'Calle 57 # 9-20',
    });
  });

  it('sends the phone only when it is filled and rejects a bad one', async () => {
    const { component } = setup('tienda');
    fillCustomer(component);
    component.set('storeName', 'Tienda Doña Luz');
    component.set('neighborhood', 'Chapinero');
    component.set('address', 'Calle 57 # 9-20');
    component.set('phone', '123');
    expect(component.invalid()).toBeTrue();
    component.set('phone', ' 310 123 4567 ');
    expect(component.invalid()).toBeFalse();
    await component.submit();
    expect(register.calls.mostRecent().args[0].phone).toBe('310 123 4567');
  });

  it('shows each message only after leaving the field', () => {
    const { fixture, component, page } = setup();
    component.set('email', 'no-es-un-correo');
    fixture.detectChanges();
    expect(page.querySelector('#register-email-error')).toBeNull();
    component.touch('email');
    fixture.detectChanges();
    expect(page.querySelector('#register-email-error')?.textContent?.trim()).toBeTruthy();
    expect(page.querySelector('#register-email')?.getAttribute('aria-invalid')).toBe('true');
  });

  it('rejects a password equal to the email', () => {
    const { component } = setup();
    component.set('name', 'Ana Pérez');
    component.set('email', 'ana12345@correo.co');
    component.set('password', 'ana12345@correo.co');
    expect(component.errors().password).toBeTruthy();
    expect(component.invalid()).toBeTrue();
  });

  it('does not call the API while the form is invalid and shows an API error', async () => {
    const { fixture, component, page } = setup();
    await component.submit();
    expect(register).not.toHaveBeenCalled();
    fillCustomer(component);
    register.and.rejectWith(new ApiError('Este correo electrónico ya está registrado.', 409));
    await component.submit();
    fixture.detectChanges();
    expect(page.querySelector('[role=alert]')?.textContent).toBe('Este correo electrónico ya está registrado.');
    expect(component.loading()).toBeFalse();
  });

  it('does not mention alerts while they are paused', () => {
    const { page } = setup();
    expect(page.textContent).not.toMatch(/alerta|aviso/i);
  });

  describe('one email, one account', () => {
    it('checks the email before creating the account and stops when it already has one', async () => {
      const { fixture, component, page } = setup();
      fillCustomer(component);
      checkEmail.and.resolveTo({ available: false, message: emailTakenMessage });
      await component.submit();
      fixture.detectChanges();
      expect(checkEmail).toHaveBeenCalledWith('ana@correo.co');
      expect(register).not.toHaveBeenCalled();
      expect(page.querySelector('[role=alert]')?.textContent).toBe(emailTakenMessage);
      expect(page.querySelector('.taken-actions a[href="/login"]')).not.toBeNull();
      expect(page.querySelector('.taken-actions a[href="/forgot-password"]')).not.toBeNull();
    });

    it('shows the same message and the links when the sign up itself says the email is taken', async () => {
      const { fixture, component, page } = setup();
      fillCustomer(component);
      register.and.rejectWith(new Error(emailTakenMessage));
      await component.submit();
      fixture.detectChanges();
      expect(page.querySelector('.taken-actions')).not.toBeNull();
    });

    it('does not accept "+" aliases', () => {
      const { component } = setup();
      component.set('email', 'ana+compras@correo.co');
      expect(component.errors().email).toBe(plusAliasMessage);
      component.set('email', 'ana@correo.co');
      expect(component.errors().email).toBe('');
    });

    it('saves the email trimmed and in lowercase when leaving the field', async () => {
      const { fixture, page, component } = setup();
      await fixture.whenStable();
      const input = page.querySelector<HTMLInputElement>('#register-email')!;
      input.value = '  Ana.Perez@Gmail.COM ';
      input.dispatchEvent(new Event('input'));
      input.dispatchEvent(new Event('blur'));
      fixture.detectChanges();
      expect(component.values().email).toBe('ana.perez@gmail.com');
    });

    it('says the confirmation email was already sent for an account that exists unconfirmed, and resends it', async () => {
      const { fixture, component, page } = setup();
      fillCustomer(component);
      register.and.resolveTo('already-pending');
      await component.submit();
      fixture.detectChanges();
      expect(page.querySelector('.confirm-state h2')?.textContent).toBe('Ya te enviamos un correo de confirmación');
      page.querySelector<HTMLButtonElement>('.confirm-state button')!.click();
      await fixture.whenStable();
      fixture.detectChanges();
      expect(resendConfirmation).toHaveBeenCalledWith('ana@correo.co');
      expect(page.textContent).toContain('Te enviamos de nuevo el correo de confirmación.');
    });
  });
});
