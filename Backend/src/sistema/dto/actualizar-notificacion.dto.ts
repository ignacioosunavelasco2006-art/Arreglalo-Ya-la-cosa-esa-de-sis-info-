import {
  IsBoolean,
  IsOptional,
} from 'class-validator';

export class ActualizarNotificacionDto {
  @IsOptional()
  @IsBoolean()
  leida?: boolean;
}
