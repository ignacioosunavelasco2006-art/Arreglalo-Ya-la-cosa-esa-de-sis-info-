import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { ParametroSistema } from '../entities/parametro-sistema.entity';
import { Notificacion } from '../entities/notificacion.entity';
import { BitacoraAuditoria } from '../entities/bitacora-auditoria.entity';

import { CrearParametroDto } from './dto/crear-parametro.dto';
import { ActualizarParametroDto } from './dto/actualizar-parametro.dto';

// CU-34: "valor fuera de rango, se rechaza".
// ⚠ AJUSTA las claves a las que tengas en tu tabla parametros_sistema.
// Los rangos de porcentajes están en "porcentaje entero" (5 = 5 %).
const RANGOS: Record<string, [number, number]> = {
  comision: [0, 30],
  anticipo: [0, 100],
  umbral_incidentes: [2, 3], // RF-08: 2 o 3
  dias_reclamo: [1, 30],
  dias_devolucion: [1, 15],
  horas_cancelacion: [0, 72],
  dias_vigencia_solicitud: [1, 90],
};

@Injectable()
export class SistemaService {
  private readonly logger = new Logger(SistemaService.name);

  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(ParametroSistema)
    private readonly parametroRepository: Repository<ParametroSistema>,
    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,
    @InjectRepository(BitacoraAuditoria)
    private readonly auditoriaRepository: Repository<BitacoraAuditoria>,
  ) {}

  // ---------------------------------------------------------------
  // HELPERS PARA OTROS MÓDULOS (no son endpoints)
  // ---------------------------------------------------------------

  // RF-35: crea una notificación. Un fallo aquí nunca debe romper la operación principal.
  async notificar(
    idUsuario: number,
    tipo: string,
    mensaje: string,
    canal = 'web',
  ) {
    try {
      return await this.notificacionRepository.save(
        this.notificacionRepository.create({
          id_usuario: idUsuario,
          tipo: tipo.slice(0, 40),
          mensaje: mensaje.slice(0, 300),
          canal,
        }),
      );
    } catch (error) {
      this.logger.warn(`No se pudo notificar al usuario ${idUsuario}: ${error}`);
      return null;
    }
  }

  // RNF-07 / CU-01: deja huella de quién hizo qué y cuándo.
  async auditar(
    idUsuario: number | null,
    accion: string,
    entidad?: string | null,
    idEntidad?: number | null,
    detalle?: string | null,
  ) {
    try {
      return await this.auditoriaRepository.save(
        this.auditoriaRepository.create({
          id_usuario: idUsuario,
          accion: accion.slice(0, 60),
          entidad: entidad ? entidad.slice(0, 60) : null,
          id_entidad: idEntidad ?? null,
          detalle: detalle ? detalle.slice(0, 500) : null,
        }),
      );
    } catch (error) {
      this.logger.warn(`No se pudo auditar "${accion}": ${error}`);
      return null;
    }
  }

  // Notifica a TODOS los usuarios activos que tengan un rol (ej. avisar a los supervisores).
  async notificarRol(rol: string, tipo: string, mensaje: string) {
    const destinatarios: { id_usuario: number }[] = await this.dataSource.query(
      `SELECT DISTINCT u.id_usuario
         FROM usuarios u
         JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
         JOIN roles r ON r.id_rol = ur.id_rol
        WHERE r.nombre = $1 AND u.estado <> 'eliminada'`,
      [rol],
    );
    for (const d of destinatarios) {
      await this.notificar(d.id_usuario, tipo, mensaje);
    }
    return destinatarios.length;
  }

  // Igual que notificarRol, pero sin repetir el mismo aviso a cada usuario del rol.
  async notificarRolUnaVez(rol: string, tipo: string, mensaje: string) {
    const destinatarios: { id_usuario: number }[] = await this.dataSource.query(
      `SELECT DISTINCT u.id_usuario
         FROM usuarios u
         JOIN usuario_roles ur ON ur.id_usuario = u.id_usuario
         JOIN roles r ON r.id_rol = ur.id_rol
        WHERE r.nombre = $1 AND u.estado <> 'eliminada'`,
      [rol],
    );
    for (const d of destinatarios) {
      await this.notificarUnaVez(d.id_usuario, tipo, mensaje);
    }
    return destinatarios.length;
  }

  // Para recordatorios de tareas programadas: no repite el mismo aviso al mismo usuario.
  async notificarUnaVez(idUsuario: number, tipo: string, mensaje: string) {
    const existe = await this.notificacionRepository.findOneBy({
      id_usuario: idUsuario,
      tipo: tipo.slice(0, 40),
      mensaje: mensaje.slice(0, 300),
    });
    if (existe) return null;
    return this.notificar(idUsuario, tipo, mensaje);
  }

  // RF-34: lee un parámetro numérico; si no existe usa el valor por defecto.
  async obtenerNumero(clave: string, defecto: number): Promise<number> {
    const parametro = await this.parametroRepository.findOneBy({ clave });
    const numero = parametro ? Number(parametro.valor.replace(',', '.')) : NaN;
    return Number.isFinite(numero) ? numero : defecto;
  }

  // Devuelve una fracción: acepta "5" (= 5 %) o "0.05" y entrega 0.05.
  // Regla: un valor >= 1 es un porcentaje entero; uno menor a 1 ya es una fracción.
  async obtenerPorcentaje(clave: string, defecto: number): Promise<number> {
    const numero = await this.obtenerNumero(clave, defecto);
    return numero >= 1 ? numero / 100 : numero;
  }

  // ---------------------------------------------------------------
  // PARÁMETROS (RF-34)
  // ---------------------------------------------------------------

  async crearParametro(dto: CrearParametroDto, idUsuario: number) {
    const parametro = this.parametroRepository.create({
      ...dto,
      id_modificado_por: idUsuario,
    });
    const guardado = await this.parametroRepository.save(parametro);
    await this.auditar(idUsuario, 'parametro_creado', 'parametros_sistema', null, guardado.clave);
    return guardado;
  }

  obtenerParametros() {
    return this.parametroRepository.find({ order: { clave: 'ASC' } });
  }

  async obtenerParametro(clave: string) {
    const parametro = await this.parametroRepository.findOneBy({ clave });
    if (!parametro) throw new NotFoundException('Parámetro no encontrado');
    return parametro;
  }

  // Solo se toca el valor (y la descripción): el autor sale del token, no del body.
  async actualizarParametro(
    clave: string,
    dto: ActualizarParametroDto,
    idUsuario: number,
  ) {
    const parametro = await this.obtenerParametro(clave);

    if (dto.valor === undefined || dto.valor === null) {
      throw new BadRequestException('El valor es obligatorio');
    }
    this.validarRango(clave, String(dto.valor));

    const anterior = parametro.valor;
    parametro.valor = String(dto.valor);
    const descripcion = (dto as { descripcion?: string }).descripcion;
    if (descripcion !== undefined) parametro.descripcion = descripcion;
    parametro.id_modificado_por = idUsuario; // "guarda el cambio con fecha y autor" (CU-34)
    parametro.fecha_modificacion = new Date();

    const guardado = await this.parametroRepository.save(parametro);
    await this.auditar(
      idUsuario,
      'parametro_modificado',
      'parametros_sistema',
      null,
      `${clave}: ${anterior} -> ${guardado.valor}`,
    );
    return guardado;
  }

  private validarRango(clave: string, valor: string) {
    const rango = RANGOS[clave];
    if (!rango) return;
    const numero = Number(valor.replace(',', '.'));
    if (!Number.isFinite(numero) || numero < rango[0] || numero > rango[1]) {
      throw new BadRequestException(
        `Valor fuera de rango para "${clave}" (permitido: ${rango[0]} a ${rango[1]})`,
      );
    }
  }

  // ---------------------------------------------------------------
  // NOTIFICACIONES (RF-35): cada usuario solo ve y marca las suyas
  // ---------------------------------------------------------------

  obtenerMias(idUsuario: number) {
    return this.notificacionRepository.find({
      where: { id_usuario: idUsuario },
      order: { fecha_envio: 'DESC' },
      take: 100,
    });
  }

  async marcarLeida(id: number, idUsuario: number) {
    const notificacion = await this.notificacionRepository.findOneBy({
      id_notificacion: id,
    });
    if (!notificacion) throw new NotFoundException('Notificación no encontrada');
    if (notificacion.id_usuario !== idUsuario) {
      throw new ForbiddenException('Esta notificación no es tuya');
    }
    notificacion.leida = true;
    return this.notificacionRepository.save(notificacion);
  }

  async marcarTodasLeidas(idUsuario: number) {
    const resultado = await this.notificacionRepository.update(
      { id_usuario: idUsuario, leida: false },
      { leida: true },
    );
    return { marcadas: resultado.affected ?? 0 };
  }

  // ---------------------------------------------------------------
  // BITÁCORA (solo lectura: una auditoría editable no sirve)
  // ---------------------------------------------------------------

  obtenerAuditoria(filtros: { id_usuario?: number;  accion?: string; entidad?: string; id_entidad?: number; limite?: number }) {
    const limite = Math.min(Math.max(filtros.limite ?? 200, 1), 1000);
    return this.auditoriaRepository.find({
      where: {
        ...(filtros.id_usuario !== undefined ? { id_usuario: filtros.id_usuario } : {}),
        ...(filtros.accion ? { accion: filtros.accion } : {}),
        ...(filtros.entidad ? { entidad: filtros.entidad } : {}),
        ...(filtros.id_entidad !== undefined ? { id_entidad: filtros.id_entidad } : {}),
      },
      order: { fecha: 'DESC' },
      take: limite,
    });
  }
}
