import { IsEmail, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearUsuarioDto {
  @IsString() @MaxLength(100)
  nombres: string;

  @IsString() @MaxLength(100)
  apellidos: string;

  @IsEmail() @MaxLength(150)
  correo: string;

  @IsString() @MinLength(8) @MaxLength(72)
  contrasena: string;

  @IsString() @MaxLength(20)
  telefono: string;
}
