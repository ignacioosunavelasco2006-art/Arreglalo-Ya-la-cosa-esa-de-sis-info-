import { IsInt, IsNumber, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

// Devolución pedida por el cliente (queda 'solicitada' hasta que un supervisor la resuelva).
export class SolicitarDevolucionDto {
  @IsInt()
  id_trabajo: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  monto: number;

  @IsString() @MinLength(5) @MaxLength(500)
  motivo: string;
}
