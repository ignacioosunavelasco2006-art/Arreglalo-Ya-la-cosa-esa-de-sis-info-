export class ActualizarInspeccionDto {
  fecha_programada?: string;
  estado?: string; // 'programada' | 'realizada' | 'reprogramada'
  resultado?: string;
  costo_transporte?: number;
}