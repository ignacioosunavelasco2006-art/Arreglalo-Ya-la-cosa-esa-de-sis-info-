import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('bitacora_auditoria')
export class BitacoraAuditoria {
  @PrimaryGeneratedColumn({ name: 'id_bitacora', type: 'bigint' })
  id_bitacora: string;

  @Column({ type: 'int', nullable: true })
  id_usuario: number | null;

  @Column({ type: 'varchar', length: 60 })
  accion: string;

  @Column({ type: 'varchar', length: 60, nullable: true })
  entidad: string | null;

  @Column({ type: 'int', nullable: true })
  id_entidad: number | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  detalle: string | null;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha: Date;
}
