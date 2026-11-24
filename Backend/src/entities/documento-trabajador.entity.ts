import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('documentos_trabajador')
export class DocumentoTrabajador {
  @PrimaryGeneratedColumn({ name: 'id_documento' })
  id_documento: number;

  @Column({ type: 'int' })
  id_trabajador: number;

  @Column({ type: 'varchar', length: 30 })
  tipo: string;

  @Column({ type: 'varchar', length: 300 })
  ruta_archivo: string;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_subida: Date;
}
