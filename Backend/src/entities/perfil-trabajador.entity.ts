import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('perfiles_trabajador')
export class PerfilTrabajador {
  @PrimaryColumn({ name: 'id_usuario', type: 'int' })
  id_usuario: number;

  @Column({ type: 'varchar', length: 20, unique: true })
  carnet_identidad: string;

  @Column({ type: 'varchar', length: 1000, nullable: true })
  descripcion: string | null;

  @Column({ type: 'smallint', default: 0 })
  anios_experiencia: number;

  @Column({ type: 'varchar', length: 300, nullable: true })
  foto_perfil: string | null;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado_verificacion: string;

  @Column({ type: 'numeric', precision: 3, scale: 2, default: 0 })
  calificacion_promedio: number;

  @Column({ type: 'int', default: 0 })
  total_calificaciones: number;

  @Column({ type: 'int', nullable: true })
  id_supervisor_revisor: number | null;

  @Column({ type: 'timestamp without time zone', nullable: true })
  fecha_decision: Date | null;

  @Column({ type: 'varchar', length: 300, nullable: true })
  motivo_rechazo: string | null;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_creacion: Date;
}
