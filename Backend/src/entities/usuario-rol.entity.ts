import { Entity, PrimaryColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Usuario } from './usuario.entity';
import { Rol } from './rol.entity';

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

  @ManyToOne(() => Usuario, (u) => u.usuarioRoles)
  @JoinColumn({ name: 'id_usuario', referencedColumnName: 'id_usuario' })
  usuario: Usuario;

  @ManyToOne(() => Rol, (r) => r.usuarioRoles)
  @JoinColumn({ name: 'id_rol', referencedColumnName: 'id_rol' })
  rol: Rol;
}