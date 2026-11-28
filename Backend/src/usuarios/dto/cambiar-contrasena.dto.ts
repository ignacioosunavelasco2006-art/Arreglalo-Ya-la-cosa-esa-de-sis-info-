import { IsString, MaxLength, MinLength } from 'class-validator';

export class CambiarContrasenaDto {
  @IsString()
  contrasena_actual: string;

  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt ignora lo que pase de 72 bytes
  contrasena_nueva: string;
}