import { IsDateString, IsOptional, IsString, MaxLength } from 'class-validator';

export class CrearAusenciaDto {
  @IsDateString()
  fecha_inicio: string;

  @IsDateString()
  fecha_fin: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;
}