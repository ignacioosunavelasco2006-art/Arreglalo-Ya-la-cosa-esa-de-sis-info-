import { IsBoolean, IsInt, IsOptional, Matches, Max, Min } from 'class-validator';

const HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export class CrearDisponibilidadDto {
  @IsInt() @Min(1) @Max(7)
  dia_semana: number;

  @Matches(HORA, { message: 'hora_inicio debe tener formato HH:MM' })
  hora_inicio: string;

  @Matches(HORA, { message: 'hora_fin debe tener formato HH:MM' })
  hora_fin: string;

  @IsOptional() @IsBoolean()
  activa?: boolean;
}
