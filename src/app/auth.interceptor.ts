import { HttpErrorResponse, type HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { AuthService } from './auth.service';

const credentialEndpoints = ['/api/auth/login', '/api/auth/register'];

// Adds the session token to API calls and closes the session when the API answers 401.
export const authInterceptor: HttpInterceptorFn = (request, next) => {
  const auth = inject(AuthService);
  const token = auth.token();
  const isApiCall = request.url.startsWith('/api/');
  const authorized = token && isApiCall ? request.clone({ setHeaders: { Authorization: `Bearer ${token}` } }) : request;
  return next(authorized).pipe(
    catchError((error: unknown) => {
      const isCredentialCall = credentialEndpoints.some((path) => request.url.startsWith(path));
      // Only the session that sent the request is closed: a late 401 must not end a newer session.
      if (error instanceof HttpErrorResponse && error.status === 401 && token && token === auth.token() && !isCredentialCall) auth.expireSession();
      return throwError(() => error);
    }),
  );
};
