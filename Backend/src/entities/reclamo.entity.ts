import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('reclamos')
export class Reclamo {
  @PrimaryGeneratedColumn({ name: 'id_reclamo' })
  id_reclamo: number;
 
  @Column({ type: 'integer' })
  id_trabajo: number;
 
  @Column({ type: 'integer' })
  id_cliente: number;
 
  @Column({ type: 'integer', nullable: true })
  id_supervisor: number | null;
 
  @Column({ type: 'text' })
  descripcion: string;
 
  @Column({ type: 'varchar', length: 20, default: 'abierto' })
  estado: string;
 
  @Column({ type: 'varchar', length: 500, nullable: true })
  resolucion: string | null;
 
  @Column({ type: 'boolean', default: false })
  escalado_super: boolean;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha_reclamo: Date;
 
  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_resolucion: Date | null;
}
