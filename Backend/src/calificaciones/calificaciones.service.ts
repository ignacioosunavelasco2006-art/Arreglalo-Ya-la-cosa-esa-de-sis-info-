import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Calificacion } from '../entities/calificacion.entity';
import { CalificacionHistorial } from '../entities/calificacion-historial.entity';
import { CalificacionInternaCliente } from '../entities/calificacion-interna-cliente.entity';
import { Trabajo } from '../entities/trabajo.entity';

import { SistemaService } from '../sistema/sistema.service';
import { manejarErrorBd } from '../common/utilidades';

import { CrearCalificacionDto } from './dto/crear-calificacion.dto';
import { ActualizarCalificacionDto } from './dto/actualizar-calificacion.dto';
import { ResponderCalificacionDto } from './dto/responder-calificacion.dto';
import { CrearCalificacionInternaDto } from './dto/crear-calificacion-interna.dto';

const DIA_MS = 24 * 60 * 60 * 1000;

export interface UsuarioContexto {
  id_usuario: number;
  roles: string[];
}

@Injectable()
export class CalificacionesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    @InjectRepository(Calificacion)
    private readonly calificacionRepository: Repository<Calificacion>,
    @InjectRepository(CalificacionHistorial)
    private readonly historialRepository: Repository<CalificacionHistorial>,
    @InjectRepository(CalificacionInternaCliente)
    private readonly internaRepository: Repository<CalificacionInternaCliente>,
  ) {}

  // ===============================================================
  // HELPERS
  // ===============================================================

  private esSupervisor(u: UsuarioContexto) {
    return u.roles.includes('supervisor') || u.roles.includes('super_supervisor');
  }

  private async obtenerTrabajoTerminado(m: EntityManager, id_trabajo: number) {
    const trabajo = await m.findOne(Trabajo, { where: { id_trabajo } });
    if (!trabajo) throw new NotFoundException('Trabajo no encontrado');
    if (trabajo.estado !== 'terminado') {
      throw new BadRequestException('Solo se califican trabajos terminados');
    }
    return trabajo;
  }

  // Actualiza promedio y total en el perfil del trabajador (RF-06)
  private async recalcularPromedio(m: EntityManager, id_trabajador: number) {
    await m.query(
      `UPDATE perfiles_trabajador
          SET calificacion_promedio = COALESCE((SELECT ROUND(AVG(puntaje), 2)
                                                  FROM calificaciones
                                                 WHERE id_trabajador = $1), 0),
              total_calificaciones  = (SELECT COUNT(*)
                                         FROM calificaciones
                                        WHERE id_trabajador = $1)
        WHERE id_usuario = $1`,
      [id_trabajador],
    );
  }

  // La identidad del cliente solo se muestra a él mismo y a la supervisión
  private ocultarCliente(cal: Calificacion, usuario: UsuarioContexto) {
    if (this.esSupervisor(usuario) || usuario.id_usuario === cal.id_cliente) return cal;
    const { id_cliente, ...publica } = cal;
    return publica;
  }

  // ===============================================================
  // CALIFICACIÓN PÚBLICA (RF-27, RF-28)
  // ===============================================================

  async crear(idCliente: number, dto: CrearCalificacionDto) {
    try {
      const calificacion = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajoTerminado(m, dto.id_trabajo);
        if (trabajo.id_cliente !== idCliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }

        const guardada = await m.save(
          m.create(Calificacion, {
            id_trabajo: trabajo.id_trabajo,
            id_cliente: idCliente,
            id_trabajador: trabajo.id_trabajador,
            puntaje: dto.puntaje,
            comentario: dto.comentario?.trim() || null,
          }),
        );

        await this.recalcularPromedio(m, trabajo.id_trabajador);
        return guardada;
      });

      await this.sistema.notificar(
        calificacion.id_trabajador,
        'nueva_calificacion',
        `Recibiste una calificación de ${calificacion.puntaje}/5 por el trabajo #${calificacion.id_trabajo}. Puedes responderla.`,
      );
      await this.sistema.auditar(idCliente, 'calificacion_creada', 'calificaciones', calificacion.id_calificacion);
      return calificacion;
    } catch (e) {
      manejarErrorBd(e, 'Este trabajo ya fue calificado');
    }
  }

  // CU-27 flujo alterno: trabajos terminados que el cliente aún no calificó
  async pendientes(idCliente: number) {
    return this.dataSource.query(
      `SELECT t.id_trabajo, t.id_trabajador, t.fecha_cierre
         FROM trabajos t
        WHERE t.id_cliente = $1 AND t.estado = 'terminado'
          AND NOT EXISTS (SELECT 1 FROM calificaciones c WHERE c.id_trabajo = t.id_trabajo)
        ORDER BY t.fecha_cierre DESC`,
      [idCliente],
    );
  }

  // CU-28 / RN-15: el cliente ajusta su calificación mientras el trabajo siga "abierto",
  // es decir, dentro de la ventana de reclamo (7 días desde el cierre). Pasado ese plazo,
  // solo se modifica por un reclamo (ajustarPorReclamo). Cada cambio queda en el historial.
  async actualizar(id_calificacion: number, idCliente: number, dto: ActualizarCalificacionDto) {
    if (dto.puntaje === undefined && dto.comentario === undefined) {
      throw new BadRequestException('Indica el puntaje o el comentario a cambiar');
    }
    const diasVentana = await this.sistema.obtenerNumero('dias_reclamo', 7);

    const guardada = await this.dataSource.transaction(async (m) => {
      const cal = await m.findOne(Calificacion, { where: { id_calificacion } });
      if (!cal) throw new NotFoundException('Calificación no encontrada');
      if (cal.id_cliente !== idCliente) {
        throw new ForbiddenException('Solo el cliente que calificó puede modificarla');
      }

      const trabajo = await m.findOne(Trabajo, { where: { id_trabajo: cal.id_trabajo } });
      if (!trabajo) throw new NotFoundException('Trabajo no encontrado');

      const cierre = trabajo.fecha_cierre ? new Date(trabajo.fecha_cierre).getTime() : Date.now();
      if (Date.now() > cierre + diasVentana * DIA_MS) {
        throw new ForbiddenException(
          'El trabajo ya está cerrado: la calificación solo puede modificarse a través de un reclamo',
        );
      }

      if (dto.puntaje !== undefined && dto.puntaje !== cal.puntaje) {
        await m.insert(CalificacionHistorial, {
          id_calificacion,
          puntaje_anterior: cal.puntaje,
          puntaje_nuevo: dto.puntaje,
        });
        cal.puntaje = dto.puntaje;
      }
      if (dto.comentario !== undefined) cal.comentario = dto.comentario.trim() || null;

      const resultado = await m.save(cal);
      await this.recalcularPromedio(m, cal.id_trabajador);
      return resultado;
    });

    await this.sistema.auditar(idCliente, 'calificacion_actualizada', 'calificaciones', id_calificacion);
    return guardada;
  }

  // Lo usa ReclamosModule: el supervisor ajusta la calificación al resolver un reclamo (CU-28)
  async ajustarPorReclamo(id_calificacion: number, puntaje: number, idSupervisor: number) {
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
      throw new BadRequestException('El puntaje debe ser un entero entre 1 y 5');
    }

    const cal = await this.dataSource.transaction(async (m) => {
      const actual = await m.findOne(Calificacion, { where: { id_calificacion } });
      if (!actual) throw new NotFoundException('Calificación no encontrada');

      if (actual.puntaje !== puntaje) {
        await m.insert(CalificacionHistorial, {
          id_calificacion,
          puntaje_anterior: actual.puntaje,
          puntaje_nuevo: puntaje,
        });
        actual.puntaje = puntaje;
      }
      const guardada = await m.save(actual);
      await this.recalcularPromedio(m, actual.id_trabajador);
      return guardada;
    });

    await this.sistema.notificar(cal.id_trabajador, 'calificacion_ajustada', `Un supervisor ajustó una calificación de tu trabajo #${cal.id_trabajo} tras un reclamo.`);
    await this.sistema.auditar(idSupervisor, 'calificacion_ajustada_reclamo', 'calificaciones', id_calificacion);
    return cal;
  }

  // El trabajador responde a la calificación (CU-27 paso 3)
  async responder(id_calificacion: number, idTrabajador: number, dto: ResponderCalificacionDto) {
    const cal = await this.calificacionRepository.findOne({ where: { id_calificacion } });
    if (!cal) throw new NotFoundException('Calificación no encontrada');
    if (cal.id_trabajador !== idTrabajador) {
      throw new ForbiddenException('Solo el trabajador calificado puede responder');
    }

    cal.respuesta_trabajador = dto.respuesta.trim();
    const guardada = await this.calificacionRepository.save(cal);

    await this.sistema.notificar(cal.id_cliente, 'respuesta_calificacion', `El trabajador respondió tu calificación del trabajo #${cal.id_trabajo}.`);
    return guardada;
  }

  // ===============================================================
  // CALIFICACIÓN INTERNA DEL CLIENTE (RF-30): SOLO ADMINISTRACIÓN LA LEE
  // ===============================================================

  async crearInterna(idTrabajador: number, dto: CrearCalificacionInternaDto) {
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajoTerminado(m, dto.id_trabajo);
        if (trabajo.id_trabajador !== idTrabajador) {
          throw new ForbiddenException('El trabajo no pertenece a este trabajador');
        }

        await m.save(
          m.create(CalificacionInternaCliente, {
            id_trabajo: trabajo.id_trabajo,
            id_trabajador: idTrabajador,
            id_cliente: trabajo.id_cliente,
            puntaje: dto.puntaje,
            nota: dto.nota?.trim() || null,
          }),
        );
        // El trabajador recibe solo una confirmación: lo que se guarda lo ve únicamente el equipo
        return { mensaje: 'Calificación interna registrada' };
      });
    } catch (e) {
      manejarErrorBd(e, 'Este cliente ya fue calificado en este trabajo');
    }
  }

  // Solo supervisión (el controller lo exige con @Roles)
  obtenerInternasPorCliente(id_cliente: number) {
    return this.internaRepository.find({
      where: { id_cliente },
      order: { fecha: 'DESC' },
    });
  }

  // ===============================================================
  // CONSULTAS
  // ===============================================================

  async obtenerPorTrabajador(id_trabajador: number, usuario: UsuarioContexto) {
    const lista = await this.calificacionRepository.find({
      where: { id_trabajador },
      order: { fecha: 'DESC' },
    });
    return lista.map((c) => this.ocultarCliente(c, usuario));
  }

  async obtenerPorId(id_calificacion: number, usuario: UsuarioContexto) {
    const cal = await this.calificacionRepository.findOne({ where: { id_calificacion } });
    if (!cal) throw new NotFoundException('Calificación no encontrada');
    return this.ocultarCliente(cal, usuario);
  }

  // Trazabilidad (RN-15): el cliente dueño y la supervisión
  async obtenerHistorial(id_calificacion: number, usuario: UsuarioContexto) {
    const cal = await this.calificacionRepository.findOne({ where: { id_calificacion } });
    if (!cal) throw new NotFoundException('Calificación no encontrada');
    if (!this.esSupervisor(usuario) && usuario.id_usuario !== cal.id_cliente) {
      throw new ForbiddenException('No puedes ver el historial de esta calificación');
    }
    return this.historialRepository.find({
      where: { id_calificacion },
      order: { fecha_cambio: 'ASC' },
    });
  }
}
