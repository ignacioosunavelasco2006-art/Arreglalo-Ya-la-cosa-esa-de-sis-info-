import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('reprogramaciones_trabajo')
export class ReprogramacionTrabajo {
  @PrimaryGeneratedColumn({ name: 'id_reprogramacion' })
  id_reprogramacion: number;

  @Column({ type: 'int' })
  id_trabajo: number;

  @Column({ type: 'int' })
  id_solicitante: number;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_inicio_anterior: Date | null;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_fin_anterior: Date | null;

  @Column({ type: 'timestamp without time zone' })
  fecha_inicio_propuesta: Date;

  @Column({ type: 'timestamp without time zone' })
  fecha_fin_propuesta: Date;

  @Column({ type: 'varchar', length: 500 })
  motivo: string;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;

  @Column({ type: 'int', nullable: true })
  id_respondido_por: number | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo_rechazo: string | null;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_solicitud: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_respuesta: Date | null;
}