import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree, type ActivatedRouteSnapshot, type RouterStateSnapshot } from '@angular/router';
import { ApiService } from '../api.service';
import { customerGuard } from '../auth.guard';
import type { AuthUser } from '../models';
import { writeSession } from '../session.storage';
import { NotificationsService } from './notifications.service';

const customer: AuthUser = { id: 'c1', name: 'Cliente', role: 'customer' };

describe('NotificationsService', () => {
  let api: jasmine.SpyObj<ApiService>;

  const setup = (user: AuthUser | null) => {
    localStorage.clear();
    if (user) writeSession({ token: 't', user });
    api = jasmine.createSpyObj<ApiService>('ApiService', ['getUnreadCount', 'me']);
    api.getUnreadCount.and.resolveTo(3);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: ApiService, useValue: api }] });
    const service = TestBed.inject(NotificationsService);
    TestBed.flushEffects();
    return service;
  };

  afterEach(() => {
    TestBed.inject(NotificationsService).ngOnDestroy();
    localStorage.clear();
  });

  it('loads the unread counter for customers', async () => {
    const service = setup(customer);
    await Promise.resolve();
    await Promise.resolve();
    expect(api.getUnreadCount).toHaveBeenCalled();
    expect(service.unread()).toBe(3);
  });

  it('does not ask the API for stores or visitors', () => {
    setup({ id: 's1', name: 'Tienda', role: 'store' });
    expect(api.getUnreadCount).not.toHaveBeenCalled();
  });

  it('keeps the last value when a refresh fails', async () => {
    const service = setup(customer);
    await service.refresh();
    service.setUnread(5);
    api.getUnreadCount.and.rejectWith(new Error('sin conexión'));
    await service.refresh();
    expect(service.unread()).toBe(5);
  });
});

describe('customerGuard', () => {
  afterEach(() => localStorage.clear());

  const run = (user: AuthUser | null) => {
    localStorage.clear();
    if (user) writeSession({ token: 't', user });
    TestBed.configureTestingModule({ providers: [provideRouter([]), provideHttpClient(), provideHttpClientTesting()] });
    const result = TestBed.runInInjectionContext(() => customerGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot));
    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : result;
  };

  it('sends visitors to the login page', () => expect(run(null)).toBe('/login'));
  it('keeps stores out', () => expect(run({ id: 's1', name: 'Tienda', role: 'store' })).toBe('/'));
  it('lets customers in', () => expect(run(customer)).toBeTrue());
});
