import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('reclamo_evidencias')
export class ReclamoEvidencia {
  @PrimaryGeneratedColumn({ name: 'id_evidencia' })
  id_evidencia: number;
 
  @Column({ type: 'integer' })
  id_reclamo: number;
 
  @Column({ type: 'varchar', length: 300 })
  ruta_archivo: string;
}
