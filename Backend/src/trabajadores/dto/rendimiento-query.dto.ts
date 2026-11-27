import { Type } from 'class-transformer';
import { IsDateString, IsInt, IsOptional, Min } from 'class-validator';

// GET /trabajadores/rendimiento?desde=2026-11-01&hasta=2026-11-30&id_trabajador=5
// Todos los filtros son opcionales: sin fechas se calcula todo el historial.
export class RendimientoQueryDto {
  @IsOptional()
  @IsDateString({}, { message: 'desde debe tener formato YYYY-MM-DD' })
  desde?: string;

  @IsOptional()
  @IsDateString({}, { message: 'hasta debe tener formato YYYY-MM-DD' })
  hasta?: string;

  // Solo lo usa el supervisor; al trabajador se le ignora y se usa el id de su token
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  id_trabajador?: number;
}
