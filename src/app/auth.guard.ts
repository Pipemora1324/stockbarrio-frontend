import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// The store panel is only for store owners; the API also checks that each product belongs to their store.
export const storeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user()) return router.createUrlTree(['/login']);
  if (!auth.isStore()) return router.createUrlTree(['/']);
  return true;
};

// Alerts and the notification inbox belong to customer accounts.
export const customerGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user()) return router.createUrlTree(['/login']);
  if (!auth.isCustomer()) return router.createUrlTree(['/']);
  return true;
};

// Any signed-in account (profile page).
export const signedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user() ? true : inject(Router).createUrlTree(['/login']);
};
