import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// El cliente sale del token.
export class CrearCalificacionDto {
  @IsInt()
  id_trabajo: number;

  @IsInt() @Min(1) @Max(5)
  puntaje: number;

  @IsOptional() @IsString() @MaxLength(500)
  comentario?: string;
}
