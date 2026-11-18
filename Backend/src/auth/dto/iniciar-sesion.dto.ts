import { IsEmail, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class IniciarSesionDto {
  @IsEmail({}, { message: 'El correo no es válido.' })
  @MaxLength(150)
  correo: string;

  @IsString()
  @IsNotEmpty({ message: 'La contraseña es obligatoria.' })
  @MaxLength(72)
  contrasena: string;
}