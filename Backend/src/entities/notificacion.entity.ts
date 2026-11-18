import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('notificaciones')
export class Notificacion {
  @PrimaryGeneratedColumn({ name: 'id_notificacion' })
  id_notificacion: number;

  @Column({ type: 'int' })
  id_usuario: number;

  @Column({ type: 'varchar', length: 40 })
  tipo: string;

  @Column({ type: 'varchar', length: 300 })
  mensaje: string;

  @Column({ type: 'varchar', length: 20 })
  canal: string;

  @Column({ type: 'boolean', default: false })
  leida: boolean;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_envio: Date;
}
