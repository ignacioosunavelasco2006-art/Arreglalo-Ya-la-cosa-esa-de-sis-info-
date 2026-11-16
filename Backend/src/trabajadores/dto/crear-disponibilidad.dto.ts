export class CrearDisponibilidadDto {
  id_trabajador: number;
  dia_semana: number; // 1 = lunes ... 7 = domingo
  hora_inicio: string; // 'HH:MM'
  hora_fin: string; // 'HH:MM'
  activa?: boolean;
}