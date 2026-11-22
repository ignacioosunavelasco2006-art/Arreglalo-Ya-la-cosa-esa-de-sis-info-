import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// RF-09: el supervisor aprueba, observa o rechaza. Su id sale del token.
export class RevisarPerfilDto {
  @IsIn(['aprobado', 'observado', 'rechazado'])
  estado_verificacion: string;

  // Obligatorio si es observado o rechazado (se valida en el service)
  @IsOptional() @IsString() @MaxLength(300)
  motivo_rechazo?: string;
}
