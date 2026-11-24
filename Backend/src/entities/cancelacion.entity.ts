import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('cancelaciones')
export class Cancelacion {
  @PrimaryGeneratedColumn({ name: 'id_cancelacion' })
  id_cancelacion: number;
 
  @Column({ type: 'integer' })
  id_trabajo: number;
 
  @Column({ type: 'integer' })
  id_usuario: number;
 
  @Column({ type: 'varchar', length: 20 })
  cancelado_por: string;
 
  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo: string | null;
 
  @Column({ type: 'varchar', length: 20, default: 'aprobada' })
  estado: string;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha_solicitud: Date;
}
 