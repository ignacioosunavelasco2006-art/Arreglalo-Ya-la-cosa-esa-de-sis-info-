import { Entity, PrimaryColumn } from 'typeorm';

@Entity('trabajador_zonas')
export class TrabajadorZona {
  @PrimaryColumn({ name: 'id_trabajador', type: 'int' })
  id_trabajador: number;

  @PrimaryColumn({ name: 'id_zona', type: 'int' })
  id_zona: number;
}