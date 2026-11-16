export class RevisarDocumentoDto {
  id_supervisor_revisor: number;
  estado_verificacion: string; // 'observado' | 'aprobado' | 'rechazado'
  motivo_rechazo?: string;
}