
import {
  Entity,
  PrimaryColumn,
  Column,
} from 'typeorm';

@Entity('usuario_roles')
export class UsuarioRol {
  @PrimaryColumn({ type: 'integer', name: 'id_usuario' })
  id_usuario: number;

  @PrimaryColumn({ type: 'integer', name: 'id_rol' })
  id_rol: number;

  @Column({
    type: 'timestamp without time zone',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_alta: Date;
}
