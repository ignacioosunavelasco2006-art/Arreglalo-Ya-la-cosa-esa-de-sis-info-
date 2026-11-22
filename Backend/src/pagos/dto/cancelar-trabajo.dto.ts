import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

// Cancela el cliente o el trabajador del trabajo (se deduce del token).
export class CancelarTrabajoDto {
  @IsInt()
  id_trabajo: number;

  @IsOptional() @IsString() @MaxLength(300)
  motivo?: string;
}
