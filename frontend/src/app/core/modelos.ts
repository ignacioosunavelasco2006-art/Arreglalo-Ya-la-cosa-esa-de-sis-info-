// "Interfaces": describen la forma de los datos que devuelve tu API.
// Así el editor te avisa si escribes mal un nombre de campo.

export interface Usuario {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  estado: string; // activa | suspendida | eliminada
  roles: string[];
  fecha_registro?: string;
}

export interface RespuestaLogin {
  mensaje: string;
  access_token: string;
  token_type: string;
  expires_in: string;
  aviso?: string;
  usuario: Usuario;
}

export interface DatosLogin {
  correo: string;
  contrasena: string;
}

export interface DatosRegistro {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  telefono: string;
  tipo_cuenta: 'cliente' | 'trabajador';
}

export interface Categoria {
  id_categoria: number;
  nombre: string;
  activa: boolean;
}

export interface Zona {
  id_zona: number;
  nombre: string;
  activa: boolean;
}

export interface Notificacion {
  id_notificacion: number;
  tipo: string;
  mensaje: string;
  leida: boolean;
  fecha_envio: string;
}

// ---------- Solicitudes y ofertas ----------

export interface Solicitud {
  id_solicitud: number;
  id_cliente: number;
  id_categoria: number;
  id_zona: number;
  descripcion: string;
  direccion_exacta?: string; // solo la ve el dueño
  fecha_deseada: string;
  presupuesto_aproximado: number | null;
  estado: string; // abierta | contratada | vencida | cancelada
  fecha_publicacion: string;
  fecha_vencimiento: string;
  fotos?: { id_foto?: number; ruta_archivo: string }[];
}

export interface NuevaSolicitud {
  id_categoria: number;
  id_zona: number;
  descripcion: string;
  direccion_exacta: string;
  fecha_deseada: string; // ISO
  presupuesto_aproximado?: number;
  fotos?: string[]; // rutas devueltas por POST /archivos
}

export interface ResumenTrabajador {
  id_usuario: number;
  nombre: string | null;
  calificacion_promedio: number;
  total_calificaciones: number;
  anios_experiencia: number;
  etiqueta: string | null; // "nuevo" si aún no tiene calificaciones
}

export interface Oferta {
  id_oferta: number;
  id_solicitud: number;
  id_trabajador: number;
  precio_estimado: number;
  comentario: string | null;
  requiere_visita: boolean;
  estado: string; // pendiente | aceptada | rechazada | vencida
  fecha_envio: string;
  trabajador: ResumenTrabajador | null;
}

export interface VisitaPrevia {
  id_visita: number;
  id_oferta: number;
  fecha_propuesta: string;
  aceptada_cliente: boolean | null;
  resultado: string | null;
  precio_definitivo: number | null;
  estado: string; // propuesta | aceptada | realizada | precio_aceptado | cancelada
}

// ---------- Trabajos ----------

export interface Trabajo {
  id_trabajo: number;
  id_oferta: number;
  id_solicitud: number;
  id_cliente: number;
  id_trabajador: number;
  precio_final: number;
  metodo_pago: string; // plataforma | qr | efectivo
  estado: string;
  fecha_inicio_prog: string | null;
  fecha_fin_prog: string | null;
  fecha_creacion: string;
  fecha_cierre: string | null;
}

export interface Incremento {
  id_incremento: number;
  id_trabajo: number;
  monto_adicional: number;
  justificacion: string;
  estado: string; // pendiente | aceptado | rechazado
  fecha_solicitud: string;
  fecha_respuesta: string | null;
}

export interface Finalizacion {
  id_finalizacion: number;
  id_trabajo: number;
  estado: string; // pendiente | aceptada | rechazada
  motivo_rechazo: string | null;
  fecha_solicitud: string;
  fecha_respuesta: string | null;
}

export interface CambioEstado {
  estado_anterior: string | null;
  estado_nuevo: string;
  fecha_cambio: string;
  id_usuario: number | null;
}

