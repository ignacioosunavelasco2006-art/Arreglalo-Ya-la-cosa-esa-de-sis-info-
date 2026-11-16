import { Entity, PrimaryColumn, Column } from 'typeorm';

@Entity('trabajador_categorias')
export class TrabajadorCategoria {
  @PrimaryColumn({ name: 'id_trabajador', type: 'int' })
  id_trabajador: number;

  @PrimaryColumn({ name: 'id_categoria', type: 'int' })
  id_categoria: number;

  @Column({ type: 'numeric', precision: 10, scale: 2, nullable: true })
  precio_estimado: number | null;
}