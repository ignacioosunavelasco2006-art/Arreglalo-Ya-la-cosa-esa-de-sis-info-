import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('solicitud_fotos')
export class SolicitudFoto {
  @PrimaryGeneratedColumn({ name: 'id_foto' })
  id_foto: number;

  @Column({ type: 'int' })
  id_solicitud: number;

  @Column({ type: 'varchar', length: 300 })
  ruta_archivo: string;
}