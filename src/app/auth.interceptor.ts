import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const credentialEndpoints = ['/api/auth/login', '/api/auth/register'];

// Agrega el token de la sesión a las llamadas a la API y cierra la sesión cuando la API responde 401.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApiCall = request.url.startsWith('/api/');
  // Una petición que ya trae un token (el primer /me del modo supabase) lo conserva.
  const authorized = token && isApiCall && !request.headers.has('Authorization') ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authorized).pipe(
    catchError((error: unknown) => {
      const isCredentialCall = credentialEndpoints.some((path) => request.url.startsWith(path));
      // Solo se cierra la sesión que envió la petición: un 401 tardío no debe terminar una sesión más nueva.
      if (error instanceof HttpErrorResponse && error.status === 401 && token && token === auth.token() && !isCredentialCall) auth.expireSession();
      return throwError(() => error);
    }),
  );
};
