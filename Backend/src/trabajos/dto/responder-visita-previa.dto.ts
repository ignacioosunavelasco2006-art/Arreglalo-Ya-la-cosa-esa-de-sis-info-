import { IsIn, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class ResponderVisitaPreviaDto {
  @IsIn(['aceptar_fecha', 'registrar_resultado', 'aceptar_precio', 'rechazar'])
  accion: string;

  @IsOptional() @IsString() @MaxLength(500)
  resultado?: string;

  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  precio_definitivo?: number;
}
