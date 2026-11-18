import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';
 
@Entity('calificaciones_historial')
export class CalificacionHistorial {
  @PrimaryGeneratedColumn({ name: 'id_historial' })
  id_historial: number;
 
  @Column({ type: 'integer' })
  id_calificacion: number;
 
  @Column({ type: 'smallint' })
  puntaje_anterior: number;
 
  @Column({ type: 'smallint' })
  puntaje_nuevo: number;
 
  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha_cambio: Date;
}