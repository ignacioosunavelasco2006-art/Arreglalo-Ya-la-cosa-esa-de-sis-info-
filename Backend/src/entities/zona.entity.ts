import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity('zonas')
export class Zona {
  @PrimaryGeneratedColumn({ name: 'id_zona' })
  id_zona: number;

  @Column({ type: 'varchar', length: 100, unique: true })
  nombre: string;

  @Column({ type: 'boolean', default: true })
  activa: boolean;
}