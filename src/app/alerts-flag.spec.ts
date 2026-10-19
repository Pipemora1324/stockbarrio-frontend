import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { environment } from '../environments/environment';
import { routes } from './app.routes';
import { AuthService } from './auth.service';
import { HeaderComponent } from './components/header/header.component';
import type { AuthUser } from './models';
import { writeSession } from './session.storage';

const customer: AuthUser = { id: 'c1', name: 'Cliente', role: 'customer' };

describe('alerts paused (enableAlerts = false)', () => {
  const setup = (user: AuthUser | null) => {
    localStorage.clear();
    if (user) writeSession({ token: 't', user });
    TestBed.configureTestingModule({ imports: [HeaderComponent], providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
  };

  afterEach(() => {
    localStorage.clear();
    environment.enableAlerts = false;
  });

  it('is the default', () => {
    expect(environment.enableAlerts).toBeFalse();
  });

  it('shows no bell and no link to alerts for customers', () => {
    setup(customer);
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    const header = fixture.nativeElement as HTMLElement;
    expect(header.querySelector('.bell')).toBeNull();
    expect(header.querySelector('a[href="/alertas"]')).toBeNull();
    expect(header.querySelector('a[href="/notificaciones"]')).toBeNull();
    expect(header.textContent).not.toContain('alertas');
    expect(header.querySelector('a[href="/ofertas"]')).not.toBeNull();
  });

  it('does not register the alert and inbox pages', () => {
    const paths = routes.map((route) => route.path);
    expect(paths).not.toContain('alertas');
    expect(paths).not.toContain('notificaciones');
    expect(paths).toContain('ofertas');
  });

  it('sends customers to Offers after signing in', async () => {
    setup(null);
    const navigate = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const auth = TestBed.inject(AuthService);
    const pending = auth.login('cliente@correo.co', 'cliente12345');
    TestBed.inject(HttpTestingController).expectOne('/api/auth/login').flush({ token: 't', user: customer });
    await pending;
    expect(navigate).toHaveBeenCalledWith(['/ofertas']);
  });

  it('brings the bell back when the flag is turned on', () => {
    environment.enableAlerts = true;
    setup(customer);
    const fixture = TestBed.createComponent(HeaderComponent);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('.bell')).not.toBeNull();
  });
});
