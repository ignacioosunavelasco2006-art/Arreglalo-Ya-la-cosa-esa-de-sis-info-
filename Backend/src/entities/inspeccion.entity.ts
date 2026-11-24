import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('inspecciones')
export class Inspeccion {
  @PrimaryGeneratedColumn({ name: 'id_inspeccion' })
  id_inspeccion: number;

  @Column({ type: 'int' })
  id_trabajador: number;

  @Column({ type: 'int' })
  id_supervisor: number;

  @Column({ type: 'int' })
  id_inspector: number;

  @Column({ type: 'timestamp without time zone' })
  fecha_programada: Date;

  @Column({ type: 'varchar', length: 20, default: 'programada' })
  estado: string;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resultado: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  costo_transporte: number | null;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_registro: Date;
}
