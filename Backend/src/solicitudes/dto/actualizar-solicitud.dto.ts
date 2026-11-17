export class ActualizarSolicitudDto {
  id_categoria?: number;
  id_zona?: number;
  descripcion?: string;
  direccion_exacta?: string;
  fecha_deseada?: string;
  presupuesto_aproximado?: number;
  estado?: string; // solo se permite 'cancelada'
}