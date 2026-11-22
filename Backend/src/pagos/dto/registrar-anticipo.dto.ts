import { IsIn, IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

// El cliente sale del token. RF-22: el anticipo se paga a la plataforma, nunca al trabajador.
export class RegistrarAnticipoDto {
  @IsInt()
  id_trabajo: number;

  @IsIn(['plataforma', 'qr'])
  medio: string;

  @IsOptional() @IsString() @MaxLength(100)
  referencia_pasarela?: string;
}
