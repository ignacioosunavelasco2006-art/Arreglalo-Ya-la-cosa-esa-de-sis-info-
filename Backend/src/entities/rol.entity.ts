
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
} from 'typeorm';

@Entity('roles')
export class Rol {
  @PrimaryGeneratedColumn({ name: 'id_rol' })
  id_rol: number;

  @Column({ type: 'varchar', length: 30, unique: true })
  nombre: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string;
}
