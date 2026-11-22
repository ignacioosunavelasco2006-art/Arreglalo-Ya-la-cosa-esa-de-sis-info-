import { IsInt, IsNumber, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearIncrementoPrecioDto {
  @IsInt()
  id_trabajo: number;

  @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  monto_adicional: number;

  @IsString() @MinLength(10) @MaxLength(500)
  justificacion: string;
}
