export class CrearOfertaDto {
  id_solicitud: number;
  id_trabajador: number;
  precio_estimado: number;
  comentario?: string;
  requiere_visita?: boolean;
}