// Texto y color (de Bootstrap) para mostrar cada estado como una "etiqueta".

export type TipoEstado =
  | 'solicitud'
  | 'oferta'
  | 'trabajo'
  | 'visita'
  | 'incremento'
  | 'finalizacion'
  | 'pago'
  | 'verificacion'
  | 'reclamo';

interface Etiqueta {
  texto: string;
  color: string; // primary | success | warning | danger | info | secondary | dark
}

const ETIQUETAS: Record<TipoEstado, Record<string, Etiqueta>> = {
  solicitud: {
    abierta: { texto: 'Abierta', color: 'primary' },
    contratada: { texto: 'Contratada', color: 'success' },
    vencida: { texto: 'Vencida', color: 'secondary' },
    cancelada: { texto: 'Cancelada', color: 'dark' },
  },
  oferta: {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    aceptada: { texto: 'Aceptada', color: 'success' },
    rechazada: { texto: 'Rechazada', color: 'secondary' },
    vencida: { texto: 'Vencida', color: 'secondary' },
  },
  trabajo: {
    pendiente_anticipo: { texto: 'Pendiente de anticipo', color: 'warning' },
    programado: { texto: 'Programado', color: 'info' },
    en_camino: { texto: 'En camino', color: 'info' },
    en_proceso: { texto: 'En proceso', color: 'primary' },
    terminado: { texto: 'Terminado', color: 'success' },
    cancelado: { texto: 'Cancelado', color: 'secondary' },
    en_reclamo: { texto: 'En reclamo', color: 'danger' },
  },
  visita: {
    propuesta: { texto: 'Fecha propuesta', color: 'warning' },
    aceptada: { texto: 'Fecha aceptada', color: 'info' },
    realizada: { texto: 'Visita realizada', color: 'primary' },
    precio_aceptado: { texto: 'Precio aceptado', color: 'success' },
    cancelada: { texto: 'Cancelada', color: 'secondary' },
  },
  incremento: {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    aceptado: { texto: 'Aceptado', color: 'success' },
    rechazado: { texto: 'Rechazado', color: 'secondary' },
  },
  finalizacion: {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    aceptada: { texto: 'Aceptada', color: 'success' },
    rechazada: { texto: 'Rechazada', color: 'secondary' },
  },
  pago: {
    pendiente: { texto: 'Pendiente', color: 'warning' },
    confirmado: { texto: 'Confirmado', color: 'success' },
    en_disputa: { texto: 'En disputa', color: 'danger' },
  },
  verificacion: {
    pendiente: { texto: 'Pendiente de revisión', color: 'warning' },
    observado: { texto: 'Con observaciones', color: 'danger' },
    aprobado: { texto: 'Aprobado', color: 'success' },
    rechazado: { texto: 'Rechazado', color: 'dark' },
  },
  reclamo: {
    abierto: { texto: 'Abierto', color: 'warning' },
    en_revision: { texto: 'En revisión', color: 'info' },
    resuelto: { texto: 'Resuelto', color: 'success' },
    improcedente: { texto: 'Desestimado', color: 'secondary' },
  },
};

export function etiquetaEstado(tipo: TipoEstado, estado: string): Etiqueta {
  return ETIQUETAS[tipo][estado] ?? { texto: estado, color: 'secondary' };
}

export const ESTADOS_TRABAJO = Object.entries(ETIQUETAS.trabajo).map(([valor, e]) => ({
  valor,
  texto: e.texto,
}));

export const ESTADOS_SOLICITUD = Object.entries(ETIQUETAS.solicitud).map(([valor, e]) => ({
  valor,
  texto: e.texto,
}));

export const NOMBRE_TIPO_PAGO: Record<string, string> = {
  anticipo: 'Anticipo',
  saldo: 'Saldo',
  liquidacion: 'Pago al trabajador',
  devolucion: 'Devolución',
};

export const NOMBRE_MEDIO_PAGO: Record<string, string> = {
  plataforma: 'Plataforma',
  qr: 'QR',
  efectivo: 'Efectivo',
};

export const NOMBRE_DIA = ['', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export const NOMBRE_DOCUMENTO: Record<string, string> = {
  carnet: 'Carnet de identidad',
  antecedentes: 'Certificado de antecedentes',
  otro: 'Otro documento',
};
