import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';

import { AuthService } from './auth.service';

// Un 'guard' decide si se puede entrar a una ruta. Si no, redirige.
// IMPORTANTE: esto solo mejora la experiencia. La seguridad real la hace el backend.

// Solo usuarios con sesión
export const authGuard: CanActivateFn = (_ruta, estado) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.estaLogueado()
    ? true
    : router.createUrlTree(['/login'], { queryParams: { volver: estado.url } });
};

// Solo visitantes (login y registro no tienen sentido si ya entraste)
export const invitadoGuard: CanActivateFn = () => {
  const auth = inject(AuthService);
  const router = inject(Router);
  return auth.estaLogueado() ? router.createUrlTree(['/inicio']) : true;
};

// Solo ciertos roles:  canActivate: [rolGuard('supervisor', 'super_supervisor')]
export const rolGuard = (...roles: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);
    return auth.tieneRol(...roles) ? true : router.createUrlTree(['/inicio']);
  };
};
