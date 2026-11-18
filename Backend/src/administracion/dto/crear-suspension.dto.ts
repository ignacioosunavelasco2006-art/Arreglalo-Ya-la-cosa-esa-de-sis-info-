import {
  IsInt,
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearSuspensionDto {
  @IsInt()
  id_usuario: number;

  @IsIn(['voluntaria', 'automatica', 'sancion'])
  tipo: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;

  @IsInt()
  @Min(1)
  dias_duracion: number;

  @IsOptional()
  @IsDateString()
  fecha_inicio?: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional()
  @IsInt()
  id_reclamo?: number;

  @IsOptional()
  @IsInt()
  id_supervisor?: number;
}
