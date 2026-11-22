import { IsIn } from 'class-validator';

export class ActualizarEstadoTrabajoDto {
  @IsIn(['en_camino', 'en_proceso'])
  estado: string;
}
