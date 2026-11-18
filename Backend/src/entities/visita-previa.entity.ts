import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('visitas_previas')
export class VisitaPrevia {
  @PrimaryGeneratedColumn({ name: 'id_visita' })
  id_visita: number;

  @Column({ type: 'int' })
  id_oferta: number;

  @Column({ type: 'timestamp without time zone' })
  fecha_propuesta: Date;

  @Column({ type: 'boolean', nullable: true })
  aceptada_cliente: boolean | null;

  @Column({ type: 'varchar', length: 500, nullable: true })
  resultado: string | null;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  precio_definitivo: number | null;

  @Column({ type: 'varchar', length: 20, default: 'propuesta' })
  estado: string;
}