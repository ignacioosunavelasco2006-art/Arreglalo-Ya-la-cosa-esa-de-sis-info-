import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('devoluciones')
export class Devolucion {
  @PrimaryGeneratedColumn({ name: 'id_devolucion' })
  id_devolucion: number;
 
  @Column({ type: 'integer' })
  id_trabajo: number;
 
  @Column({ type: 'integer' })
  id_cliente: number;
 
  @Column({ type: 'integer', nullable: true })
  id_reclamo: number | null;
 
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  monto: number;
 
  @Column({ type: 'varchar', length: 500 })
  motivo: string;
 
  @Column({ type: 'varchar', length: 20, default: 'solicitada' })
  estado: string;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha_solicitud: Date;
 
  @Column({ type: 'integer', nullable: true })
  id_aprobado_por: number | null;
 
  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_aprobacion: Date | null;
 
  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo_rechazo: string | null;
 
  @Column({ type: 'integer', nullable: true })
  id_pago: number | null;
 
  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_procesamiento: Date | null;
}
 