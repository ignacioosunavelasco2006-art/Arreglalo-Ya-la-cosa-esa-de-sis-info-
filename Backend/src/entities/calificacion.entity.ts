import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('calificaciones')
export class Calificacion {
  @PrimaryGeneratedColumn({ name: 'id_calificacion' })
  id_calificacion: number;
 
  @Column({ type: 'integer', unique: true })
  id_trabajo: number;
 
  @Column({ type: 'integer' })
  id_cliente: number;
 
  @Column({ type: 'integer' })
  id_trabajador: number;
 
  @Column({ type: 'smallint' })
  puntaje: number;
 
  @Column({ type: 'varchar', length: 500, nullable: true })
  comentario: string | null;
 
  @Column({ type: 'varchar', length: 500, nullable: true })
  respuesta_trabajador: string | null;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha: Date;
}