import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('incrementos_precio')
export class IncrementoPrecio {
  @PrimaryGeneratedColumn({ name: 'id_incremento' })
  id_incremento: number;

  @Column({ type: 'int' })
  id_trabajo: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  monto_adicional: number;

  @Column({ type: 'varchar', length: 500 })
  justificacion: string;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_solicitud: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_respuesta: Date | null;
}