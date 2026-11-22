import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, FindOptionsWhere, In, LessThan, Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { SolicitudFoto } from '../entities/solicitud-foto.entity';
import { Oferta } from '../entities/oferta.entity';

import { SistemaService } from '../sistema/sistema.service';
import { manejarErrorBd } from '../common/Utilidades';

import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';
import { ConsultarSolicitudesDto } from './dto/consultar-solicitudes.dto';
import { AgregarFotoSolicitudDto } from './dto/agregar-foto-solicitud.dto';
import { CrearOfertaDto } from './dto/crear-oferta.dto';
import { ActualizarOfertaDto } from './dto/actualizar-oferta.dto';

// RN-09. ⚠ Si creas el parámetro "dias_vigencia_solicitud" en parametros_sistema,
// se usa ese valor; si no existe, 30.
const DIAS_VIGENCIA_DEFECTO = 30;
// Estados en que un trabajo ocupa la agenda del trabajador (RN-11)
const ESTADOS_AGENDA = ['pendiente_anticipo', 'programado', 'en_camino', 'en_proceso'];

@Injectable()
export class SolicitudesService {
  private readonly logger = new Logger(SolicitudesService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(SolicitudServicio)
    private readonly solicitudRepository: Repository<SolicitudServicio>,
    @InjectRepository(SolicitudFoto)
    private readonly fotoRepository: Repository<SolicitudFoto>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
  ) {}

  // ===============================================================
  // SOLICITUDES
  // ===============================================================

  // RF-11 / CU-11: el cliente es el del token
  async crearSolicitud(idCliente: number, dto: CrearSolicitudDto) {
    const fechaDeseada = this.convertirFecha(dto.fecha_deseada);
    if (fechaDeseada.getTime() < Date.now()) {
      throw new BadRequestException('La fecha deseada no puede ser pasada');
    }

    await this.verificarUsuarioActivo(idCliente, 'Cliente no encontrado');

    const dias = Math.round(await this.sistema.obtenerNumero('dias_vigencia_solicitud', DIAS_VIGENCIA_DEFECTO));
    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + dias);

    const fotos = dto.fotos ?? [];

