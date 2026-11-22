import { IsBoolean } from 'class-validator';

// RF-24: el trabajador marca 'recibido' o 'no recibido'. Su id sale del token.
export class ConfirmarEfectivoDto {
  @IsBoolean()
  recibido: boolean;
}
