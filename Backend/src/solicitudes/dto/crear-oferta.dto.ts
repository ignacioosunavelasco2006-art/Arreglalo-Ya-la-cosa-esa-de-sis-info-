import { IsBoolean, IsNumber, IsOptional, IsPositive, IsString, MaxLength } from 'class-validator';

// El trabajador sale del token; la solicitud va en la URL.
export class CrearOfertaDto {
  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  precio_estimado: number;

  @IsOptional() @IsString() @MaxLength(500)
  comentario?: string;

  @IsOptional() @IsBoolean()
  requiere_visita?: boolean;
}
