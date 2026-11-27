import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ausencias_trabajador')
export class AusenciaTrabajador {
  @PrimaryGeneratedColumn({ name: 'id_ausencia' })
  id_ausencia: number;

  @Column({ type: 'int' })
  id_trabajador: number;

  @Column({ type: 'timestamp without time zone' })
  fecha_inicio: Date;

  @Column({ type: 'timestamp without time zone' })
  fecha_fin: Date;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo: string | null;

  // 'activa' | 'cancelada'
  @Column({ type: 'varchar', length: 20, default: 'activa' })
  estado: string;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_registro: Date;
}