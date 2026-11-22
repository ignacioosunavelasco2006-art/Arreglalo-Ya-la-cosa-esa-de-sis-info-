import { IsInt } from 'class-validator';

export class SolicitarFinalizacionDto {
  @IsInt()
  id_trabajo: number;
}
