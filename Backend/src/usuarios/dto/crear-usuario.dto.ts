import { IsEmail, IsIn, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

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

  // CU-02 paso 1: 'el visitante elige el tipo de cuenta'. Por defecto cliente.
  // Supervisor, super_supervisor e inspector NO se pueden elegir aquí.
  @IsOptional()
  @IsIn(['cliente', 'trabajador'])
  tipo_cuenta?: 'cliente' | 'trabajador';
}
