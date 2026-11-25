import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';

import { AuthService } from './auth.service';
import { API_URL } from './config';

// Un 'interceptor' se mete en TODAS las peticiones al backend.
// 1) Les agrega el token (Authorization: Bearer ...) para no repetirlo en cada llamada.
// 2) Si el servidor responde 401 (token vencido o inválido), cierra la sesión.
export const authInterceptor: HttpInterceptorFn = (peticion, siguiente) => {
  const auth = inject(AuthService);
  const token = auth.token();

  const conToken =
    token && peticion.url.startsWith(API_URL)
      ? peticion.clone({ setHeaders: { Authorization: `Bearer ${token}` } })
      : peticion;

  return siguiente(conToken).pipe(
    catchError((error: HttpErrorResponse) => {
      const esLogin = peticion.url.endsWith('/auth/login');
      if (error.status === 401 && !esLogin) auth.cerrarSesion(true);
      return throwError(() => error);
    }),
  );
};
