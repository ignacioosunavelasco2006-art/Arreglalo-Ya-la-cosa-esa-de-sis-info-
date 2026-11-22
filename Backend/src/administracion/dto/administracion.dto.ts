import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

// ⚠ Verifica que los valores de "tipo" coincidan con el CHECK de tu SQL.
export const TIPOS_INCIDENTE = ['cancelacion', 'atraso', 'reclamo'];

export class RegistrarIncidenteDto {
  @IsInt()
  id_trabajador: number;

  @IsInt()
  id_trabajo: number;

  @IsIn(TIPOS_INCIDENTE)
  tipo: string;
}

// Sanción manual del supervisor (RF-33): suspender una cuenta.
export class SancionarDto {
  @IsInt()
  id_usuario: number;

  @IsInt()
  @Min(1)
  @Max(365)
  dias_duracion: number;

  @IsString()
  @MaxLength(300)
  motivo: string;

  @IsOptional()
  @IsInt()
  id_reclamo?: number;
}
