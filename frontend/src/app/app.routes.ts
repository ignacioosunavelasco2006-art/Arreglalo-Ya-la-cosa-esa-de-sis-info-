import { Routes } from '@angular/router';

import { authGuard, invitadoGuard, rolGuard } from './core/guards';
import { Layout } from './layout/layout';

// Mapa de URLs -> pantallas.
// loadComponent = "carga perezosa": la pantalla se descarga solo cuando alguien entra a ella.
// ORDEN: dentro de un grupo, las rutas fijas ("nueva") van antes que las que llevan parámetro (":id").
export const routes: Routes = [
  // Públicas (solo para quien NO ha iniciado sesión)
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

  // Privadas: todas dentro del Layout (barra superior) y protegidas por authGuard
  {
    path: '',
    component: Layout,
    canActivate: [authGuard],
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'inicio' },
      { path: 'inicio', loadComponent: () => import('./pages/inicio').then((m) => m.Inicio) },
      { path: 'catalogos', loadComponent: () => import('./pages/catalogos').then((m) => m.Catalogos) },
      { path: 'mi-cuenta', loadComponent: () => import('./pages/mi-cuenta').then((m) => m.MiCuenta) },

      // ---------- Cliente ----------
      {
        path: 'solicitudes',
        canActivate: [rolGuard('cliente')],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/cliente/mis-solicitudes').then((m) => m.MisSolicitudes),
          },
          {
            path: 'nueva',
            loadComponent: () => import('./pages/cliente/nueva-solicitud').then((m) => m.NuevaSolicitud),
          },
          {
            path: ':id',
            loadComponent: () => import('./pages/cliente/solicitud-detalle').then((m) => m.SolicitudDetalle),
          },
        ],
      },

      // ---------- Trabajador ----------
      {
        path: 'mi-perfil',
        canActivate: [rolGuard('trabajador')],
        loadComponent: () => import('./pages/trabajador/mi-perfil').then((m) => m.MiPerfil),
      },
      {
        path: 'oportunidades',
        canActivate: [rolGuard('trabajador')],
        children: [
          {
            path: '',
            loadComponent: () => import('./pages/trabajador/oportunidades').then((m) => m.Oportunidades),
          },
          {
            path: ':id',
            loadComponent: () =>
              import('./pages/trabajador/oportunidad-detalle').then((m) => m.OportunidadDetalle),
          },
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
        loadComponent: () =>
          import('./pages/trabajador/reclamos-trabajador').then((m) => m.ReclamosTrabajador),
      },

      // ---------- Trabajos (cliente y trabajador) ----------
      {
        path: 'trabajos',
        canActivate: [rolGuard('cliente', 'trabajador')],
        children: [
          { path: '', loadComponent: () => import('./pages/mis-trabajos').then((m) => m.MisTrabajos) },
          { path: ':id', loadComponent: () => import('./pages/trabajo-detalle').then((m) => m.VerTrabajo) },
        ],
      },

      // ---------- Perfil público de un trabajador (cualquier usuario con sesión) ----------
      {
        path: 'trabajadores/:id',
        loadComponent: () => import('./pages/perfil-trabajador').then((m) => m.PerfilTrabajador),
      },

      // ---------- Panel de rendimiento (trabajador: el suyo; supervisión: todos) ----------
      {
        path: 'rendimiento',
        canActivate: [rolGuard('trabajador', 'supervisor', 'super_supervisor')],
        loadComponent: () => import('./pages/rendimiento').then((m) => m.Rendimiento),
      },

      // ---------- Reclamos del cliente (RF-29). "nuevo" va antes que ":id" ----------
      {
        path: 'reclamos',
        canActivate: [rolGuard('cliente')],
        children: [
          { path: '', loadComponent: () => import('./pages/cliente/mis-reclamos').then((m) => m.MisReclamos) },
          { path: 'nuevo', loadComponent: () => import('./pages/cliente/reclamo-nuevo').then((m) => m.ReclamoNuevo) },
          { path: ':id', loadComponent: () => import('./pages/cliente/reclamo-detalle').then((m) => m.ReclamoDetalle) },
        ],
      },

      // ---------- Supervisor y super supervisor ----------
      {
        path: 'supervisor',
        canActivate: [rolGuard('supervisor', 'super_supervisor')],
        children: [
          { path: 'trabajadores', loadComponent: () => import('./pages/supervisor/trabajadores-cola').then((m) => m.TrabajadoresCola) },
          { path: 'trabajadores/:id', loadComponent: () => import('./pages/supervisor/trabajador-revision').then((m) => m.TrabajadorRevision) },
          { path: 'reclamos', loadComponent: () => import('./pages/supervisor/reclamos-lista').then((m) => m.ReclamosLista) },
          { path: 'reclamos/:id', loadComponent: () => import('./pages/supervisor/reclamo-caso').then((m) => m.ReclamoCaso) },
          { path: 'devoluciones', loadComponent: () => import('./pages/supervisor/devoluciones').then((m) => m.Devoluciones) },
          { path: 'sanciones', loadComponent: () => import('./pages/supervisor/sanciones').then((m) => m.Sanciones) },
          { path: 'catalogos', loadComponent: () => import('./pages/supervisor/catalogos-admin').then((m) => m.CatalogosAdmin) },
          { path: 'reportes', loadComponent: () => import('./pages/supervisor/reportes').then((m) => m.Reportes) },
        ],
      },

      // ---------- Solo super supervisor ----------
      {
        path: 'admin',
        canActivate: [rolGuard('super_supervisor')],
        children: [
          { path: 'parametros', loadComponent: () => import('./pages/admin/parametros').then((m) => m.Parametros) },
          { path: 'usuarios', loadComponent: () => import('./pages/admin/usuarios').then((m) => m.UsuariosAdmin) },
          { path: 'bitacora', loadComponent: () => import('./pages/admin/bitacora').then((m) => m.Bitacora) },
        ],
      },

      // ---------- Inspector ----------
      {
        path: 'inspector/inspecciones',
        canActivate: [rolGuard('inspector')],
        loadComponent: () => import('./pages/inspector/inspecciones').then((m) => m.Inspecciones),
      },
    ],
  },

  { path: '**', redirectTo: '' },
];