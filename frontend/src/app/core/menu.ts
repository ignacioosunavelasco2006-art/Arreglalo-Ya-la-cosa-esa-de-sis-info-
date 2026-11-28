// Qué ve cada rol en la barra de navegación y en el panel de inicio.
// Para agregar una pantalla: 1) su ruta en app.routes.ts  2) una línea aquí.

export interface ItemMenu {
  ruta: string;
  texto: string;
}

export interface Acceso {
  texto: string;
  descripcion: string;
  ruta?: string; // sin ruta = "Próximamente"
}

const SUPERVISION: ItemMenu[] = [
  { ruta: '/inicio', texto: 'Inicio' },
  { ruta: '/supervisor/trabajadores', texto: 'Trabajadores' },
  { ruta: '/supervisor/reclamos', texto: 'Reclamos' },
  { ruta: '/supervisor/devoluciones', texto: 'Devoluciones' },
  { ruta: '/supervisor/sanciones', texto: 'Sanciones' },
  { ruta: '/supervisor/catalogos', texto: 'Catálogos' },
  { ruta: '/supervisor/reportes', texto: 'Reportes' },
  { ruta: '/rendimiento', texto: 'Rendimiento' },
];

export const MENU_POR_ROL: Record<string, ItemMenu[]> = {
  cliente: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/solicitudes', texto: 'Mis solicitudes' },
    { ruta: '/trabajos', texto: 'Mis trabajos' },
    { ruta: '/reclamos', texto: 'Mis reclamos' },
    { ruta: '/catalogos', texto: 'Servicios y zonas' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
  ],
  trabajador: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/oportunidades', texto: 'Solicitudes' },
    { ruta: '/mis-ofertas', texto: 'Mis ofertas' },
    { ruta: '/trabajos', texto: 'Mis trabajos' },
    { ruta: '/calendario', texto: 'Calendario' },
    { ruta: '/rendimiento', texto: 'Rendimiento' },
    { ruta: '/mi-perfil', texto: 'Mi perfil' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
  ],
  inspector: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/inspector/inspecciones', texto: 'Mis inspecciones' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
  ],
  supervisor: [...SUPERVISION, { ruta: '/mi-cuenta', texto: 'Mi cuenta' }],
  super_supervisor: [
    ...SUPERVISION,
    { ruta: '/admin/parametros', texto: 'Parámetros' },
    { ruta: '/admin/usuarios', texto: 'Usuarios' },
    { ruta: '/admin/bitacora', texto: 'Bitácora' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
  ],
};

export const ACCESOS_POR_ROL: Record<string, Acceso[]> = {
  cliente: [
    { texto: 'Publicar solicitud', descripcion: 'Describe tu problema y recibe ofertas', ruta: '/solicitudes/nueva' },
    { texto: 'Mis solicitudes', descripcion: 'Revisa las ofertas que recibiste', ruta: '/solicitudes' },
    { texto: 'Mis trabajos', descripcion: 'Pagos, avances y finalización', ruta: '/trabajos' },
    { texto: 'Mis reclamos', descripcion: 'Reclamos y devoluciones', ruta: '/reclamos' },
  ],
  trabajador: [
    { texto: 'Mi perfil', descripcion: 'Documentos, habilidades, zonas y datos bancarios', ruta: '/mi-perfil' },
    { texto: 'Solicitudes disponibles', descripcion: 'Trabajos de tus categorías y zonas', ruta: '/oportunidades' },
    { texto: 'Mis ofertas', descripcion: 'Seguimiento de lo que ofertaste', ruta: '/mis-ofertas' },
    { texto: 'Mis trabajos', descripcion: 'Avance, incrementos y cobros', ruta: '/trabajos' },
    { texto: 'Mi calendario', descripcion: 'Tus trabajos por día y hora', ruta: '/calendario' },
    { texto: 'Mi rendimiento', descripcion: 'Trabajos realizados, ingresos y calificaciones', ruta: '/rendimiento' },
    { texto: 'Reclamos', descripcion: 'Reclamos sobre tus trabajos', ruta: '/reclamos-trabajador' },
  ],
  inspector: [
    { texto: 'Mis inspecciones', descripcion: 'Visitas asignadas y resultados', ruta: '/inspector/inspecciones' },
  ],
  supervisor: [
    { texto: 'Revisión de trabajadores', descripcion: 'Aprobar, observar o rechazar perfiles', ruta: '/supervisor/trabajadores' },
    { texto: 'Reclamos', descripcion: 'Revisar y resolver casos', ruta: '/supervisor/reclamos' },
    { texto: 'Devoluciones', descripcion: 'Aprobar y procesar devoluciones', ruta: '/supervisor/devoluciones' },
    { texto: 'Incidentes y suspensiones', descripcion: 'Sanciones a trabajadores', ruta: '/supervisor/sanciones' },
    { texto: 'Categorías y zonas', descripcion: 'Administrar el catálogo', ruta: '/supervisor/catalogos' },
    { texto: 'Reportes', descripcion: 'Trabajos, ingresos y flujo económico', ruta: '/supervisor/reportes' },
    { texto: 'Rendimiento', descripcion: 'Indicadores por trabajador', ruta: '/rendimiento' },
  ],
  super_supervisor: [
    { texto: 'Parámetros del sistema', descripcion: 'Comisión, anticipo y plazos', ruta: '/admin/parametros' },
    { texto: 'Usuarios', descripcion: 'Crear supervisores e inspectores', ruta: '/admin/usuarios' },
    { texto: 'Bitácora', descripcion: 'Quién hizo qué y cuándo', ruta: '/admin/bitacora' },
    { texto: 'Reportes', descripcion: 'Trabajos, ingresos y flujo económico', ruta: '/supervisor/reportes' },
    { texto: 'Rendimiento', descripcion: 'Indicadores por trabajador', ruta: '/rendimiento' },
    { texto: 'Reclamos', descripcion: 'Incluye los casos escalados a ti', ruta: '/supervisor/reclamos' },
    { texto: 'Revisión de trabajadores', descripcion: 'Perfiles pendientes', ruta: '/supervisor/trabajadores' },
  ],
};

export const NOMBRE_ROL: Record<string, string> = {
  cliente: 'Cliente',
  trabajador: 'Trabajador',
  inspector: 'Inspector',
  supervisor: 'Supervisor',
  super_supervisor: 'Super supervisor',
};