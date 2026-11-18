export class ResponderFinalizacionDto {
  id_cliente: number;
  aceptar: boolean;
  motivo_rechazo?: string; // obligatorio si rechaza
}