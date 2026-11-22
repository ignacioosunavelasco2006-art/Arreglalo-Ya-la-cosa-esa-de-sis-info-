import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';

import { Reclamo } from '../entities/reclamo.entity';
import { ReclamoEvidencia } from '../entities/reclamo-evidencia.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';

import { SistemaService } from '../sistema/sistema.service';
import { PagosService } from '../pagos/pagos.service';
import { AdministracionService } from '../administracion/administracion.service';
import { CalificacionesService } from '../calificaciones/calificaciones.service';
import { manejarErrorBd } from '../common/Utilidades';

import { CrearReclamoDto } from './dto/crear-reclamo.dto';
import { AgregarEvidenciaDto } from './dto/agregar-evidencia.dto';
import { ResolverReclamoDto } from './dto/resolver-reclamo.dto';

const DIA_MS = 24 * 60 * 60 * 1000;

export interface UsuarioContexto {
  id_usuario: number;
  roles: string[];
}

@Injectable()
export class ReclamosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    private readonly pagosService: PagosService,
    private readonly administracion: AdministracionService,
    private readonly calificaciones: CalificacionesService,
    @InjectRepository(Reclamo)
    private readonly reclamoRepository: Repository<Reclamo>,
    @InjectRepository(ReclamoEvidencia)
    private readonly evidenciaRepository: Repository<ReclamoEvidencia>,
  ) {}

  // ===============================================================
  // HELPERS
  // ===============================================================

  private esSupervisor(u: UsuarioContexto) {
    return u.roles.includes('supervisor') || u.roles.includes('super_supervisor');
  }

  private async cambiarEstadoTrabajo(m: EntityManager, trabajo: Trabajo, estado_nuevo: string, id_usuario: number | null) {
    await m.update(Trabajo, { id_trabajo: trabajo.id_trabajo }, { estado: estado_nuevo });
    await m.insert(TrabajoHistorialEstado, {
      id_trabajo: trabajo.id_trabajo,
      estado_anterior: trabajo.estado,
      estado_nuevo,
      id_usuario,
    });
  }

  private async obtenerReclamo(id_reclamo: number) {
    const reclamo = await this.reclamoRepository.findOne({ where: { id_reclamo } });
    if (!reclamo) throw new NotFoundException('Reclamo no encontrado');
    return reclamo;
  }

  private async obtenerTrabajo(id_trabajo: number) {
    const trabajo = await this.dataSource.manager.findOne(Trabajo, { where: { id_trabajo } });
    if (!trabajo) throw new NotFoundException('Trabajo no encontrado');
    return trabajo;
  }

  // ===============================================================
  // PRESENTAR RECLAMO (RF-29, CU-29, RN-07)
  // ===============================================================

  async crear(idCliente: number, dto: CrearReclamoDto) {
    // RN-07: el plazo viene del parámetro configurable (por defecto 7 días)
    const diasPlazo = await this.sistema.obtenerNumero('dias_reclamo', 7);
    const evidencias = dto.evidencias ?? [];

    try {
      const { reclamo, trabajo } = await this.dataSource.transaction(async (m) => {
        const trabajo = await m.findOne(Trabajo, { where: { id_trabajo: dto.id_trabajo } });
        if (!trabajo) throw new NotFoundException('Trabajo no encontrado');

        if (trabajo.id_cliente !== idCliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        if (trabajo.estado === 'en_reclamo') {
          throw new ConflictException('Este trabajo ya tiene un reclamo en curso');
        }
        if (trabajo.estado !== 'terminado' || !trabajo.fecha_cierre) {
          throw new BadRequestException('Solo se puede reclamar un trabajo terminado');
        }

        // Un solo reclamo por trabajo (evita duplicados)
        const previo = await m.findOne(Reclamo, { where: { id_trabajo: trabajo.id_trabajo } });
        if (previo) throw new ConflictException('Este trabajo ya fue reclamado');

        const limite = new Date(trabajo.fecha_cierre).getTime() + diasPlazo * DIA_MS;
        if (Date.now() > limite) {
          throw new BadRequestException(`El plazo de ${diasPlazo} días para reclamar ya venció`);
        }

        const reclamo = await m.save(
          m.create(Reclamo, {
            id_trabajo: trabajo.id_trabajo,
            id_cliente: idCliente,
            descripcion: dto.descripcion.trim(),
          }),
        );

        for (const ruta of evidencias) {
          await m.insert(ReclamoEvidencia, { id_reclamo: reclamo.id_reclamo, ruta_archivo: ruta });
        }

        await this.cambiarEstadoTrabajo(m, trabajo, 'en_reclamo', idCliente);
        return { reclamo, trabajo };
      });

      // CU-29 paso 3: "notifica al supervisor y al trabajador"
      await this.sistema.notificarRol('supervisor', 'reclamo_nuevo', `Nuevo reclamo #${reclamo.id_reclamo} sobre el trabajo #${trabajo.id_trabajo}.`);
      await this.sistema.notificar(trabajo.id_trabajador, 'reclamo_recibido', `El cliente presentó un reclamo sobre el trabajo #${trabajo.id_trabajo}. Un supervisor lo revisará.`);
      await this.sistema.auditar(idCliente, 'reclamo_presentado', 'reclamos', reclamo.id_reclamo, `trabajo ${trabajo.id_trabajo}`);
      return reclamo;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // ===============================================================
  // EVIDENCIAS: las dos partes del trabajo pueden aportar (CU-33 "consulta a las partes")
  // ===============================================================

  async agregarEvidencia(id_reclamo: number, idUsuario: number, dto: AgregarEvidenciaDto) {
    const reclamo = await this.obtenerReclamo(id_reclamo);
    const trabajo = await this.obtenerTrabajo(reclamo.id_trabajo);

    if (idUsuario !== reclamo.id_cliente && idUsuario !== trabajo.id_trabajador) {
      throw new ForbiddenException('Solo las partes del trabajo pueden agregar evidencias');
    }
    if (['resuelto', 'improcedente'].includes(reclamo.estado)) {
      throw new BadRequestException('El reclamo ya está cerrado');
    }
    const cantidad = await this.evidenciaRepository.count({ where: { id_reclamo } });
    if (cantidad >= 20) throw new BadRequestException('Máximo 20 evidencias por reclamo');

    const guardada = await this.evidenciaRepository.save(
      this.evidenciaRepository.create({ id_reclamo, ruta_archivo: dto.ruta_archivo }),
    );
    await this.sistema.auditar(idUsuario, 'reclamo_evidencia', 'reclamos', id_reclamo);
    return guardada;
  }

  // ===============================================================
  // REVISIÓN Y RESOLUCIÓN (RF-33, CU-33)
  // ===============================================================

  async tomarEnRevision(id_reclamo: number, idSupervisor: number) {
    const reclamo = await this.obtenerReclamo(id_reclamo);
    if (reclamo.estado !== 'abierto') {
      throw new BadRequestException('El reclamo no está abierto');
    }

    reclamo.estado = 'en_revision';
    reclamo.id_supervisor = idSupervisor;

    try {
      const guardado = await this.reclamoRepository.save(reclamo);
      const trabajo = await this.obtenerTrabajo(reclamo.id_trabajo);
      await this.sistema.notificar(reclamo.id_cliente, 'reclamo_en_revision', `Tu reclamo #${id_reclamo} está siendo revisado por un supervisor.`);
      await this.sistema.notificar(trabajo.id_trabajador, 'reclamo_en_revision', `El reclamo #${id_reclamo} sobre tu trabajo #${trabajo.id_trabajo} está en revisión. Puedes aportar evidencias.`);
      await this.sistema.auditar(idSupervisor, 'reclamo_en_revision', 'reclamos', id_reclamo);
      return guardado;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // CU-33 flujo alterno: "si el caso es grave, lo escala al super supervisor"
  async escalar(id_reclamo: number, idSupervisor: number) {
    const reclamo = await this.obtenerReclamo(id_reclamo);
    if (reclamo.estado !== 'en_revision') {
      throw new BadRequestException('Solo se escalan reclamos en revisión');
    }
    if (reclamo.id_supervisor !== idSupervisor) {
      throw new ForbiddenException('Solo el supervisor asignado puede escalar el reclamo');
    }
    if (reclamo.escalado_super) {
      throw new ConflictException('El reclamo ya fue escalado');
    }

    reclamo.escalado_super = true;
    const guardado = await this.reclamoRepository.save(reclamo);

    await this.sistema.notificarRol('super_supervisor', 'reclamo_escalado', `El reclamo #${id_reclamo} fue escalado: requiere tu decisión.`);
    await this.sistema.auditar(idSupervisor, 'reclamo_escalado', 'reclamos', id_reclamo);
    return guardado;
  }

  // Aplica de verdad lo decidido: devolución, sanción, suspensión y/o ajuste de calificación.
  async resolver(id_reclamo: number, usuario: UsuarioContexto, dto: ResolverReclamoDto) {
    const esSuper = usuario.roles.includes('super_supervisor');
    const reclamo = await this.obtenerReclamo(id_reclamo);

    if (reclamo.estado !== 'en_revision') {
      throw new BadRequestException('El reclamo debe estar en revisión para resolverse');
    }
    // Escalado: lo resuelve el super supervisor. Si no, el supervisor asignado (o un super).
    if (reclamo.escalado_super) {
      if (!esSuper) throw new ForbiddenException('Este reclamo fue escalado: lo resuelve el super supervisor');
    } else if (reclamo.id_supervisor !== usuario.id_usuario && !esSuper) {
      throw new ForbiddenException('Solo el supervisor asignado puede resolver el reclamo');
    }

    // Validaciones previas, antes de aplicar ningún efecto
    if (dto.decision === 'devolver_dinero' && !dto.monto_devolucion) {
      throw new BadRequestException('Indica monto_devolucion para devolver dinero');
    }
    if (dto.decision === 'suspender' && !dto.dias_suspension) {
      throw new BadRequestException('Indica dias_suspension para suspender');
    }

    const trabajo = await this.obtenerTrabajo(reclamo.id_trabajo);
    const efectos: string[] = [];

    // ---- Efectos (cada uno con su propia validación y transacción) ----
    if (dto.decision === 'devolver_dinero') {
      await this.pagosService.devolverPorReclamo(
        trabajo.id_trabajo,
        dto.monto_devolucion!,
        `Devolución por reclamo #${id_reclamo}`,
        id_reclamo,
        usuario.id_usuario,
      );
      efectos.push(`devolución de Bs ${dto.monto_devolucion!.toFixed(2)}`);
    }

    if (dto.decision === 'sancionar') {
      // Queda en el historial del trabajador y cuenta para la suspensión automática (RF-08)
      await this.administracion.registrarIncidente(
        { id_trabajador: trabajo.id_trabajador, id_trabajo: trabajo.id_trabajo, tipo: 'reclamo' },
        usuario.id_usuario,
      );
      efectos.push('sanción registrada en el historial del trabajador');
    }

    if (dto.decision === 'suspender') {
      await this.administracion.sancionar(
        {
          id_usuario: trabajo.id_trabajador,
          dias_duracion: dto.dias_suspension!,
          motivo: `Reclamo #${id_reclamo}: ${dto.resolucion}`.slice(0, 300),
          id_reclamo,
        },
        usuario.id_usuario,
      );
      efectos.push(`suspensión de ${dto.dias_suspension} día(s)`);
    }

    if (dto.nuevo_puntaje !== undefined) {
      const [cal] = await this.dataSource.query(
        `SELECT id_calificacion FROM calificaciones WHERE id_trabajo = $1`,
        [trabajo.id_trabajo],
      );
      if (cal) {
        await this.calificaciones.ajustarPorReclamo(cal.id_calificacion, dto.nuevo_puntaje, usuario.id_usuario);
        efectos.push(`calificación ajustada a ${dto.nuevo_puntaje}`);
      }
    }

    // ---- Cierre del reclamo ----
    try {
      const guardado = await this.dataSource.transaction(async (m) => {
        const actual = await m.findOne(Reclamo, { where: { id_reclamo } });
        if (!actual || actual.estado !== 'en_revision') {
          throw new ConflictException('El reclamo ya fue resuelto por otra persona');
        }

        actual.estado = dto.decision === 'desestimar' ? 'improcedente' : 'resuelto';
        actual.resolucion = dto.resolucion.trim();
        actual.fecha_resolucion = new Date();
        const resultado = await m.save(actual);

        // El trabajo vuelve a 'terminado' al cerrarse el reclamo
        const t = await m.findOne(Trabajo, { where: { id_trabajo: actual.id_trabajo } });
        if (t && t.estado === 'en_reclamo') {
          await this.cambiarEstadoTrabajo(m, t, 'terminado', usuario.id_usuario);
        }
        return resultado;
      });

      // "el sistema registra, aplica y notifica"
      const resumen = efectos.length ? ` Medidas: ${efectos.join('; ')}.` : '';
      const textoCliente = dto.decision === 'desestimar'
        ? `Tu reclamo #${id_reclamo} fue desestimado: ${dto.resolucion}`
        : `Tu reclamo #${id_reclamo} fue resuelto: ${dto.resolucion}.${resumen}`;
      await this.sistema.notificar(reclamo.id_cliente, 'reclamo_resuelto', textoCliente);
      await this.sistema.notificar(
        trabajo.id_trabajador,
        'reclamo_resuelto',
        dto.decision === 'desestimar'
          ? `El reclamo #${id_reclamo} sobre tu trabajo fue desestimado.`
          : `El reclamo #${id_reclamo} sobre tu trabajo fue resuelto: ${dto.resolucion}.${resumen}`,
      );
      await this.sistema.auditar(usuario.id_usuario, `reclamo_${dto.decision}`, 'reclamos', id_reclamo, efectos.join('; ') || null);
      return { ...guardado, medidas_aplicadas: efectos };
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // ===============================================================
  // CONSULTAS (con control de acceso)
  // ===============================================================

  listar(estado?: string) {
    return this.reclamoRepository.find({
      where: estado ? { estado } : {},
      order: { fecha_reclamo: 'DESC' },
    });
  }

  misReclamos(idCliente: number) {
    return this.reclamoRepository.find({
      where: { id_cliente: idCliente },
      order: { fecha_reclamo: 'DESC' },
    });
  }

  // El trabajador ve los reclamos sobre sus trabajos (sin datos del cliente)
  async reclamosContraMi(idTrabajador: number) {
    return this.dataSource.query(
      `SELECT r.id_reclamo, r.id_trabajo, r.descripcion, r.estado, r.resolucion,
              r.fecha_reclamo, r.fecha_resolucion
         FROM reclamos r JOIN trabajos t ON t.id_trabajo = r.id_trabajo
        WHERE t.id_trabajador = $1
        ORDER BY r.fecha_reclamo DESC`,
      [idTrabajador],
    );
  }

  async obtenerPorId(id_reclamo: number, usuario: UsuarioContexto) {
    const reclamo = await this.obtenerReclamo(id_reclamo);
    const trabajo = await this.obtenerTrabajo(reclamo.id_trabajo);

    const esParte = usuario.id_usuario === reclamo.id_cliente || usuario.id_usuario === trabajo.id_trabajador;
    if (!esParte && !this.esSupervisor(usuario)) {
      throw new ForbiddenException('No participas en este reclamo');
    }

    const evidencias = await this.evidenciaRepository.find({ where: { id_reclamo } });
    return { ...reclamo, evidencias };
  }

  // Sección 8.14: "el administrador necesita una vista consolidada antes de decidir":
  // historial de estados, precio acordado, incrementos, pagos, calificación y devoluciones.
  async obtenerCaso(id_reclamo: number) {
    const reclamo = await this.obtenerReclamo(id_reclamo);
    const idTrabajo = reclamo.id_trabajo;

    const [trabajo] = await this.dataSource.query(
      `SELECT t.*, v.precio_total::float AS precio_total, v.total_incrementos::float AS total_incrementos
         FROM trabajos t LEFT JOIN vista_trabajos_precio_total v ON v.id_trabajo = t.id_trabajo
        WHERE t.id_trabajo = $1`,
      [idTrabajo],
    );
    const historial = await this.dataSource.query(
      `SELECT * FROM trabajo_historial_estados WHERE id_trabajo = $1 ORDER BY fecha_cambio`,
      [idTrabajo],
    );
    const incrementos = await this.dataSource.query(
      `SELECT * FROM incrementos_precio WHERE id_trabajo = $1 ORDER BY fecha_solicitud`,
      [idTrabajo],
    );
    const finalizaciones = await this.dataSource.query(
      `SELECT * FROM solicitudes_finalizacion WHERE id_trabajo = $1 ORDER BY fecha_solicitud`,
      [idTrabajo],
    );
    const pagos = await this.dataSource.query(
      `SELECT * FROM pagos WHERE id_trabajo = $1 ORDER BY fecha_pago`,
      [idTrabajo],
    );
    const devoluciones = await this.dataSource.query(
      `SELECT * FROM devoluciones WHERE id_trabajo = $1 ORDER BY fecha_solicitud`,
      [idTrabajo],
    );
    const [calificacion] = await this.dataSource.query(
      `SELECT * FROM calificaciones WHERE id_trabajo = $1`,
      [idTrabajo],
    );
    const evidencias = await this.evidenciaRepository.find({ where: { id_reclamo } });

    return { reclamo, evidencias, trabajo, historial, incrementos, finalizaciones, pagos, devoluciones, calificacion: calificacion ?? null };
  }
}
