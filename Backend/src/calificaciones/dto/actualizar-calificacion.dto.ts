import { IsInt, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

export class ActualizarCalificacionDto {
  @IsOptional() @IsInt() @Min(1) @Max(5)
  puntaje?: number;

  @IsOptional() @IsString() @MaxLength(500)
  comentario?: string;
}
