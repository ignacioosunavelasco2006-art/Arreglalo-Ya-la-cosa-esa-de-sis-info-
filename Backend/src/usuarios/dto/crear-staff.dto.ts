import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';

// RF-34: el super supervisor crea supervisores (y personal interno).
export class CrearStaffDto {
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

  @IsIn(['supervisor', 'inspector'])
  rol: 'supervisor' | 'inspector';
}
