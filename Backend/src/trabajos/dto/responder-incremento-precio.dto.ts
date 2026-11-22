import { IsBoolean } from 'class-validator';

export class ResponderIncrementoPrecioDto {
  @IsBoolean()
  aceptar: boolean;
}
