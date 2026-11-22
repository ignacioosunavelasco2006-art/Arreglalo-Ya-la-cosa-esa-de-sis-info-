import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

export class ActualizarOfertaDto {
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  precio_estimado?: number;

  @IsOptional() @IsString() @MaxLength(500)
  comentario?: string;

  @IsOptional() @IsBoolean()
  requiere_visita?: boolean;
}
