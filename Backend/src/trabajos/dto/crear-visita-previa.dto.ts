import { IsDateString, IsInt } from 'class-validator';

export class CrearVisitaPreviaDto {
  @IsInt()
  id_oferta: number;

  @IsDateString()
  fecha_propuesta: string;
}
