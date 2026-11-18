import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('trabajos')
export class Trabajo {
  @PrimaryGeneratedColumn({ name: 'id_trabajo' })
  id_trabajo: number;

  @Column({ type: 'int', unique: true })
  id_oferta: number;

  @Column({ type: 'int' })
  id_solicitud: number;

  @Column({ type: 'int' })
  id_cliente: number;

  @Column({ type: 'int' })
  id_trabajador: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio_final: number;

  @Column({ type: 'varchar', length: 20, default: 'plataforma' })
  metodo_pago: string;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_inicio_prog: Date | null;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_fin_prog: Date | null;

  @Column({ type: 'varchar', length: 25, default: 'pendiente_anticipo' })
  estado: string;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion: Date;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_cierre: Date | null;
}