import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('trabajo_historial_estados')
export class TrabajoHistorialEstado {
  @PrimaryGeneratedColumn({ name: 'id_historial' })
  id_historial: number;

  @Column({ type: 'int' })
  id_trabajo: number;

  @Column({ type: 'varchar', length: 25, nullable: true })
  estado_anterior: string | null;

  @Column({ type: 'varchar', length: 25 })
  estado_nuevo: string;

  // null = cambio hecho por el sistema
  @Column({ type: 'int', nullable: true })
  id_usuario: number | null;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_cambio: Date;
}