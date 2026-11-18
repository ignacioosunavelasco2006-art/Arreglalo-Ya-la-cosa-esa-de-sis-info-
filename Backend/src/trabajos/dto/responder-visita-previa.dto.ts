export class ResponderVisitaPreviaDto {
  id_usuario: number;
  // 'aceptar_fecha' (cliente) | 'registrar_resultado' (trabajador)
  // | 'aceptar_precio' (cliente) | 'rechazar' (cliente)
  accion: string;
  resultado?: string; // para 'registrar_resultado'
  precio_definitivo?: number; // para 'registrar_resultado'
}