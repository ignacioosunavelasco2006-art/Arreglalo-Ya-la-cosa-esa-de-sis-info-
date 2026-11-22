import { Type } from 'class-transformer';
import { IsIn, IsInt, IsOptional } from 'class-validator';

// ?id_categoria=1&id_zona=2&estado=abierta
export class ConsultarSolicitudesDto {
  @IsOptional() @Type(() => Number) @IsInt()
  id_categoria?: number;

  @IsOptional() @Type(() => Number) @IsInt()
  id_zona?: number;

  @IsOptional() @IsIn(['abierta', 'contratada', 'vencida', 'cancelada'])
  estado?: string;
}
