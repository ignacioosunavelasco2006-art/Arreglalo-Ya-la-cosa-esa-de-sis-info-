import { IsInt } from 'class-validator';

// Reintento manual de una liquidación fallida (CU-25 flujo alterno). Solo supervisión.
export class LiquidarDto {
  @IsInt()
  id_trabajo: number;
}
