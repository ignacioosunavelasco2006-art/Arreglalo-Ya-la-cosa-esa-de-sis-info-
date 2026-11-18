import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('solicitudes_finalizacion')
export class SolicitudFinalizacion {
  @PrimaryGeneratedColumn({ name: 'id_finalizacion' })
  id_finalizacion: number;

  @Column({ type: 'int' })
  id_trabajo: number;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;

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