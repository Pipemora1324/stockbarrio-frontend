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
