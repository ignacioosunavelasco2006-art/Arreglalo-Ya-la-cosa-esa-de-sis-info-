import {
  IsInt,
  IsString,
  IsOptional,
  IsIn,
  IsDateString,
  MaxLength,
  Min,
} from 'class-validator';

export class ActualizarSuspensionDto {
  @IsOptional()
  @IsIn(['voluntaria', 'automatica', 'sancion'])
  tipo?: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  dias_duracion?: number;

  @IsOptional()
  @IsDateString()
  fecha_fin?: string;

  @IsOptional()
  @IsIn(['vigente', 'finalizada', 'reactivada', 'cuenta_eliminada'])
  estado?: string;
}
