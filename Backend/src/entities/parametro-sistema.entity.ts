import { Entity, Column } from 'typeorm';

@Entity('parametros_sistema')
export class ParametroSistema {
  @Column({ type: 'varchar', length: 50, primary: true })
  clave: string;

  @Column({ type: 'varchar', length: 100 })
  valor: string;

  @Column({ type: 'varchar', length: 200, nullable: true })
  descripcion: string | null;

  @Column({ type: 'int', nullable: true })
  id_modificado_por: number | null;

  @Column({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  fecha_modificacion: Date;
}
