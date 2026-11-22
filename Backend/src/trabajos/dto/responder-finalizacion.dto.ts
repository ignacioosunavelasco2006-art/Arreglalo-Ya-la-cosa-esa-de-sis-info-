import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResponderFinalizacionDto {
  @IsBoolean()
  aceptar: boolean;

  // Obligatorio si rechaza (se valida en el service)
  @IsOptional() @IsString() @MaxLength(300)
  motivo_rechazo?: string;
}
