import { IsDateString } from 'class-validator';

export class ReprogramarInspeccionDto {
  @IsDateString()
  fecha_programada: string;
}