    try {
      const guardada = await this.dataSource.transaction(async (manager) => {
        const solicitud = await manager.save(
          manager.create(SolicitudServicio, {
            id_cliente: idCliente,
            id_categoria: dto.id_categoria,
            id_zona: dto.id_zona,
            descripcion: dto.descripcion.trim(),
            direccion_exacta: dto.direccion_exacta.trim(),
            fecha_deseada: fechaDeseada,
            presupuesto_aproximado: dto.presupuesto_aproximado ?? null,
            fecha_vencimiento: vencimiento,
          }),
        );

        if (fotos.length > 0) {
          await manager.save(
            SolicitudFoto,
            fotos.map((ruta) =>
              manager.create(SolicitudFoto, { id_solicitud: solicitud.id_solicitud, ruta_archivo: ruta }),
            ),
          );
        }
        return solicitud;
      });

      await this.sistema.auditar(idCliente, 'solicitud_publicada', 'solicitudes_servicio', guardada.id_solicitud);
      // P2: "Notificar a trabajadores disponibles"
      await this.notificarTrabajadoresCompatibles(guardada);

      return this.formatearSolicitud(guardada, true);
    } catch (error) {
      manejarErrorBd(error, 'La categoría o la zona no existe');
    }
  }

  // Avisa a los trabajadores aprobados, activos, de esa categoría y zona
  private async notificarTrabajadoresCompatibles(solicitud: SolicitudServicio) {
    const destinatarios: { id_usuario: number }[] = await this.dataSource.query(
      `SELECT p.id_usuario
         FROM perfiles_trabajador p
         JOIN usuarios u ON u.id_usuario = p.id_usuario
        WHERE p.estado_verificacion = 'aprobado' AND u.estado = 'activa'
          AND p.id_usuario <> $3
          AND EXISTS (SELECT 1 FROM trabajador_categorias tc
                       WHERE tc.id_trabajador = p.id_usuario AND tc.id_categoria = $1)
          AND EXISTS (SELECT 1 FROM trabajador_zonas tz
                       WHERE tz.id_trabajador = p.id_usuario AND tz.id_zona = $2)
        LIMIT 200`,
      [solicitud.id_categoria, solicitud.id_zona, solicitud.id_cliente],
    );
    for (const d of destinatarios) {
      await this.sistema.notificar(
        d.id_usuario,
        'nueva_solicitud',
        `Hay una nueva solicitud (#${solicitud.id_solicitud}) en tu categoría y zona.`,
      );
    }
  }

  // Las solicitudes del cliente (con dirección)
  async obtenerMias(idCliente: number, estado?: string) {
    const solicitudes = await this.solicitudRepository.find({
      where: { id_cliente: idCliente, ...(estado ? { estado } : {}) },
      order: { fecha_publicacion: 'DESC' },
    });
    return solicitudes.map((s) => this.formatearSolicitud(s, true));
  }

  // RF-05 / RF-12: el trabajador ve solo lo que puede atender (sus categorías y zonas)
  async obtenerDisponibles(idTrabajador: number, filtros: ConsultarSolicitudesDto) {
    const perfil = await this.perfilRepository.findOneBy({ id_usuario: idTrabajador });
    if (!perfil) throw new NotFoundException('Primero crea tu perfil de trabajador');
    if (perfil.estado_verificacion !== 'aprobado') {
      throw new BadRequestException('Tu perfil aún no fue aprobado');
    }

    const params: unknown[] = [idTrabajador];
    const cond: string[] = [
      `s.estado = 'abierta'`,
      `s.fecha_vencimiento > NOW()`,
      `s.id_cliente <> $1`,
      `EXISTS (SELECT 1 FROM trabajador_categorias tc WHERE tc.id_trabajador = $1 AND tc.id_categoria = s.id_categoria)`,
      `EXISTS (SELECT 1 FROM trabajador_zonas tz WHERE tz.id_trabajador = $1 AND tz.id_zona = s.id_zona)`,
    ];
    if (filtros.id_categoria) {
      params.push(filtros.id_categoria);
      cond.push(`s.id_categoria = $${params.length}`);
    }
    if (filtros.id_zona) {
      params.push(filtros.id_zona);
      cond.push(`s.id_zona = $${params.length}`);
    }

    // Sin dirección exacta: solo la zona (sección 8.16)
    return this.dataSource.query(
      `SELECT s.id_solicitud, s.id_categoria, s.id_zona, s.descripcion, s.fecha_deseada,
              s.presupuesto_aproximado::float AS presupuesto_aproximado,
              s.fecha_publicacion, s.fecha_vencimiento,
              EXISTS (SELECT 1 FROM ofertas o WHERE o.id_solicitud = s.id_solicitud
                         AND o.id_trabajador = $1) AS ya_oferte
         FROM solicitudes_servicio s
        WHERE ${cond.join(' AND ')}
        ORDER BY s.fecha_publicacion DESC
        LIMIT 100`,
      params,
    );
  }

  // Vista de supervisión: todas, con filtros
  async obtenerTodas(filtros: ConsultarSolicitudesDto) {
    const where: FindOptionsWhere<SolicitudServicio> = {};
    if (filtros.id_categoria) where.id_categoria = filtros.id_categoria;
    if (filtros.id_zona) where.id_zona = filtros.id_zona;
    if (filtros.estado) where.estado = filtros.estado;

    const solicitudes = await this.solicitudRepository.find({
      where,
      order: { fecha_publicacion: 'DESC' },
      take: 200,
    });
    return solicitudes.map((s) => this.formatearSolicitud(s, true));
  }

  // Detalle: dueño y supervisores ven la dirección; el resto solo ve solicitudes abiertas, sin dirección
  async obtenerSolicitud(id: number, usuario: { id_usuario: number; roles: string[] }) {
    const solicitud = await this.buscarSolicitud(id);
    const esDueno = solicitud.id_cliente === usuario.id_usuario;
    const esSupervisor = usuario.roles.includes('supervisor') || usuario.roles.includes('super_supervisor');

    if (!esDueno && !esSupervisor) {
      const oferto = await this.ofertaRepository.existsBy({
        id_solicitud: id,
        id_trabajador: usuario.id_usuario,
      });
      if (solicitud.estado !== 'abierta' && !oferto) {
        throw new ForbiddenException('No puedes ver esta solicitud');
      }
    }

    const fotos = await this.fotoRepository.find({ where: { id_solicitud: id } });
    return { ...this.formatearSolicitud(solicitud, esDueno || esSupervisor), fotos };
  }

  // Editar o cancelar (solo el dueño y solo si está abierta)
  async actualizarSolicitud(id: number, idCliente: number, dto: ActualizarSolicitudDto) {
    const solicitud = await this.buscarSolicitud(id);

    if (solicitud.id_cliente !== idCliente) {
      throw new ForbiddenException('No puedes modificar solicitudes de otro cliente');
    }
    if (solicitud.estado !== 'abierta') {
      throw new BadRequestException('Solo se pueden modificar solicitudes abiertas');
    }

    if (dto.descripcion !== undefined) solicitud.descripcion = dto.descripcion.trim();
    if (dto.direccion_exacta !== undefined) solicitud.direccion_exacta = dto.direccion_exacta.trim();
    if (dto.fecha_deseada !== undefined) {
      const fecha = this.convertirFecha(dto.fecha_deseada);
      if (fecha.getTime() < Date.now()) throw new BadRequestException('La fecha deseada no puede ser pasada');
      solicitud.fecha_deseada = fecha;
    }
    if (dto.presupuesto_aproximado !== undefined) solicitud.presupuesto_aproximado = dto.presupuesto_aproximado;
    if (dto.id_categoria !== undefined) solicitud.id_categoria = dto.id_categoria;
    if (dto.id_zona !== undefined) solicitud.id_zona = dto.id_zona;

    const cancelar = dto.estado === 'cancelada';
    if (cancelar) solicitud.estado = 'cancelada';

    let oferentes: number[] = [];
    try {
      const guardada = await this.dataSource.transaction(async (manager) => {
        const resultado = await manager.save(solicitud);
        if (cancelar) {
          const pendientes = await manager.find(Oferta, { where: { id_solicitud: id, estado: 'pendiente' } });
          oferentes = pendientes.map((o) => o.id_trabajador);
          await manager.update(Oferta, { id_solicitud: id, estado: 'pendiente' }, { estado: 'rechazada' });
        }
        return resultado;
      });

      if (cancelar) {
        for (const idTrabajador of oferentes) {
          await this.sistema.notificar(idTrabajador, 'solicitud_cancelada', `La solicitud #${id} en la que ofertaste fue cancelada por el cliente.`);
        }
        await this.sistema.auditar(idCliente, 'solicitud_cancelada', 'solicitudes_servicio', id);
      }
      return this.formatearSolicitud(guardada, true);
    } catch (error) {
      manejarErrorBd(error, 'La categoría o la zona no existe');
    }
  }

  // RF-15 / CU-15 / RN-09: tarea programada (ya NO es un endpoint público)
  @Cron(CronExpression.EVERY_HOUR)
  async cerrarVencidas() {
    const vencidas = await this.solicitudRepository.find({
      where: { estado: 'abierta', fecha_vencimiento: LessThan(new Date()) },
    });
    if (vencidas.length === 0) return { solicitudes_cerradas: 0 };

    const ids = vencidas.map((v) => v.id_solicitud);

    const oferentes = await this.ofertaRepository.find({
      where: { id_solicitud: In(ids), estado: 'pendiente' },
    });

    await this.dataSource.transaction(async (manager) => {
      await manager.update(SolicitudServicio, { id_solicitud: In(ids) }, { estado: 'vencida' });
      await manager.update(Oferta, { id_solicitud: In(ids), estado: 'pendiente' }, { estado: 'vencida' });
    });

    // CU-15 paso 3: "notifica al cliente y a los oferentes"
    for (const s of vencidas) {
      await this.sistema.notificar(
        s.id_cliente,
        'solicitud_vencida',
        `Tu solicitud #${s.id_solicitud} venció sin contratarse. Puedes publicar una nueva.`,
      );
    }
    for (const o of oferentes) {
      await this.sistema.notificar(o.id_trabajador, 'solicitud_vencida', `La solicitud #${o.id_solicitud} en la que ofertaste venció.`);
    }

    this.logger.log(`Solicitudes cerradas por vencimiento: ${ids.length}`);
    return { solicitudes_cerradas: ids.length };
  }

  // ===============================================================
  // FOTOS
  // ===============================================================

  async agregarFoto(idSolicitud: number, idCliente: number, dto: AgregarFotoSolicitudDto) {
    const solicitud = await this.buscarSolicitud(idSolicitud);
    if (solicitud.id_cliente !== idCliente) {
      throw new ForbiddenException('No puedes modificar solicitudes de otro cliente');
    }
    if (solicitud.estado !== 'abierta') {
      throw new BadRequestException('Solo se pueden agregar fotos a solicitudes abiertas');
    }
    const cantidad = await this.fotoRepository.count({ where: { id_solicitud: idSolicitud } });
    if (cantidad >= 10) throw new BadRequestException('Máximo 10 fotos por solicitud');

    return this.fotoRepository.save(
      this.fotoRepository.create({ id_solicitud: idSolicitud, ruta_archivo: dto.ruta_archivo }),
    );
  }

  // ===============================================================
  // OFERTAS
  // ===============================================================

  // RF-13 / CU-13
  async crearOferta(idSolicitud: number, idTrabajador: number, dto: CrearOfertaDto) {
    const solicitud = await this.buscarSolicitud(idSolicitud);
    if (solicitud.estado !== 'abierta' || solicitud.fecha_vencimiento.getTime() < Date.now()) {
      throw new BadRequestException('La solicitud ya no está abierta');
    }
    if (solicitud.id_cliente === idTrabajador) {
      throw new BadRequestException('No puedes ofertar en tu propia solicitud');
    }

    // RN-18: la cuenta suspendida no puede ofertar
    await this.verificarUsuarioActivo(idTrabajador, 'Trabajador no encontrado');

    const perfil = await this.perfilRepository.findOneBy({ id_usuario: idTrabajador });
    if (!perfil) throw new NotFoundException('Perfil de trabajador no encontrado');
    // RN-14
    if (perfil.estado_verificacion !== 'aprobado') {
      throw new BadRequestException('Solo los trabajadores aprobados pueden enviar ofertas');
    }

    if (await this.ofertaRepository.existsBy({ id_solicitud: idSolicitud, id_trabajador: idTrabajador })) {
      throw new ConflictException('Ya enviaste una oferta para esta solicitud');
    }

    // CU-13 paso 3: "el sistema verifica su agenda" (RN-11)
    const [{ n }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM trabajos
        WHERE id_trabajador = $1 AND estado = ANY($2)
          AND fecha_inicio_prog IS NOT NULL AND fecha_fin_prog IS NOT NULL
          AND fecha_inicio_prog <= $3 AND fecha_fin_prog > $3`,
      [idTrabajador, ESTADOS_AGENDA, solicitud.fecha_deseada],
    );
    if (n > 0) {
      throw new ConflictException('Ya tienes un trabajo aceptado que se cruza con el horario de esta solicitud');
    }

    try {
      const guardada = await this.ofertaRepository.save(
        this.ofertaRepository.create({
          id_solicitud: idSolicitud,
          id_trabajador: idTrabajador,
          precio_estimado: dto.precio_estimado,
          comentario: dto.comentario ?? null,
          requiere_visita: dto.requiere_visita ?? false,
        }),
      );

      // RF-35 "nuevas ofertas" / CU-13 paso 4: "notifica al cliente"
      await this.sistema.notificar(
        solicitud.id_cliente,
        'nueva_oferta',
        `Recibiste una oferta de Bs ${Number(dto.precio_estimado).toFixed(2)} en tu solicitud #${idSolicitud}.`,
      );
      await this.sistema.auditar(idTrabajador, 'oferta_enviada', 'ofertas', guardada.id_oferta);
      return this.formatearOferta(guardada);
    } catch (error) {
      manejarErrorBd(error, 'Ya enviaste una oferta para esta solicitud');
    }
  }

  // Ofertas recibidas: solo el dueño (o un supervisor), con la reputación del trabajador
  async obtenerOfertasDeSolicitud(idSolicitud: number, usuario: { id_usuario: number; roles: string[] }) {
    const solicitud = await this.buscarSolicitud(idSolicitud);
    const esSupervisor = usuario.roles.includes('supervisor') || usuario.roles.includes('super_supervisor');
    if (solicitud.id_cliente !== usuario.id_usuario && !esSupervisor) {
      throw new ForbiddenException('Solo el dueño de la solicitud puede ver sus ofertas');
    }

    const ofertas = await this.ofertaRepository.find({
      where: { id_solicitud: idSolicitud },
      order: { fecha_envio: 'ASC' },
    });

    const ids = ofertas.map((o) => o.id_trabajador);
    const perfiles = ids.length > 0 ? await this.perfilRepository.find({ where: { id_usuario: In(ids) } }) : [];
    const usuarios = ids.length > 0 ? await this.usuarioRepository.find({ where: { id_usuario: In(ids) } }) : [];

    return ofertas.map((o) => {
      const perfil = perfiles.find((p) => p.id_usuario === o.id_trabajador);
      const u = usuarios.find((x) => x.id_usuario === o.id_trabajador);
      return {
        ...this.formatearOferta(o),
        trabajador: perfil
          ? {
              id_usuario: perfil.id_usuario,
              nombre: u ? `${u.nombres} ${u.apellidos}` : null,
              calificacion_promedio: Number(perfil.calificacion_promedio),
              total_calificaciones: perfil.total_calificaciones,
              anios_experiencia: perfil.anios_experiencia,
              etiqueta: perfil.total_calificaciones === 0 ? 'nuevo' : null,
            }
          : null,
      };
    });
  }

  async obtenerMisOfertas(idTrabajador: number) {
    const ofertas = await this.ofertaRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { fecha_envio: 'DESC' },
    });
    return ofertas.map((o) => this.formatearOferta(o));
  }

  // El trabajador corrige su oferta mientras siga pendiente
  async actualizarOferta(idOferta: number, idTrabajador: number, dto: ActualizarOfertaDto) {
    const oferta = await this.buscarOferta(idOferta);

    if (oferta.id_trabajador !== idTrabajador) {
      throw new ForbiddenException('No puedes modificar ofertas de otro trabajador');
    }
    if (oferta.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden modificar ofertas pendientes');
    }
    await this.verificarUsuarioActivo(idTrabajador, 'Trabajador no encontrado');

    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);
    if (solicitud.estado !== 'abierta') throw new BadRequestException('La solicitud ya no está abierta');

    const precioCambio = dto.precio_estimado !== undefined && Number(oferta.precio_estimado) !== dto.precio_estimado;
    if (dto.precio_estimado !== undefined) oferta.precio_estimado = dto.precio_estimado;
    if (dto.comentario !== undefined) oferta.comentario = dto.comentario;
    if (dto.requiere_visita !== undefined) oferta.requiere_visita = dto.requiere_visita;

    const guardada = await this.ofertaRepository.save(oferta);

    if (precioCambio) {
      await this.sistema.notificar(
        solicitud.id_cliente,
        'oferta_actualizada',
        `Una oferta en tu solicitud #${solicitud.id_solicitud} cambió su precio a Bs ${Number(dto.precio_estimado).toFixed(2)}.`,
      );
    }
    return this.formatearOferta(guardada);
  }

  // CU-14 flujo alterno: el cliente rechaza y se notifica al trabajador.
  // Aceptar la oferta se hace en TrabajosModule (crea el trabajo en una transacción).
  async rechazarOferta(idOferta: number, idCliente: number) {
    const oferta = await this.buscarOferta(idOferta);
    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);

    if (solicitud.id_cliente !== idCliente) {
      throw new ForbiddenException('Solo el dueño de la solicitud puede rechazar sus ofertas');
    }
    if (oferta.estado !== 'pendiente') {
      throw new BadRequestException('Solo se pueden rechazar ofertas pendientes');
    }

    oferta.estado = 'rechazada';
    const guardada = await this.ofertaRepository.save(oferta);

    await this.sistema.notificar(oferta.id_trabajador, 'oferta_rechazada', `Tu oferta en la solicitud #${solicitud.id_solicitud} fue rechazada.`);
    await this.sistema.auditar(idCliente, 'oferta_rechazada', 'ofertas', idOferta);
    return this.formatearOferta(guardada);
  }

  // ===============================================================
  // AUXILIARES
  // ===============================================================

  private async buscarSolicitud(id: number) {
    const solicitud = await this.solicitudRepository.findOne({ where: { id_solicitud: id } });
    if (!solicitud) throw new NotFoundException('Solicitud no encontrada');
    return solicitud;
  }

  private async buscarOferta(id: number) {
    const oferta = await this.ofertaRepository.findOne({ where: { id_oferta: id } });
    if (!oferta) throw new NotFoundException('Oferta no encontrada');
    return oferta;
  }

  // RN-18: una cuenta suspendida o eliminada no puede publicar ni ofertar
  private async verificarUsuarioActivo(id: number, mensaje: string) {
    const usuario = await this.usuarioRepository.findOne({ where: { id_usuario: id } });
    if (!usuario) throw new NotFoundException(mensaje);
    if (usuario.estado !== 'activa') {
      throw new ForbiddenException(
        usuario.estado === 'suspendida'
          ? 'Tu cuenta está suspendida: no puedes realizar esta acción'
          : 'La cuenta no está activa',
      );
    }
  }

  private convertirFecha(valor: string) {
    const fecha = new Date(valor);
    if (!valor || isNaN(fecha.getTime())) throw new BadRequestException('La fecha no tiene un formato válido');
    return fecha;
  }

  private formatearSolicitud(solicitud: SolicitudServicio, incluirDireccion: boolean) {
    const { direccion_exacta, ...resto } = solicitud;
    return {
      ...resto,
      presupuesto_aproximado:
        solicitud.presupuesto_aproximado === null || solicitud.presupuesto_aproximado === undefined
          ? null
          : Number(solicitud.presupuesto_aproximado),
      ...(incluirDireccion ? { direccion_exacta } : {}),
    };
  }

  private formatearOferta(oferta: Oferta) {
    return { ...oferta, precio_estimado: Number(oferta.precio_estimado) };
  }
}
