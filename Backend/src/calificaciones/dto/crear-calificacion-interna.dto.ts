import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// RF-30: el trabajador (token) califica al cliente; solo lo ve la administración.
export class CrearCalificacionInternaDto {
  @IsInt()
  id_trabajo: number;

  @IsInt() @Min(1) @Max(5)
  puntaje: number;

  @IsOptional() @IsString() @MaxLength(500)
  nota?: string;
}
