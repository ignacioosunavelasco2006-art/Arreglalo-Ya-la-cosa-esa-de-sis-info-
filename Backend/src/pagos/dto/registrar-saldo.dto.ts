import { IsInt, IsOptional, IsString, MaxLength } from 'class-validator';

export class RegistrarSaldoDto {
  @IsInt()
  id_trabajo: number;

  @IsOptional() @IsString() @MaxLength(100)
  referencia_pasarela?: string;
}
