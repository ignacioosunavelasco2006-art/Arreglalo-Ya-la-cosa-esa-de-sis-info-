import { IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class GuardarDatosBancariosDto {
  @IsString() @MinLength(2) @MaxLength(80)
  banco: string;

  @IsString() @MinLength(3) @MaxLength(150)
  titular: string;

  // CU-03: 'el sistema valida el formato'
  @Matches(/^[0-9]{6,25}$/, { message: 'El número de cuenta debe tener entre 6 y 25 dígitos' })
  numero_cuenta: string;
}
