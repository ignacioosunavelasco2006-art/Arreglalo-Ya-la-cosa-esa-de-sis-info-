import { IsEmail, IsOptional, IsString, MaxLength } from 'class-validator';

// La contraseña y el estado NO se cambian por aquí.
export class ActualizarUsuarioDto {
  @IsOptional() @IsString() @MaxLength(100)
  nombres?: string;

  @IsOptional() @IsString() @MaxLength(100)
  apellidos?: string;

  @IsOptional() @IsEmail() @MaxLength(150)
  correo?: string;

  @IsOptional() @IsString() @MaxLength(20)
  telefono?: string;
}
