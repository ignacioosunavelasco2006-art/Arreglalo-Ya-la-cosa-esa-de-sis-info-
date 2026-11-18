import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('suspensiones')
export class Suspension {
  @PrimaryGeneratedColumn({ name: 'id_suspension' })
  id_suspension: number;

  @Column({ type: 'int' })
  id_usuario: number;

  @Column({ type: 'varchar', length: 20 })
  tipo: string;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo: string | null;

  @Column({ type: 'int' })
  dias_duracion: number;

  @Column({ type: 'timestamp' })
  fecha_inicio: Date;

  @Column({ type: 'timestamp' })
  fecha_fin: Date;

  @Column({ type: 'varchar', length: 20 })
  estado: string;

  @Column({ type: 'int', nullable: true })
  id_reclamo: number | null;

  @Column({ type: 'int', nullable: true })
  id_supervisor: number | null;
}
