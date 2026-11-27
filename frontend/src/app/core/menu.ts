// Qué ve cada rol en la barra de navegación y en el panel de inicio.
// A medida que construyamos pantallas, se agregan aquí (y en app.routes.ts).

export interface ItemMenu {
  ruta: string;
  texto: string;
}

export interface Acceso {
  texto: string;
  descripcion: string;
  ruta?: string; // sin ruta = 'Próximamente'
}

const BASE: ItemMenu[] = [
  { ruta: '/inicio', texto: 'Inicio' },
  { ruta: '/catalogos', texto: 'Servicios y zonas' },
  { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
];

export const MENU_POR_ROL: Record<string, ItemMenu[]> = {
  cliente: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/solicitudes', texto: 'Mis solicitudes' },
    { ruta: '/trabajos', texto: 'Mis trabajos' },
    { ruta: '/catalogos', texto: 'Servicios y zonas' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
  ],
  trabajador: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/oportunidades', texto: 'Solicitudes' },
    { ruta: '/mis-ofertas', texto: 'Mis ofertas' },
    { ruta: '/trabajos', texto: 'Mis trabajos' },
    { ruta: '/calendario', texto: 'Calendario' },
    { ruta: '/ausencias', texto: 'Ausencias' }, // NUEVO
    { ruta: '/mi-perfil', texto: 'Mi perfil' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
  ],
  inspector: BASE,

  supervisor: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/supervisor/revision-trabajadores', texto: 'Revisión de trabajadores' },
    { ruta: '/rendimiento', texto: 'Rendimiento' },
    { ruta: '/mi-cuenta', texto: 'Mi cuenta' },
    { ruta: '/supervisor/catalogos', texto: 'Categorías y zonas' },
  ],

  super_supervisor: [
    { ruta: '/inicio', texto: 'Inicio' },
    { ruta: '/supervisor/revision-trabajadores', texto: 'Revisión de trabajadores' },
    { ruta: '/rendimiento', texto: 'Rendimiento' },{ ruta: '/mi-cuenta', texto: 'Mi cuenta' },
    { ruta: '/supervisor/catalogos', texto: 'Categorías y zonas' },
  ],
};

export const ACCESOS_POR_ROL: Record<string, Acceso[]> = {
  cliente: [
    { texto: 'Publicar solicitud', descripcion: 'Describe tu problema y recibe ofertas', ruta: '/solicitudes/nueva' },
    { texto: 'Mis solicitudes', descripcion: 'Revisa las ofertas que recibiste', ruta: '/solicitudes' },
    { texto: 'Mis trabajos', descripcion: 'Pagos, avances y finalización', ruta: '/trabajos' },
    { texto: 'Mis reclamos', descripcion: 'Reclama dentro de los 7 días' },
  ],
  trabajador: [
    { texto: 'Mi perfil', descripcion: 'Documentos, habilidades, zonas y datos bancarios', ruta: '/mi-perfil' },
    { texto: 'Solicitudes disponibles', descripcion: 'Trabajos de tus categorías y zonas', ruta: '/oportunidades' },
    { texto: 'Mis ofertas', descripcion: 'Seguimiento de lo que ofertaste', ruta: '/mis-ofertas' },
    { texto: 'Mis trabajos', descripcion: 'Avance, incrementos y cobros', ruta: '/trabajos' },
    { texto: 'Mi calendario', descripcion: 'Tus trabajos por día y hora', ruta: '/calendario' },
    { texto: 'Mis ausencias', descripcion: 'Bloquea fechas en las que no puedes trabajar', ruta: '/ausencias' }, // NUEVO
    { texto: 'Reclamos', descripcion: 'Reclamos sobre tus trabajos', ruta: '/reclamos-trabajador' },
  ],
  inspector: [{ texto: 'Mis inspecciones', descripcion: 'Visitas asignadas y resultados' }],

  supervisor: [
    {
      texto: 'Revisión de trabajadores',
      descripcion: 'Consultar documentos y aprobar perfiles',
      ruta: '/supervisor/revision-trabajadores',
      
    },
    {
      texto: 'Rendimiento de trabajadores',
      descripcion: 'Trabajos, cancelaciones, ingresos y calificaciones por fechas',
      ruta: '/rendimiento',
    },
    {
      texto: 'Reclamos',
      descripcion: 'Revisar y resolver casos',
    },
    {
      texto: 'Categorías y zonas',
      descripcion: 'Crear, editar, activar y desactivar servicios y zonas',
      ruta: '/supervisor/catalogos',
    },
    {
      texto: 'Reportes',
      descripcion: 'Trabajos, ingresos y flujo económico',
    },
  ],

  super_supervisor: [
    {
      texto: 'Revisión de trabajadores',
      descripcion: 'Consultar documentos y aprobar perfiles',
      ruta: '/supervisor/revision-trabajadores',
    },
    {
      texto: 'Rendimiento de trabajadores',
      descripcion: 'Trabajos, cancelaciones, ingresos y calificaciones por fechas',
      ruta: '/rendimiento',
    },
    {
      texto: 'Parámetros del sistema',
      descripcion: 'Comisión, anticipo y plazos',
    },
    {
      texto: 'Supervisores',
      descripcion: 'Crear cuentas internas',
    },
    {
      texto: 'Bitácora',
      descripcion: 'Consultar acciones del sistema',
    },
    {
      texto: 'Reportes',
      descripcion: 'Trabajos, ingresos y flujo económico',
    },
  ],
};

export const NOMBRE_ROL: Record<string, string> = {
  cliente: 'Cliente',
  trabajador: 'Trabajador',
  inspector: 'Inspector',
  supervisor: 'Supervisor',
  super_supervisor: 'Super supervisor',
};