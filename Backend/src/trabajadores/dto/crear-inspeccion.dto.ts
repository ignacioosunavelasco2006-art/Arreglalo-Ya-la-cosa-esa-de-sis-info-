import { IsDateString, IsInt } from 'class-validator';

// CU-10 paso 1: 'el supervisor programa fecha e inspector'.
export class CrearInspeccionDto {
  @IsInt()
  id_inspector: number;

  @IsDateString()
  fecha_programada: string;
}
