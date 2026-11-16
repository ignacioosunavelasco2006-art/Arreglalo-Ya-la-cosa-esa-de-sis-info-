import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('disponibilidad_trabajador')
export class DisponibilidadTrabajador {
  @PrimaryGeneratedColumn({ name: 'id_disponibilidad' })
  id_disponibilidad: number;

  @Column({ type: 'int' })
  id_trabajador: number;

  // 1 = lunes ... 7 = domingo
  @Column({ type: 'smallint' })
  dia_semana: number;

  @Column({ type: 'time' })
  hora_inicio: string;

  @Column({ type: 'time' })
  hora_fin: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_registro: Date;
}