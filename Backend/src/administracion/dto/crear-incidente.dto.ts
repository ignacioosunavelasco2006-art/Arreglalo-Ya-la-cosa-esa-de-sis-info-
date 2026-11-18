import { IsInt, IsIn } from 'class-validator';

export class CrearIncidenteDto {
  @IsInt()
  id_trabajador: number;

  @IsInt()
  id_trabajo: number;

  @IsIn(['cancelacion', 'atraso'])
  tipo: string;
}