export interface TrabajoDetalle extends Trabajo {
  total_incrementos: number;
  precio_total: number;
  direccion_exacta: string | null;
  historial: CambioEstado[];
  incrementos: Incremento[];
  finalizaciones: Finalizacion[];
}

export interface Pago {
  id_pago: number;
  id_trabajo: number;
  tipo: string; // anticipo | saldo | liquidacion | devolucion
  medio: string;
  monto: number;
  comision: number;
  estado: string; // pendiente | confirmado | en_disputa
  fecha_pago: string;
}

export interface TrabajoPendienteCalificar {
  id_trabajo: number;
  id_trabajador: number;
  fecha_cierre: string;
}

// ---------- Perfil público del trabajador ----------

export interface PerfilPublico {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  descripcion: string | null;
  anios_experiencia: number;
  foto_perfil: string | null;
  calificacion_promedio: number;
  total_calificaciones: number;
  disponible: boolean;
  estado_disponibilidad: string;
  etiqueta: string | null;
  trabajos_completados: number;
  categorias: { id_categoria: number; nombre: string; precio_estimado: number | null }[];
  zonas: { id_zona: number; nombre: string }[];
  comentarios: {
    puntaje: number;
    comentario: string;
    respuesta_trabajador: string | null;
    fecha: string;
  }[];
}

export interface Parametro {
  clave: string;
  valor: string;
  descripcion: string | null;
}

// ---------- Trabajador (vista privada) ----------

export interface DocumentoTrabajador {
  id_documento: number;
  id_trabajador: number;
  tipo: string; // carnet | antecedentes | otro
  ruta_archivo: string;
  fecha_subida: string;
}

export interface PerfilPrivado {
  id_usuario: number;
  carnet_identidad: string;
  descripcion: string | null;
  anios_experiencia: number;
  foto_perfil: string | null;
  estado_verificacion: string; // pendiente | observado | aprobado | rechazado
  motivo_rechazo: string | null;
  calificacion_promedio: number;
  total_calificaciones: number;
  categorias: { id_categoria: number; nombre: string; precio_estimado: number | null }[];
  zonas: { id_zona: number; nombre: string }[];
  documentos: DocumentoTrabajador[];
  tiene_datos_bancarios: boolean;
}

export interface DatosBancarios {
  banco: string;
  titular: string;
  numero_cuenta: string; // llega enmascarado: ****1234
  fecha_actualizacion: string;
}

export interface BloqueDisponibilidad {
  id_disponibilidad: number;
  id_trabajador: number;
  dia_semana: number; // 1 = lunes ... 7 = domingo
  hora_inicio: string;
  hora_fin: string;
  activa: boolean;
}

export interface SolicitudDisponible {
  id_solicitud: number;
  id_categoria: number;
  id_zona: number;
  descripcion: string;
  fecha_deseada: string;
  presupuesto_aproximado: number | null;
  fecha_publicacion: string;
  fecha_vencimiento: string;
  ya_oferte: boolean;
}

export type OfertaPropia = Omit<Oferta, 'trabajador'>;

export interface ItemCalendario {
  id_trabajo: number;
  estado: string;
  fecha_inicio_prog: string;
  fecha_fin_prog: string;
  id_zona: number;
  descripcion: string;
}

export interface Calendario {
  desde: string;
  hasta: string;
  total_trabajos: number;
  dias: { fecha: string; trabajos: ItemCalendario[] }[];
}

export interface CalificacionRecibida {
  id_calificacion: number;
  id_trabajo: number;
  id_trabajador: number;
  puntaje: number;
  comentario: string | null;
  respuesta_trabajador: string | null;
  fecha: string;
}

export interface ReclamoContraMi {
  id_reclamo: number;
  id_trabajo: number;
  descripcion: string;
  estado: string; // abierto | en_revision | resuelto | improcedente
  resolucion: string | null;
  fecha_reclamo: string;
  fecha_resolucion: string | null;
}

