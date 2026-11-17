import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('solicitudes_servicio')
export class SolicitudServicio {
  @PrimaryGeneratedColumn({ name: 'id_solicitud' })
  id_solicitud: number;

  @Column({ type: 'int' })
  id_cliente: number;

  @Column({ type: 'int' })
  id_categoria: number;

  @Column({ type: 'int' })
  id_zona: number;

  @Column({ type: 'text' })
  descripcion: string;

  @Column({ type: 'varchar', length: 250 })
  direccion_exacta: string;

  @Column({ type: 'timestamp without time zone' })
  fecha_deseada: Date;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  presupuesto_aproximado: number | null;

  @Column({ type: 'varchar', length: 20, default: 'abierta' })
  estado: string;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_publicacion: Date;

  @Column({ type: 'timestamp without time zone' })
  fecha_vencimiento: Date;
}