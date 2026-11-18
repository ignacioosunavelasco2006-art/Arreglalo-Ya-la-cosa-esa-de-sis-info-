export class CancelarTrabajoDto {
  id_trabajo: number;
  id_usuario: number; // quien cancela (cliente o trabajador)
  motivo?: string;
}
 