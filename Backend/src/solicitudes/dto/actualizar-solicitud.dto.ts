import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength } from 'class-validator';

export class ActualizarSolicitudDto {
  @IsOptional() @IsInt()
  id_categoria?: number;

  @IsOptional() @IsInt()
  id_zona?: number;

  @IsOptional() @IsString() @MinLength(10) @MaxLength(2000)
  descripcion?: string;

  @IsOptional() @IsString() @MinLength(5) @MaxLength(250)
  direccion_exacta?: string;

  @IsOptional() @IsDateString()
  fecha_deseada?: string;

  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  presupuesto_aproximado?: number;

  // Única transición permitida por el cliente
  @IsOptional() @IsIn(['cancelada'])
  estado?: string;
}
