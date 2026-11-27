
import { Routes } from '@angular/router';

import { authGuard, invitadoGuard, rolGuard } from './core/guards';
import { Layout } from './layout/layout';

export const routes: Routes = [
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
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./pages/inicio').then((m) => m.Inicio) },
      { path: 'catalogos', loadComponent: () => import('./pages/catalogos').then((m) => m.Catalogos) },
      { path: 'mi-cuenta', loadComponent: () => import('./pages/mi-cuenta').then((m) => m.MiCuenta) },

      // Cliente
      {
        path: 'solicitudes',
        canActivate: [rolGuard('cliente')],
        children: [
          { path: '', loadComponent: () => import('./pages/cliente/mis-solicitudes').then((m) => m.MisSolicitudes) },
          { path: 'nueva', loadComponent: () => import('./pages/cliente/nueva-solicitud').then((m) => m.NuevaSolicitud) },
          { path: ':id', loadComponent: () => import('./pages/cliente/solicitud-detalle').then((m) => m.SolicitudDetalle) },
        ],
      },

      // Trabajador
      {
        path: 'mi-perfil',
        canActivate: [rolGuard('trabajador')],
        loadComponent: () => import('./pages/trabajador/mi-perfil').then((m) => m.MiPerfil),
      },
      {
        path: 'oportunidades',
        canActivate: [rolGuard('trabajador')],
        children: [
          { path: '', loadComponent: () => import('./pages/trabajador/oportunidades').then((m) => m.Oportunidades) },
          { path: ':id', loadComponent: () => import('./pages/trabajador/oportunidad-detalle').then((m) => m.OportunidadDetalle) },
        ],
      },
      {
        path: 'mis-ofertas',
        canActivate: [rolGuard('trabajador')],
        loadComponent: () => import('./pages/trabajador/mis-ofertas').then((m) => m.MisOfertas),
      },
      {
        path: 'calendario',
        canActivate: [rolGuard('trabajador')],
        loadComponent: () => import('./pages/trabajador/calendario').then((m) => m.CalendarioPagina),
      },
      {
        path: 'reclamos-trabajador',
        canActivate: [rolGuard('trabajador')],
        loadComponent: () => import('./pages/trabajador/reclamos-trabajador').then((m) => m.ReclamosTrabajador),
      },

      // Trabajos
      {
        path: 'trabajos',
        canActivate: [rolGuard('cliente', 'trabajador')],
        children: [
          { path: '', loadComponent: () => import('./pages/mis-trabajos').then((m) => m.MisTrabajos) },
          { path: ':id', loadComponent: () => import('./pages/trabajo-detalle').then((m) => m.VerTrabajo) },
        ],
      },

      // Perfil público
      {
        path: 'trabajadores/:id',
        loadComponent: () => import('./pages/perfil-trabajador').then((m) => m.PerfilTrabajador),
      },

      // Supervisor
      {
        path: 'supervisor',
        canActivate: [rolGuard('supervisor', 'super_supervisor')],
        children: [
          {
            path: 'revision-trabajadores',
            loadComponent: () =>
              import('./pages/supervisor/revision-trabajadores').then((m) => m.RevisionTrabajadores),
          },
          {
            path: 'catalogos',
            loadComponent: () =>
              import('./pages/supervisor/catalogos-admin').then((m) => m.CatalogosAdmin),
          },
         {
  path: 'clasificacion-trabajadores',
  loadComponent: () =>
    import('./pages/supervisor/clasificacion-trabajadores')
      .then((m) => m.ClasificacionTrabajadores),
},
        ],
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
