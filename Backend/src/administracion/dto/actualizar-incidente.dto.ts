import { IsBoolean, IsInt, IsOptional } from 'class-validator';

export class ActualizarIncidenteDto {
  @IsOptional()
  @IsBoolean()
  anulado?: boolean;

  @IsOptional()
  @IsInt()
  id_supervisor_anula?: number;
}
