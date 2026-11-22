import { IsInt, IsOptional, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// El id del trabajador sale del token, ya no se envía en el body.
export class CrearPerfilTrabajadorDto {
  @IsString() @MinLength(5) @MaxLength(20)
  carnet_identidad: string;

  @IsOptional() @IsString() @MaxLength(1000)
  descripcion?: string;

  @IsOptional() @IsInt() @Min(0) @Max(60)
  anios_experiencia?: number;

  @IsOptional() @IsString() @MaxLength(300)
  foto_perfil?: string;
}
