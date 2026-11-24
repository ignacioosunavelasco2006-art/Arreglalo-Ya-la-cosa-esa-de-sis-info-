import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('ofertas')
export class Oferta {
  @PrimaryGeneratedColumn({ name: 'id_oferta' })
  id_oferta: number;

  @Column({ type: 'int' })
  id_solicitud: number;

  @Column({ type: 'int' })
  id_trabajador: number;

  @Column({ type: 'numeric', precision: 10, scale: 2 })
  precio_estimado: number;

  @Column({ type: 'varchar', length: 500, nullable: true })
  comentario: string | null;

  @Column({ type: 'boolean', default: false })
  requiere_visita: boolean;

  @Column({ type: 'varchar', length: 20, default: 'pendiente' })
  estado: string;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_envio: Date;
}
