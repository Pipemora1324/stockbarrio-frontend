import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from './auth.service';

// El panel es solo para dueños de tiendas; la API además comprueba que cada producto sea de sus locales.
export const storeGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  if (!auth.user()) return router.createUrlTree(['/login']);
  if (!auth.isStore()) return router.createUrlTree(['/']);
  return true;
};

// Cualquier cuenta con sesión (página de perfil).
export const signedInGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  return auth.user() ? true : inject(Router).createUrlTree(['/login']);
};
