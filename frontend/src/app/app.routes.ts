import { Routes } from '@angular/router';

import { Layout } from './layout/layout';
import { authGuard, invitadoGuard } from './core/guards';

export const routes: Routes = [
  // Sin sesión
  {
    path: 'login',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: 'registro',
    canActivate: [invitadoGuard],
    loadComponent: () => import('./pages/registro').then((m) => m.Registro),
  },

  // Con sesión: dentro del Layout
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: 'inicio', loadComponent: () => import('./pages/inicio').then((m) => m.Inicio) },
      { path: 'catalogos', loadComponent: () => import('./pages/catalogos').then((m) => m.Catalogos) },
      { path: 'mi-cuenta', loadComponent: () => import('./pages/mi-cuenta').then((m) => m.MiCuenta) },

      // Cliente
      { path: 'solicitudes', loadComponent: () => import('./pages/cliente/mis-solicitudes').then((m) => m.MisSolicitudes) },
      { path: 'solicitudes/nueva', loadComponent: () => import('./pages/cliente/nueva-solicitud').then((m) => m.NuevaSolicitud) },
      { path: 'solicitudes/:id', loadComponent: () => import('./pages/cliente/solicitud-detalle').then((m) => m.SolicitudDetalle) },

      // Cliente y trabajador
      { path: 'trabajos', loadComponent: () => import('./pages/mis-trabajos').then((m) => m.MisTrabajos) },
      { path: 'trabajos/:id', loadComponent: () => import('./pages/trabajo-detalle').then((m) => m.VerTrabajo) },
      { path: 'trabajadores/:id', loadComponent: () => import('./pages/perfil-trabajador').then((m) => m.PerfilTrabajador) },

      // Trabajador
      { path: 'mi-perfil', loadComponent: () => import('./pages/trabajador/mi-perfil').then((m) => m.MiPerfil) },
      { path: 'oportunidades', loadComponent: () => import('./pages/trabajador/oportunidades').then((m) => m.Oportunidades) },
      { path: 'oportunidades/:id', loadComponent: () => import('./pages/trabajador/oportunidad-detalle').then((m) => m.OportunidadDetalle) },
      { path: 'mis-ofertas', loadComponent: () => import('./pages/trabajador/mis-ofertas').then((m) => m.MisOfertas) },
      { path: 'calendario', loadComponent: () => import('./pages/trabajador/calendario').then((m) => m.CalendarioPagina) },
      { path: 'reclamos-trabajador', loadComponent: () => import('./pages/trabajador/reclamos-trabajador').then((m) => m.ReclamosTrabajador) },

      { path: '', redirectTo: 'inicio', pathMatch: 'full' },
    ],
  },

  { path: '**', redirectTo: '' },
];