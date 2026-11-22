import { Type } from 'class-transformer';
import { IsInt, IsNumber, IsOptional, IsString, Max, MaxLength, Min } from 'class-validator';

// GET /trabajadores?categoria=1&zona=2&calificacion_min=4&q=juan
export class BuscarTrabajadoresDto {
  @IsOptional() @Type(() => Number) @IsInt()
  categoria?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  zona?: number;

  @IsOptional() @Type(() => Number) @IsNumber() @Min(0) @Max(5)
  calificacion_min?: number;

  @IsOptional() @IsString() @MaxLength(60)
  q?: string;
}
