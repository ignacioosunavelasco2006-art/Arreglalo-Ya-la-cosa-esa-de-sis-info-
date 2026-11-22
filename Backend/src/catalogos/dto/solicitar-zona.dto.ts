import { IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// CU-05 flujo alterno: "si no existe su zona, puede solicitarla al supervisor".
export class SolicitarZonaDto {
  @IsString() @MinLength(2) @MaxLength(100)
  nombre_zona: string;

  @IsOptional() @IsString() @MaxLength(300)
  comentario?: string;
}
