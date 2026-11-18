import {
  IsInt,
  IsString,
  IsOptional,
  MaxLength,
} from 'class-validator';

export class RegistrarAuditoriaDto {
  @IsOptional()
  @IsInt()
  id_usuario?: number;

  @IsString()
  @MaxLength(60)
  accion: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  entidad?: string;

  @IsOptional()
  @IsInt()
  id_entidad?: number;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  detalle?: string;
}
