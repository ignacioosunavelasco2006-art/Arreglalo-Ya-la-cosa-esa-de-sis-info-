import { Type } from 'class-transformer';
import {
  ArrayMaxSize, IsArray, IsDateString, IsInt, IsNumber, IsOptional, IsPositive, IsString, MaxLength, MinLength,
} from 'class-validator';

// El cliente sale del token. RF-11: descripción, fotos, ubicación y fecha deseada.
export class CrearSolicitudDto {
  @IsInt()
  id_categoria: number;

  @IsInt()
  id_zona: number;

  @IsString() @MinLength(10) @MaxLength(2000)
  descripcion: string;

  @IsString() @MinLength(5) @MaxLength(250)
  direccion_exacta: string;

  @IsDateString()
  fecha_deseada: string;

  @IsOptional() @Type(() => Number) @IsNumber() @IsPositive()
  presupuesto_aproximado?: number;

  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @IsString({ each: true }) @MaxLength(300, { each: true })
  fotos?: string[];
}
