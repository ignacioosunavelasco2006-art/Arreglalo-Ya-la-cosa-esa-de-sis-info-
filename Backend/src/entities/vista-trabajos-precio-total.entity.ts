import { ViewEntity, ViewColumn } from 'typeorm';

@ViewEntity({ name: 'vista_trabajos_precio_total' })
export class VistaTrabajosPrecioTotal {
  @ViewColumn()
  id_trabajo: number;

  @ViewColumn()
  precio_final: number;

  @ViewColumn()
  total_incrementos: number;

  @ViewColumn()
  precio_total: number;
}