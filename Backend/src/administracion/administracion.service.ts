import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, LessThanOrEqual, Repository } from 'typeorm';

import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Suspension } from '../entities/suspension.entity';
import { Usuario } from '../entities/usuario.entity';
import { SistemaService } from '../sistema/sistema.service';
import { RegistrarIncidenteDto, SancionarDto } from './dto/administracion.dto';

const DIA_MS = 24 * 60 * 60 * 1000;

// RN-13 / RF-08: duración de cada suspensión automática según la secuencia de Fibonacci.
// ⚠ El informe es ambiguo: RF-08 dice "1, 2, 3 y 5 días" y el diagrama P7 dice "1, 2, 3, 5, 8…".
// Se implementa la secuencia completa; si el equipo prefiere topar en 5, recorta el arreglo.
const FIBONACCI = [1, 2, 3, 5, 8, 13, 21, 34];

const DIAS_SUSPENSION_VOLUNTARIA = 30; // RN-12
const DIAS_ELIMINACION = 60; // RN-12: 30 + 30
const ESTADOS_TRABAJO_VIVO = ['pendiente_anticipo', 'programado', 'en_camino', 'en_proceso'];

// ⚠ Estados de suspensión usados aquí: 'vigente' (ya lo usaba tu código),
// 'finalizada' y 'levantada'. Agrégalos al CHECK de tu SQL si lo hay.
@Injectable()
export class AdministracionService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    @InjectRepository(IncidenteTrabajador)
    private readonly incidenteRepository: Repository<IncidenteTrabajador>,
    @InjectRepository(Suspension)
    private readonly suspensionRepository: Repository<Suspension>,
  ) {}

  // ---------------------------------------------------------------
  // INCIDENTES (RF-08)
  // ---------------------------------------------------------------

  // Registro manual (supervisor/inspector). Los de cancelación del trabajador
  // los crea PagosService; después debe llamar a evaluarIncidentes().
  async registrarIncidente(dto: RegistrarIncidenteDto, idQuienRegistra: number) {
    let incidente: IncidenteTrabajador;
    try {
      incidente = await this.incidenteRepository.save(
        this.incidenteRepository.create({
          id_trabajador: dto.id_trabajador,
          id_trabajo: dto.id_trabajo,
          tipo: dto.tipo,
          anulado: false,
        }),
      );
    } catch (error) {
      if ((error as { code?: string }).code === '23503') {
        throw new BadRequestException('El trabajador o el trabajo no existe');
      }
      throw error;
    }

    await this.sistema.auditar(
      idQuienRegistra,
      'incidente_registrado',
      'incidentes_trabajador',
      incidente.id_incidente,
      `trabajador ${dto.id_trabajador}, tipo ${dto.tipo}`,
    );

    const suspension = await this.evaluarIncidentes(dto.id_trabajador);
    return { incidente, suspension_aplicada: suspension };
  }

  listarIncidentes(idTrabajador?: number) {
    return this.incidenteRepository.find({
      where: idTrabajador ? { id_trabajador: idTrabajador } : {},
      order: { fecha: 'DESC' },
    });
  }

  // CU-08 flujo alterno: el supervisor anula un incidente injustificado.
  // (No revierte una suspensión ya aplicada: para eso está "levantar".)
  async anularIncidente(id: number, idSupervisor: number) {
    const incidente = await this.incidenteRepository.findOneBy({ id_incidente: id });
    if (!incidente) throw new NotFoundException('Incidente no encontrado');
    if (incidente.anulado) throw new BadRequestException('El incidente ya está anulado');

    incidente.anulado = true;
    incidente.id_supervisor_anula = idSupervisor;
    const guardado = await this.incidenteRepository.save(incidente);

    await this.sistema.auditar(idSupervisor, 'incidente_anulado', 'incidentes_trabajador', id);
    return guardado;
  }

  // Cuenta los incidentes vigentes desde la última suspensión automática y,
  // si se alcanza el umbral (3, configurable en 2), suspende con Fibonacci.
  async evaluarIncidentes(idTrabajador: number): Promise<Suspension | null> {
    const umbral = Math.round(await this.sistema.obtenerNumero('umbral_incidentes', 3));

    const ultima = await this.suspensionRepository.findOne({
      where: { id_usuario: idTrabajador, tipo: 'automatica' },
      order: { fecha_inicio: 'DESC' },
    });
    const desde = ultima ? ultima.fecha_inicio : new Date(0);

    const acumulados = await this.incidenteRepository
      .createQueryBuilder('i')
      .where('i.id_trabajador = :id', { id: idTrabajador })
      .andWhere('i.anulado = false')
      .andWhere('i.fecha > :desde', { desde })
      .getCount();

    if (acumulados < umbral) return null;

    const previas = await this.suspensionRepository.count({
      where: { id_usuario: idTrabajador, tipo: 'automatica' },
    });
    const dias = FIBONACCI[Math.min(previas, FIBONACCI.length - 1)];

    try {
      return await this.aplicarSuspension({
        id_usuario: idTrabajador,
        tipo: 'automatica',
        dias,
        motivo: `Acumuló ${acumulados} incidentes (cancelaciones o atrasos)`,
      });
    } catch (error) {
      if (error instanceof ConflictException) return null; // ya estaba suspendido
      throw error;
    }
  }

  // ---------------------------------------------------------------
  // SUSPENSIONES (RF-07, RF-08, RF-33, RN-12, RN-18)
  // ---------------------------------------------------------------

  listarSuspensiones(idUsuario?: number) {
    return this.suspensionRepository.find({
      where: idUsuario ? { id_usuario: idUsuario } : {},
      order: { fecha_inicio: 'DESC' },
    });
  }

  // Sanción manual del supervisor (RF-33)
  async sancionar(dto: SancionarDto, idSupervisor: number) {
    return this.aplicarSuspension({
      id_usuario: dto.id_usuario,
      tipo: 'sancion',
      dias: dto.dias_duracion,
      motivo: dto.motivo,
      id_reclamo: dto.id_reclamo ?? null,
      id_supervisor: idSupervisor,
    });
  }

  // RF-07 / CU-07: el trabajador pausa su cuenta 30 días
  async suspenderVoluntaria(idUsuario: number) {
    const [{ n }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM trabajos
        WHERE id_trabajador = $1 AND estado = ANY($2)`,
      [idUsuario, ESTADOS_TRABAJO_VIVO],
    );
    if (n > 0) {
      throw new BadRequestException(
        'Tienes trabajos aceptados: cúmplelos o cancélalos antes de suspender tu cuenta',
      );
    }

    return this.aplicarSuspension({
      id_usuario: idUsuario,
      tipo: 'voluntaria',
      dias: DIAS_SUSPENSION_VOLUNTARIA,
      motivo: 'Suspensión voluntaria del trabajador',
    });
  }

  // CU-07 paso 5: terminada la pausa, el trabajador reactiva su cuenta
  async reactivarVoluntaria(idUsuario: number) {
    return this.dataSource.transaction(async (m) => {
      const usuario = await m.findOne(Usuario, { where: { id_usuario: idUsuario } });
      if (!usuario || usuario.estado !== 'suspendida') {
        throw new BadRequestException('Tu cuenta no está suspendida');
      }

      const ultima = await m.findOne(Suspension, {
        where: { id_usuario: idUsuario },
        order: { id_suspension: 'DESC' },
      });
      if (!ultima || ultima.tipo !== 'voluntaria') {
        throw new BadRequestException('Solo puedes reactivar una suspensión voluntaria');
      }
      if (ultima.estado === 'vigente') {
        throw new BadRequestException(
          `Tu pausa termina el ${ultima.fecha_fin.toISOString().slice(0, 10)}`,
        );
      }

      await m.update(Usuario, { id_usuario: idUsuario }, { estado: 'activa' });
      await this.sistema.auditar(idUsuario, 'cuenta_reactivada', 'usuarios', idUsuario);
      return { mensaje: 'Cuenta reactivada: ya puedes ofertar y recibir solicitudes' };
    });
  }

  // El supervisor levanta una sanción antes de tiempo
  async levantar(idSuspension: number, idSupervisor: number) {
    const suspension = await this.suspensionRepository.findOneBy({
      id_suspension: idSuspension,
    });
    if (!suspension) throw new NotFoundException('Suspensión no encontrada');
    if (suspension.estado !== 'vigente') {
      throw new BadRequestException('La suspensión ya no está vigente');
    }
    if (suspension.tipo === 'voluntaria') {
      throw new BadRequestException('Una suspensión voluntaria solo la levanta el trabajador');
    }

    await this.dataSource.transaction(async (m) => {
      await m.update(Suspension, { id_suspension: idSuspension }, { estado: 'levantada' });
      const otra = await m.findOne(Suspension, {
        where: { id_usuario: suspension.id_usuario, estado: 'vigente' },
      });
      // 'vigente' ya cambió a 'levantada', así que "otra" solo existe si hay una distinta
      if (!otra) {
        await m.update(Usuario, { id_usuario: suspension.id_usuario }, { estado: 'activa' });
      }
    });

    await this.sistema.notificar(
      suspension.id_usuario,
      'suspension_levantada',
      'Tu suspensión fue levantada y tu cuenta volvió a estar activa.',
    );
    await this.sistema.auditar(idSupervisor, 'suspension_levantada', 'suspensiones', idSuspension);
    return { mensaje: 'Suspensión levantada' };
  }

  // Núcleo: crea la suspensión Y cambia el estado de la cuenta (RN-18).
  // Hasta ahora solo se insertaba la fila y la cuenta seguía 'activa'.
  private async aplicarSuspension(p: {
    id_usuario: number;
    tipo: string;
    dias: number;
    motivo: string | null;
    id_reclamo?: number | null;
    id_supervisor?: number | null;
  }) {
    const suspension = await this.dataSource.transaction(async (m) => {
      const usuario = await m.findOne(Usuario, { where: { id_usuario: p.id_usuario } });
      if (!usuario || usuario.estado === 'eliminada') {
        throw new NotFoundException('Usuario no encontrado');
      }

      const vigente = await m.findOne(Suspension, {
        where: { id_usuario: p.id_usuario, estado: 'vigente' },
      });
      if (vigente) {
        throw new ConflictException('La cuenta ya tiene una suspensión vigente');
      }

      const inicio = new Date();
      const fin = new Date(inicio.getTime() + p.dias * DIA_MS);

      const guardada = await m.save(
        m.create(Suspension, {
          id_usuario: p.id_usuario,
          tipo: p.tipo,
          motivo: p.motivo,
          dias_duracion: p.dias,
          fecha_inicio: inicio,
          fecha_fin: fin,
          estado: 'vigente',
          id_reclamo: p.id_reclamo ?? null,
          id_supervisor: p.id_supervisor ?? null,
        }),
      );

      await m.update(Usuario, { id_usuario: p.id_usuario }, { estado: 'suspendida' });
      return guardada;
    });

    await this.sistema.notificar(
      p.id_usuario,
      'suspension',
      `Tu cuenta fue suspendida por ${p.dias} día(s). Motivo: ${p.motivo ?? 'no especificado'}`,
    );
    await this.sistema.auditar(
      p.id_supervisor ?? null,
      `suspension_${p.tipo}`,
      'suspensiones',
      suspension.id_suspension,
      `usuario ${p.id_usuario}, ${p.dias} día(s)`,
    );
    return suspension;
  }

  // ---------------------------------------------------------------
  // TAREA PROGRAMADA (necesita ScheduleModule.forRoot() en AppModule)
  // ---------------------------------------------------------------

  @Cron(CronExpression.EVERY_HOUR)
  async procesarSuspensiones() {
    // 1) Suspensiones cuyo plazo terminó
    const vencidas = await this.suspensionRepository.find({
      where: { estado: 'vigente', fecha_fin: LessThanOrEqual(new Date()) },
    });

    for (const s of vencidas) {
      await this.dataSource.transaction(async (m) => {
        await m.update(Suspension, { id_suspension: s.id_suspension }, { estado: 'finalizada' });

        // Las sanciones y automáticas reactivan solas. La voluntaria espera
        // a que el trabajador pulse "reactivar" (CU-07, paso 5).
        if (s.tipo !== 'voluntaria') {
          const otra = await m.findOne(Suspension, {
            where: { id_usuario: s.id_usuario, estado: 'vigente' },
          });
          if (!otra) {
            await m.update(Usuario, { id_usuario: s.id_usuario }, { estado: 'activa' });
          }
        }
      });

      await this.sistema.notificar(
        s.id_usuario,
        'suspension_finalizada',
        s.tipo === 'voluntaria'
          ? 'Terminó tu pausa de 30 días. Reactiva tu cuenta para volver a recibir solicitudes.'
          : 'Tu suspensión terminó y tu cuenta fue reactivada.',
      );
    }

    // 2) RN-12: a los 60 días en total (30 + 30) sin reactivar, la cuenta se elimina.
    //    Solo cuenta si la ÚLTIMA suspensión del usuario es voluntaria y sigue suspendido.
    const limite = new Date(
      Date.now() - (DIAS_ELIMINACION - DIAS_SUSPENSION_VOLUNTARIA) * DIA_MS,
    );
    const abandonadas: { id_usuario: number }[] = await this.dataSource.query(
      `SELECT s.id_usuario
         FROM suspensiones s
         JOIN usuarios u ON u.id_usuario = s.id_usuario
        WHERE s.tipo = 'voluntaria'
          AND s.estado = 'finalizada'
          AND s.fecha_fin <= $1
          AND u.estado = 'suspendida'
          AND s.id_suspension = (SELECT MAX(id_suspension) FROM suspensiones
                                  WHERE id_usuario = s.id_usuario)`,
      [limite],
    );

    for (const { id_usuario } of abandonadas) {
      await this.dataSource.manager.update(Usuario, { id_usuario }, { estado: 'eliminada' });
      await this.sistema.auditar(null, 'cuenta_eliminada_inactividad', 'usuarios', id_usuario);
    }
  }
}