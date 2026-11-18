import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('incidentes_trabajador')
export class IncidenteTrabajador {
  @PrimaryGeneratedColumn({ name: 'id_incidente' })
  id_incidente: number;
 
  @Column({ type: 'integer' })
  id_trabajador: number;
 
  @Column({ type: 'integer' })
  id_trabajo: number;
 
  @Column({ type: 'varchar', length: 20 })
  tipo: string;
 
  @Column({ type: 'boolean', default: false })
  anulado: boolean;
 
  @Column({ type: 'integer', nullable: true })
  id_supervisor_anula: number | null;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;
}
 