export interface ArchivoSubido {
  ruta: string; // ej. "documento/12-uuid.pdf": es lo que se guarda en la base de datos
  nombre_original: string;
  tamano: number;
}



// ---------- Supervisión de trabajadores ----------

export interface PerfilRevision {
  id_usuario: number;
  carnet_identidad: string;
  descripcion: string | null;
  anios_experiencia: number;
  estado_verificacion: string;
  motivo_rechazo: string | null;
  calificacion_promedio: number;
  total_calificaciones: number;
  fecha_creacion?: string;
}

export interface PerfilRevisionDetalle extends PerfilRevision {
  categorias: {
    id_categoria: number;
    nombre: string;
    precio_estimado: number | null;
  }[];

  zonas: {
    id_zona: number;
    nombre: string;
  }[];

  documentos: DocumentoTrabajador[];
  tiene_datos_bancarios: boolean;
}

export interface UsuarioLista {
  id_usuario: number;
  nombres: string;
  apellidos: string;
  correo: string;
  telefono: string;
  estado: string;
  fecha_registro: string;
  roles: string[];
}

export interface Reclamo {
  id_reclamo: number;
  id_trabajo: number;
  id_cliente: number;
  id_supervisor: number | null;
  descripcion: string;
  estado: string; // abierto | en_revision | resuelto | improcedente
  resolucion: string | null;
  escalado_super: boolean;
  fecha_reclamo: string;
  fecha_resolucion: string | null;
}

export interface Evidencia {
  id_evidencia: number;
  id_reclamo: number;
  ruta_archivo: string;
}

export interface ReclamoConEvidencias extends Reclamo {
  evidencias: Evidencia[];
}

export interface Devolucion {
  id_devolucion: number;
  id_trabajo: number;
  id_cliente: number;
  id_reclamo: number | null;
  id_pago: number | null;
  monto: number;
  motivo: string;
  estado: string; // solicitada | aprobada | procesada | rechazada
  motivo_rechazo: string | null;
  fecha_solicitud: string;
  fecha_aprobacion: string | null;
  fecha_procesamiento: string | null;
}

// Vista consolidada para el supervisor (filas crudas de la base de datos)
export interface CasoReclamo {
  reclamo: Reclamo;
  evidencias: Evidencia[];
  trabajo: {
    id_trabajo: number;
    id_cliente: number;
    id_trabajador: number;
    estado: string;
    metodo_pago: string;
    precio_final: string | number;
    precio_total: number;
    total_incrementos: number;
    fecha_cierre: string | null;
  };
  historial: CambioEstado[];
  incrementos: Incremento[];
  finalizaciones: Finalizacion[];
  pagos: Pago[];
  devoluciones: Devolucion[];
  calificacion: { puntaje: number; comentario: string | null; respuesta_trabajador: string | null } | null;
}

export interface Devolucion {
  id_devolucion: number;
  id_trabajo: number;
  id_cliente: number;
  id_reclamo: number | null;
  id_pago: number | null;
  monto: number;
  motivo: string;
  estado: string; // solicitada | aprobada | procesada | rechazada
  motivo_rechazo: string | null;
  fecha_solicitud: string;
  fecha_aprobacion: string | null;
  fecha_procesamiento: string | null;
}

export interface Incidente {
  id_incidente: number;
  id_trabajador: number;
  id_trabajo: number;
  tipo: string;
  anulado: boolean;
  id_supervisor_anula: number | null;
  fecha: string;
}

export interface Suspension {
  id_suspension: number;
  id_usuario: number;
  tipo: string; // voluntaria | automatica | sancion
  motivo: string | null;
  dias_duracion: number;
  fecha_inicio: string;
  fecha_fin: string;
  estado: string; // vigente | finalizada | levantada
  id_reclamo: number | null;
  id_supervisor: number | null;
}

export interface ItemBitacora {
  id_bitacora: string;
  id_usuario: number | null;
  accion: string;
  entidad: string | null;
  id_entidad: number | null;
  detalle: string | null;
  fecha: string;
}
