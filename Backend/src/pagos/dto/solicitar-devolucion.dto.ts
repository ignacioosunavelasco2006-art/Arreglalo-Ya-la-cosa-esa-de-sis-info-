export class SolicitarDevolucionDto {
  id_trabajo: number;
  id_cliente: number;
  monto: number;
  motivo: string;
  id_reclamo?: number;
}
 