import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('calificaciones_internas_cliente')
export class CalificacionInternaCliente {
  @PrimaryGeneratedColumn({ name: 'id_calificacion_int' })
  id_calificacion_int: number;
 
  @Column({ type: 'integer', unique: true })
  id_trabajo: number;
 
  @Column({ type: 'integer' })
  id_trabajador: number;
 
  @Column({ type: 'integer' })
  id_cliente: number;
 
  @Column({ type: 'smallint' })
  puntaje: number;
 
  @Column({ type: 'varchar', length: 500, nullable: true })
  nota: string | null;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;
}