export class CrearNotificacionDto {
  usuarioId: number;
  titulo: string;
  mensaje: string;
  canal?: string;
  referenciaId?: number;
}
