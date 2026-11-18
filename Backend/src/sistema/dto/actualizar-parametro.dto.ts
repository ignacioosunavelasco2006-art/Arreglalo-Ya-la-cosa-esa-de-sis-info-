import {
  IsString,
  IsOptional,
  MaxLength,
  IsInt,
} from 'class-validator';

export class ActualizarParametroDto {
  @IsOptional()
  @IsString()
  @MaxLength(100)
  valor?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  descripcion?: string;

  @IsOptional()
  @IsInt()
  id_modificado_por?: number;
}
