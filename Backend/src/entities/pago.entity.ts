import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('pagos')
export class Pago {
  @PrimaryGeneratedColumn({ name: 'id_pago' })
  id_pago: number;
 
  @Column({ type: 'integer' })
  id_trabajo: number;
 
  @Column({ type: 'varchar', length: 20 })
  tipo: string;
 
  @Column({ type: 'varchar', length: 20 })
  medio: string;
 
  @Column({ type: 'numeric', precision: 10, scale: 2 })
  monto: number;
 
  @Column({ type: 'numeric', precision: 10, scale: 2, default: 0 })
  comision: number;
 
  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;
 
  @Column({ type: 'varchar', length: 100, nullable: true })
  referencia_pasarela: string | null;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha_pago: Date;
 
  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_limite: Date | null;
}
