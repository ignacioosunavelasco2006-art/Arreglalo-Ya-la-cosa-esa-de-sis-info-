import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('categorias_servicio')
export class CategoriaServicio {
  @PrimaryGeneratedColumn({ name: 'id_categoria' })
  id_categoria: number;

  @Column({ type: 'varchar', length: 60, unique: true })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;
}