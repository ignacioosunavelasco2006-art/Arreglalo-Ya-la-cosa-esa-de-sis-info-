import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

// ⚠ Compara con tu tabla datos_bancarios real; abajo en el README hay un CREATE TABLE
// por si aún no la tienes o difiere.
@Entity('datos_bancarios')
export class DatosBancarios {
  @PrimaryGeneratedColumn({ name: 'id_dato' })
  id_dato: number;

  @Column({ type: 'integer', unique: true })
  id_usuario: number;

  @Column({ type: 'varchar', length: 80 })
  banco: string;

  @Column({ type: 'varchar', length: 150 })
  titular: string;

  // Guardado CIFRADO (iv:tag:datos)
  @Column({ type: 'varchar', length: 255 })
  numero_cuenta: string;

  // Para mostrar '****1234' sin descifrar
  @Column({ type: 'varchar', length: 4 })
  ultimos_digitos: string;

  @Column({ type: 'timestamp without time zone', default: () => 'CURRENT_TIMESTAMP' })
  fecha_actualizacion: Date;
}
