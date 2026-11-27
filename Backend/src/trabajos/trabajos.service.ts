import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, FindOptionsWhere, Not, Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Oferta } from '../entities/oferta.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VisitaPrevia } from '../entities/visita-previa.entity';
import { IncrementoPrecio } from '../entities/incremento-precio.entity';
import { SolicitudFinalizacion } from '../entities/solicitud-finalizacion.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';

import { SistemaService } from '../sistema/sistema.service';
import { PagosService } from '../pagos/pagos.service';
import { TrabajadoresService } from '../trabajadores/trabajadores.service'; // NUEVO

import { AceptarOfertaDto } from './dto/aceptar-oferta.dto';
import { ActualizarEstadoTrabajoDto } from './dto/actualizar-estado-trabajo.dto';
import { CrearVisitaPreviaDto } from './dto/crear-visita-previa.dto';
import { ResponderVisitaPreviaDto } from './dto/responder-visita-previa.dto';
import { CrearIncrementoPrecioDto } from './dto/crear-incremento-precio.dto';
import { ResponderIncrementoPrecioDto } from './dto/responder-incremento-precio.dto';
import { SolicitarFinalizacionDto } from './dto/solicitar-finalizacion.dto';
import { ResponderFinalizacionDto } from './dto/responder-finalizacion.dto';

const METODOS_PAGO = ['plataforma', 'qr', 'efectivo'];
const ESTADOS_TRABAJO = [
  'pendiente_anticipo',
  'programado',
  'en_camino',
  'en_proceso',
  'terminado',
  'cancelado',
  'en_reclamo',
];
// Estados en los que el trabajo ocupa la agenda del trabajador (RN-11)
const ESTADOS_AGENDA = [
  'pendiente_anticipo',
  'programado',
  'en_camino',
  'en_proceso',
];
// Estados en los que el trabajo está "en curso" (permite incrementos)
const ESTADOS_EN_CURSO = ['programado', 'en_camino', 'en_proceso'];
// Cambios de estado que puede hacer el trabajador
const TRANSICIONES: Record<string, string[]> = {
  programado: ['en_camino', 'en_proceso'],
  en_camino: ['en_proceso'],
};
const ESTADOS_VISITA_ACTIVA = ['propuesta', 'aceptada', 'realizada'];
const DIA_MS = 24 * 60 * 60 * 1000;

export interface UsuarioContexto {
  id_usuario: number;
  roles: string[];
}

@Injectable()
export class TrabajosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    private readonly pagosService: PagosService,
    private readonly trabajadoresService: TrabajadoresService, // NUEVO
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(SolicitudServicio)
    private readonly solicitudRepository: Repository<SolicitudServicio>,
    @InjectRepository(Oferta)
    private readonly ofertaRepository: Repository<Oferta>,
    @InjectRepository(Trabajo)
    private readonly trabajoRepository: Repository<Trabajo>,
    @InjectRepository(TrabajoHistorialEstado)
    private readonly historialRepository: Repository<TrabajoHistorialEstado>,
    @InjectRepository(VisitaPrevia)
    private readonly visitaRepository: Repository<VisitaPrevia>,
    @InjectRepository(IncrementoPrecio)
    private readonly incrementoRepository: Repository<IncrementoPrecio>,
    @InjectRepository(SolicitudFinalizacion)
    private readonly finalizacionRepository: Repository<SolicitudFinalizacion>,
    @InjectRepository(VistaTrabajosPrecioTotal)
    private readonly vistaRepository: Repository<VistaTrabajosPrecioTotal>,
  ) {}

  // ---------------------------------------------------------------
  // TRABAJOS
  // ---------------------------------------------------------------

  // Aceptar una oferta (RF-14, RN-01): crea el trabajo en UNA transacción
  async aceptarOferta(idCliente: number, dto: AceptarOfertaDto) {
    const metodoPago = dto.metodo_pago ?? 'plataforma';
    if (!METODOS_PAGO.includes(metodoPago)) {
      throw new BadRequestException(
        `metodo_pago debe ser: ${METODOS_PAGO.join(', ')}`,
      );
    }

    const { inicio, fin } = this.validarAgenda(
      dto.fecha_inicio_prog,
      dto.fecha_fin_prog,
    );
   if (!inicio || !fin) {
      throw new BadRequestException(
        'Debes indicar fecha_inicio_prog y fecha_fin_prog para aceptar la oferta',
      );
    }
    try {
      const trabajo = await this.trabajoRepository.manager.transaction(
        async (manager) => {
          const ofertaPrevia = await manager.findOne(Oferta, {
            where: { id_oferta: dto.id_oferta },
          });
          if (!ofertaPrevia) {
            throw new NotFoundException('Oferta no encontrada');
          }

          // Se bloquea la solicitud para evitar dos aceptaciones a la vez
          const solicitud = await manager.findOne(SolicitudServicio, {
            where: { id_solicitud: ofertaPrevia.id_solicitud },
            lock: { mode: 'pessimistic_write' },
          });
          if (!solicitud) {
            throw new NotFoundException('Solicitud no encontrada');
          }
          if (solicitud.id_cliente !== idCliente) {
            throw new ForbiddenException(
              'Solo el dueño de la solicitud puede aceptar ofertas',
            );
          }
          if (
            solicitud.estado !== 'abierta' ||
            solicitud.fecha_vencimiento.getTime() < Date.now()
          ) {
            throw new BadRequestException('La solicitud ya no está abierta');
          }

          const oferta = await manager.findOne(Oferta, {
            where: { id_oferta: dto.id_oferta },
          });
          if (!oferta || oferta.estado !== 'pendiente') {
            throw new BadRequestException('La oferta ya no está pendiente');
          }

          const perfil = await manager.findOne(PerfilTrabajador, {
            where: { id_usuario: oferta.id_trabajador },
          });
          if (!perfil || perfil.estado_verificacion !== 'aprobado') {
            throw new BadRequestException(
              'El trabajador ya no está habilitado para trabajar',
            );
          }
          // P7 / RN-18: un trabajador suspendido deja de poder ser contratado
          const cuentaTrabajador = await manager.findOne(Usuario, {
            where: { id_usuario: oferta.id_trabajador },
          });
          if (!cuentaTrabajador || cuentaTrabajador.estado !== 'activa') {
            throw new BadRequestException(
              'El trabajador no está disponible por el momento',
            );
          }

          // Precio final: el estimado, o el definitivo si hubo visita previa
          let precioFinal = Number(oferta.precio_estimado);
          if (oferta.requiere_visita) {
            const visita = await manager.findOne(VisitaPrevia, {
              where: { id_oferta: oferta.id_oferta, estado: 'precio_aceptado' },
            });
            if (!visita || !visita.precio_definitivo) {
              throw new BadRequestException(
                'La oferta requiere una visita previa con precio aceptado',
              );
            }
            precioFinal = Number(visita.precio_definitivo);
          }

          // RN-11: el trabajador no puede tener ausencias ni trabajos que se crucen
          if (inicio && fin) {
            // NUEVO: ausencia registrada por el trabajador
            const ausencia = await this.trabajadoresService.tieneAusencia(
              oferta.id_trabajador,
              inicio,
              fin,
            );
            if (ausencia) {
              throw new ConflictException(
                'El trabajador no está disponible en esa fecha (ausencia registrada)',
              );
            }

            const choques = await manager
              .createQueryBuilder(Trabajo, 't')
              .where('t.id_trabajador = :idTrabajador', {
                idTrabajador: oferta.id_trabajador,
              })
              .andWhere('t.estado IN (:...estados)', {
                estados: ESTADOS_AGENDA,
              })
              .andWhere('t.fecha_inicio_prog IS NOT NULL')
              .andWhere('t.fecha_fin_prog IS NOT NULL')
              .andWhere(
                't.fecha_inicio_prog < :fin AND t.fecha_fin_prog > :inicio',
                { inicio, fin },
              )
              .getCount();
            if (choques > 0) {
              throw new ConflictException(
                'El trabajador ya tiene un trabajo que se cruza con ese horario',
              );
            }
          }

          await manager.update(
            Oferta,
            { id_oferta: oferta.id_oferta },
            { estado: 'aceptada' },
          );
          await manager.update(
            Oferta,
            {
              id_solicitud: solicitud.id_solicitud,
              estado: 'pendiente',
              id_oferta: Not(oferta.id_oferta),
            },
            { estado: 'rechazada' },
          );

          const nuevo = await manager.save(
            manager.create(Trabajo, {
              id_oferta: oferta.id_oferta,
              id_solicitud: solicitud.id_solicitud,
              id_cliente: solicitud.id_cliente,
              id_trabajador: oferta.id_trabajador,
              precio_final: precioFinal,
              metodo_pago: metodoPago,
              fecha_inicio_prog: inicio,
              fecha_fin_prog: fin,
            }),
          );

          await manager.update(
            SolicitudServicio,
            { id_solicitud: solicitud.id_solicitud },
            { estado: 'contratada' },
          );

          await this.registrarHistorial(
            manager,
            nuevo.id_trabajo,
            null,
            nuevo.estado,
            idCliente,
          );

          return nuevo;
        },
      );

      // RF-35 "aceptaciones": avisa a ambas partes (el contacto por WhatsApp queda fuera del alcance)
      await this.sistema.notificar(
        trabajo.id_trabajador,
        'oferta_aceptada',
        `¡Tu oferta fue aceptada! Trabajo #${trabajo.id_trabajo}. Queda pendiente el anticipo del cliente.`,
      );
      await this.sistema.notificar(
        idCliente,
        'pagar_anticipo',
        `Aceptaste una oferta (trabajo #${trabajo.id_trabajo}). Paga el anticipo para programar el trabajo.`,
      );
      await this.sistema.auditar(idCliente, 'oferta_aceptada', 'trabajos', trabajo.id_trabajo, `oferta ${dto.id_oferta}, precio ${trabajo.precio_final}`);

      return this.formatearTrabajo(trabajo);
    } catch (error) {
      return this.lanzarSiErrorBd(error);
    }
  }

  // RF-21: historial del propio usuario (como cliente y/o como trabajador)
  async obtenerMisTrabajos(idUsuario: number, estado?: string) {
    if (estado && !ESTADOS_TRABAJO.includes(estado)) {
      throw new BadRequestException(`estado debe ser: ${ESTADOS_TRABAJO.join(', ')}`);
    }
    const filtroEstado = estado ? { estado } : {};
    const trabajos = await this.trabajoRepository.find({
      where: [
        { id_cliente: idUsuario, ...filtroEstado },
        { id_trabajador: idUsuario, ...filtroEstado },
      ],
      order: { fecha_creacion: 'DESC' },
    });
    return trabajos.map((t) => this.formatearTrabajo(t));
  }

  // Vista de supervisión (reportes, reclamos): todos los trabajos con filtros
  async obtenerTodos(filtros: { id_cliente?: number; id_trabajador?: number; estado?: string }) {
    const where: FindOptionsWhere<Trabajo> = {};
    if (filtros.id_cliente) where.id_cliente = filtros.id_cliente;
    if (filtros.id_trabajador) where.id_trabajador = filtros.id_trabajador;
    if (filtros.estado) {
      if (!ESTADOS_TRABAJO.includes(filtros.estado)) {
        throw new BadRequestException(`estado debe ser: ${ESTADOS_TRABAJO.join(', ')}`);
      }
      where.estado = filtros.estado;
    }
    const trabajos = await this.trabajoRepository.find({ where, order: { fecha_creacion: 'DESC' }, take: 200 });
    return trabajos.map((t) => this.formatearTrabajo(t));
  }

  // RF-19 / CU-19: calendario del trabajador, agrupado por día y hora (sin dirección exacta)
  async calendario(idTrabajador: number, desde?: string, hasta?: string) {
    const ini = desde ? this.convertirFecha(desde) : new Date();
    const fin = hasta ? this.convertirFecha(hasta) : new Date(ini.getTime() + 30 * DIA_MS);
    if (fin.getTime() <= ini.getTime()) {
      throw new BadRequestException('"hasta" debe ser posterior a "desde"');
    }

    const trabajos: any[] = await this.dataSource.query(
      `SELECT t.id_trabajo, t.estado, t.fecha_inicio_prog, t.fecha_fin_prog,
              s.id_zona, s.descripcion
         FROM trabajos t
         JOIN solicitudes_servicio s ON s.id_solicitud = t.id_solicitud
        WHERE t.id_trabajador = $1 AND t.estado = ANY($2)
          AND t.fecha_inicio_prog IS NOT NULL AND t.fecha_fin_prog IS NOT NULL
          AND t.fecha_inicio_prog < $4 AND t.fecha_fin_prog > $3
        ORDER BY t.fecha_inicio_prog`,
      [idTrabajador, ESTADOS_AGENDA, ini, fin],
    );

    const porDia = new Map<string, any[]>();
    for (const t of trabajos) {
      const dia = new Date(t.fecha_inicio_prog).toISOString().slice(0, 10);
      porDia.set(dia, [...(porDia.get(dia) ?? []), t]);
    }

    return {
      desde: ini.toISOString(),
      hasta: fin.toISOString(),
      total_trabajos: trabajos.length,
      dias: [...porDia.entries()].map(([fecha, items]) => ({ fecha, trabajos: items })),
    };
  }

  // Detalle completo: precio total, historial, incrementos y finalizaciones.
  // Solo lo ven el cliente y el trabajador del trabajo (y la supervisión, para reclamos).
  async obtenerTrabajo(id: number, usuario: UsuarioContexto) {
    const trabajo = await this.buscarTrabajo(id);
    this.verificarParte(trabajo, usuario);

    const [vista, historial, incrementos, finalizaciones, solicitud] =
      await Promise.all([
        this.vistaRepository.findOne({ where: { id_trabajo: id } }),
        this.historialRepository.find({
          where: { id_trabajo: id },
          order: { fecha_cambio: 'ASC' },
        }),
        this.incrementoRepository.find({
          where: { id_trabajo: id },
          order: { fecha_solicitud: 'ASC' },
        }),
        this.finalizacionRepository.find({
          where: { id_trabajo: id },
          order: { fecha_solicitud: 'ASC' },
        }),
        this.solicitudRepository.findOne({
          where: { id_solicitud: trabajo.id_solicitud },
        }),
      ]);

    return {
      ...this.formatearTrabajo(trabajo),
      total_incrementos: vista ? Number(vista.total_incrementos) : 0,
      precio_total: vista
        ? Number(vista.precio_total)
        : Number(trabajo.precio_final),
      // Las partes del trabajo sí pueden ver la dirección completa
      direccion_exacta: solicitud?.direccion_exacta ?? null,
      historial,
      incrementos: incrementos.map((i) => this.formatearIncremento(i)),
      finalizaciones,
    };
  }

  // El trabajador marca 'en_camino' o 'en_proceso'
  async actualizarEstado(id: number, idTrabajador: number, dto: ActualizarEstadoTrabajoDto) {
    const trabajo = await this.buscarTrabajo(id);

    if (idTrabajador !== trabajo.id_trabajador) {
      throw new ForbiddenException(
        'Solo el trabajador asignado puede cambiar el estado',
      );
    }

    const permitidos = TRANSICIONES[trabajo.estado] ?? [];
    if (!permitidos.includes(dto.estado)) {
      throw new BadRequestException(
        `No se puede pasar de '${trabajo.estado}' a '${dto.estado}'`,
      );
    }

    const anterior = trabajo.estado;
    const actualizado = await this.trabajoRepository.manager.transaction(
      async (manager) => {
        trabajo.estado = dto.estado;
        const guardado = await manager.save(trabajo);
        await this.registrarHistorial(
          manager,
          id,
          anterior,
          dto.estado,
          idTrabajador,
        );
        return guardado;
      },
    );

    // RF-35 "cambios de estado": el cliente se entera
    const textoEstado = dto.estado === 'en_camino' ? 'va en camino' : 'comenzó el trabajo';
    await this.sistema.notificar(
      trabajo.id_cliente,
      `trabajo_${dto.estado}`,
      `Tu trabajo #${id}: el trabajador ${textoEstado}.`,
    );
    return this.formatearTrabajo(actualizado);
  }

  // ---------------------------------------------------------------
  // VISITAS PREVIAS (RF-16)
  // ---------------------------------------------------------------

  // El trabajador propone fecha de visita para una oferta que la requiere
  async crearVisita(idTrabajador: number, dto: CrearVisitaPreviaDto) {
    const oferta = await this.buscarOferta(dto.id_oferta);

    if (oferta.id_trabajador !== idTrabajador) {
      throw new ForbiddenException('La oferta pertenece a otro trabajador');
    }
    if (!oferta.requiere_visita) {
      throw new BadRequestException('La oferta no está marcada como "requiere visita"');
    }
    if (oferta.estado !== 'pendiente') {
      throw new BadRequestException('La oferta ya no está pendiente');
    }

    const fecha = this.convertirFecha(dto.fecha_propuesta);
    if (fecha.getTime() < Date.now()) {
      throw new BadRequestException('La fecha de la visita no puede ser pasada');
    }

    const activa = await this.visitaRepository.find({
      where: { id_oferta: dto.id_oferta },
    });
    if (activa.some((v) => ESTADOS_VISITA_ACTIVA.includes(v.estado))) {
      throw new ConflictException('La oferta ya tiene una visita en curso');
    }

    const visita = this.visitaRepository.create({
      id_oferta: dto.id_oferta,
      fecha_propuesta: fecha,
    });
    const guardada = await this.visitaRepository.save(visita);

    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);
    await this.sistema.notificar(
      solicitud.id_cliente,
      'visita_propuesta',
      `El trabajador propone una visita previa el ${fecha.toISOString().slice(0, 16).replace('T', ' ')} (solicitud #${solicitud.id_solicitud}). Acepta o rechaza la fecha.`,
    );
    return this.formatearVisita(guardada);
  }

  async obtenerVisitas(idOferta: number, usuario: UsuarioContexto) {
    const oferta = await this.buscarOferta(idOferta);
    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);

    if (
      usuario.id_usuario !== oferta.id_trabajador &&
      usuario.id_usuario !== solicitud.id_cliente &&
      !this.esSupervisor(usuario)
    ) {
      throw new ForbiddenException('No participa en esta oferta');
    }

    const visitas = await this.visitaRepository.find({
      where: { id_oferta: idOferta },
      order: { fecha_propuesta: 'ASC' },
    });
    return visitas.map((v) => this.formatearVisita(v));
  }

  // Flujo: propuesta → aceptada → realizada → precio_aceptado (o cancelada)
  async responderVisita(idVisita: number, idUsuario: number, dto: ResponderVisitaPreviaDto) {
    const visita = await this.visitaRepository.findOne({
      where: { id_visita: idVisita },
    });
    if (!visita) {
      throw new NotFoundException('Visita no encontrada');
    }

    const oferta = await this.buscarOferta(visita.id_oferta);
    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);
    const esCliente = idUsuario === solicitud.id_cliente;
    const esTrabajador = idUsuario === oferta.id_trabajador;

    switch (dto.accion) {
      case 'aceptar_fecha':
        if (!esCliente) {
          throw new ForbiddenException('Solo el cliente puede aceptar la fecha');
        }
        this.exigirEstadoVisita(visita, ['propuesta']);
        visita.estado = 'aceptada';
        visita.aceptada_cliente = true;
        break;

      case 'registrar_resultado':
        if (!esTrabajador) {
          throw new ForbiddenException(
            'Solo el trabajador puede registrar el resultado',
          );
        }
        this.exigirEstadoVisita(visita, ['aceptada']);
        if (!dto.resultado?.trim() || dto.resultado.length > 500) {
          throw new BadRequestException(
            'resultado es obligatorio (máximo 500 caracteres)',
          );
        }
        if (!(dto.precio_definitivo! > 0)) {
          throw new BadRequestException('precio_definitivo debe ser mayor a 0');
        }
        visita.resultado = dto.resultado;
        visita.precio_definitivo = dto.precio_definitivo!;
        visita.estado = 'realizada';
        break;

      case 'aceptar_precio':
        if (!esCliente) {
          throw new ForbiddenException('Solo el cliente puede aceptar el precio');
        }
        this.exigirEstadoVisita(visita, ['realizada']);
        visita.estado = 'precio_aceptado';
        break;

      case 'rechazar':
        // Si el cliente rechaza el precio, se cancela sin costo (CU-16)
        if (!esCliente) {
          throw new ForbiddenException('Solo el cliente puede rechazar');
        }
        this.exigirEstadoVisita(visita, ESTADOS_VISITA_ACTIVA);
        if (visita.estado === 'propuesta') visita.aceptada_cliente = false;
        visita.estado = 'cancelada';
        break;

      default:
        throw new BadRequestException(
          "accion debe ser: 'aceptar_fecha', 'registrar_resultado', 'aceptar_precio' o 'rechazar'",
        );
    }

    const guardada = await this.visitaRepository.save(visita);

    // Aviso a la otra parte según la acción
    const avisos: Record<string, { para: number; mensaje: string }> = {
      aceptar_fecha: { para: oferta.id_trabajador, mensaje: 'El cliente aceptó la fecha de la visita previa.' },
      registrar_resultado: {
        para: solicitud.id_cliente,
        mensaje: `El trabajador registró la visita y propone un precio definitivo de Bs ${Number(dto.precio_definitivo).toFixed(2)}. Acéptalo o recházalo.`,
      },
      aceptar_precio: { para: oferta.id_trabajador, mensaje: 'El cliente aceptó el precio definitivo. Ya puede aceptar tu oferta.' },
      rechazar: { para: oferta.id_trabajador, mensaje: 'El cliente rechazó la visita o el precio: se cancela sin costo.' },
    };
    const aviso = avisos[dto.accion];
    if (aviso) await this.sistema.notificar(aviso.para, `visita_${dto.accion}`, aviso.mensaje);

    return this.formatearVisita(guardada);
  }

  // ---------------------------------------------------------------
  // INCREMENTOS DE PRECIO (RF-17, RF-18, RN-05)
  // ---------------------------------------------------------------

  async crearIncremento(idTrabajador: number, dto: CrearIncrementoPrecioDto) {
    const trabajo = await this.buscarTrabajo(dto.id_trabajo);

    if (idTrabajador !== trabajo.id_trabajador) {
      throw new ForbiddenException(
        'Solo el trabajador asignado puede solicitar incrementos',
      );
    }
    if (!ESTADOS_EN_CURSO.includes(trabajo.estado)) {
      throw new BadRequestException('El trabajo no está en curso');
    }
    if (!(dto.monto_adicional > 0)) {
      throw new BadRequestException('monto_adicional debe ser mayor a 0');
    }
    if (!dto.justificacion?.trim() || dto.justificacion.length > 500) {
      throw new BadRequestException(
        'justificacion es obligatoria (máximo 500 caracteres)',
      );
    }

    const pendiente = await this.incrementoRepository.findOne({
      where: { id_trabajo: dto.id_trabajo, estado: 'pendiente' },
    });
    if (pendiente) {
      throw new ConflictException(
        'Ya existe un incremento pendiente de respuesta para este trabajo',
      );
    }

    try {
      const guardado = await this.incrementoRepository.save(
        this.incrementoRepository.create({
          id_trabajo: dto.id_trabajo,
          monto_adicional: dto.monto_adicional,
          justificacion: dto.justificacion,
        }),
      );

      // RF-18: "el sistema debe notificar al cliente cualquier cambio propuesto"
      await this.sistema.notificar(
        trabajo.id_cliente,
        'incremento_solicitado',
        `El trabajador pide un incremento de Bs ${Number(dto.monto_adicional).toFixed(2)} en el trabajo #${dto.id_trabajo}. Acéptalo o recházalo: el precio no cambia sin tu aprobación.`,
      );
      await this.sistema.auditar(idTrabajador, 'incremento_solicitado', 'incrementos_precio', guardado.id_incremento, `monto ${dto.monto_adicional}`);
      return this.formatearIncremento(guardado);
    } catch (error) {
      return this.lanzarSiErrorBd(error);
    }
  }

  async obtenerIncrementos(idTrabajo: number, usuario: UsuarioContexto) {
    const trabajo = await this.buscarTrabajo(idTrabajo);
    this.verificarParte(trabajo, usuario);

    const incrementos = await this.incrementoRepository.find({
      where: { id_trabajo: idTrabajo },
      order: { fecha_solicitud: 'ASC' },
    });
    return incrementos.map((i) => this.formatearIncremento(i));
  }

  // El cliente acepta o rechaza; el precio solo cambia si acepta
  async responderIncremento(
    idIncremento: number,
    idCliente: number,
    dto: ResponderIncrementoPrecioDto,
  ) {
    const incremento = await this.incrementoRepository.findOne({
      where: { id_incremento: idIncremento },
    });
    if (!incremento) {
      throw new NotFoundException('Incremento no encontrado');
    }

    const trabajo = await this.buscarTrabajo(incremento.id_trabajo);
    if (idCliente !== trabajo.id_cliente) {
      throw new ForbiddenException(
        'Solo el cliente del trabajo puede responder el incremento',
      );
    }
    if (incremento.estado !== 'pendiente') {
      throw new BadRequestException('El incremento ya fue respondido');
    }
    if (typeof dto.aceptar !== 'boolean') {
      throw new BadRequestException('aceptar debe ser true o false');
    }
    if (!ESTADOS_EN_CURSO.includes(trabajo.estado)) {
      throw new BadRequestException('El trabajo ya no está en curso');
    }

    incremento.estado = dto.aceptar ? 'aceptado' : 'rechazado';
    incremento.fecha_respuesta = new Date();

    const guardado = await this.incrementoRepository.save(incremento);

    await this.sistema.notificar(
      trabajo.id_trabajador,
      dto.aceptar ? 'incremento_aceptado' : 'incremento_rechazado',
      dto.aceptar
        ? `El cliente aceptó el incremento de Bs ${Number(incremento.monto_adicional).toFixed(2)} (trabajo #${trabajo.id_trabajo}).`
        : `El cliente rechazó el incremento (trabajo #${trabajo.id_trabajo}): se mantiene el precio anterior.`,
    );
    await this.sistema.auditar(
      idCliente,
      dto.aceptar ? 'incremento_aceptado' : 'incremento_rechazado',
      'incrementos_precio',
      idIncremento,
      `monto ${incremento.monto_adicional}`,
    );
    return this.formatearIncremento(guardado);
  }

  // ---------------------------------------------------------------
  // FINALIZACIÓN (RF-20, RN-06)
  // ---------------------------------------------------------------

  async solicitarFinalizacion(idTrabajador: number, dto: SolicitarFinalizacionDto) {
    const trabajo = await this.buscarTrabajo(dto.id_trabajo);

    if (idTrabajador !== trabajo.id_trabajador) {
      throw new ForbiddenException(
        'Solo el trabajador asignado puede solicitar la finalización',
      );
    }
    if (trabajo.estado !== 'en_proceso') {
      throw new BadRequestException(
        "El trabajo debe estar 'en_proceso' para solicitar la finalización",
      );
    }

    const incrementoPendiente = await this.incrementoRepository.findOne({
      where: { id_trabajo: dto.id_trabajo, estado: 'pendiente' },
    });
    if (incrementoPendiente) {
      throw new BadRequestException(
        'Hay un incremento de precio pendiente de respuesta del cliente',
      );
    }

    const finalizacionPendiente = await this.finalizacionRepository.findOne({
      where: { id_trabajo: dto.id_trabajo, estado: 'pendiente' },
    });
    if (finalizacionPendiente) {
      throw new ConflictException(
        'Ya hay una solicitud de finalización pendiente',
      );
    }

    const guardada = await this.finalizacionRepository.save(
      this.finalizacionRepository.create({ id_trabajo: dto.id_trabajo }),
    );

    await this.sistema.notificar(
      trabajo.id_cliente,
      'finalizacion_solicitada',
      `El trabajador indica que terminó el trabajo #${dto.id_trabajo}. Revisa el resultado y confírmalo o recházalo.`,
    );
    return guardada;
  }

  // El cliente acepta (trabajo terminado) o rechaza con motivo (el trabajo continúa)
  async responderFinalizacion(
    idFinalizacion: number,
    idCliente: number,
    dto: ResponderFinalizacionDto,
  ) {
    const finalizacion = await this.finalizacionRepository.findOne({
      where: { id_finalizacion: idFinalizacion },
    });
    if (!finalizacion) {
      throw new NotFoundException('Solicitud de finalización no encontrada');
    }

    const trabajo = await this.buscarTrabajo(finalizacion.id_trabajo);
    if (idCliente !== trabajo.id_cliente) {
      throw new ForbiddenException(
        'Solo el cliente del trabajo puede responder la solicitud',
      );
    }
    if (finalizacion.estado !== 'pendiente') {
      throw new BadRequestException('La solicitud ya fue respondida');
    }
    if (typeof dto.aceptar !== 'boolean') {
      throw new BadRequestException('aceptar debe ser true o false');
    }
    if (trabajo.estado !== 'en_proceso') {
      throw new BadRequestException("El trabajo ya no está 'en_proceso'");
    }
    if (
      !dto.aceptar &&
      (!dto.motivo_rechazo?.trim() || dto.motivo_rechazo.length > 300)
    ) {
      throw new BadRequestException(
        'Debe indicar el motivo del rechazo (máximo 300 caracteres)',
      );
    }

    const resultado = await this.trabajoRepository.manager.transaction(async (manager) => {
      finalizacion.fecha_respuesta = new Date();

      if (dto.aceptar) {
        finalizacion.estado = 'aceptada';
        const anterior = trabajo.estado;
        trabajo.estado = 'terminado';
        // Desde aquí corren los 7 días para presentar un reclamo (RN-07)
        trabajo.fecha_cierre = new Date();
        await manager.save(trabajo);
        await this.registrarHistorial(
          manager,
          trabajo.id_trabajo,
          anterior,
          'terminado',
          idCliente,
        );
      } else {
        finalizacion.estado = 'rechazada';
        finalizacion.motivo_rechazo = dto.motivo_rechazo ?? null;
      }

      const guardada = await manager.save(finalizacion);
      return { finalizacion: guardada, estado_trabajo: trabajo.estado };
    });

    if (dto.aceptar) {
      // RF-20 → RF-25: el cierre dispara el cobro del saldo y la liquidación al trabajador
      // (menos la comisión). Si falla, el trabajo ya quedó terminado y se alerta a supervisión.
      const pago = await this.pagosService.procesarCierre(trabajo.id_trabajo);
      await this.sistema.notificar(
        trabajo.id_trabajador,
        'trabajo_terminado',
        `El cliente confirmó el trabajo #${trabajo.id_trabajo}.`,
      );
      await this.sistema.auditar(idCliente, 'finalizacion_aceptada', 'trabajos', trabajo.id_trabajo);
      return { ...resultado, pago };
    }

    await this.sistema.notificar(
      trabajo.id_trabajador,
      'finalizacion_rechazada',
      `El cliente rechazó la finalización del trabajo #${trabajo.id_trabajo}: ${dto.motivo_rechazo}. El trabajo continúa.`,
    );
    await this.sistema.auditar(idCliente, 'finalizacion_rechazada', 'trabajos', trabajo.id_trabajo, dto.motivo_rechazo ?? null);
    return resultado;
  }

  // ---------------------------------------------------------------
  // MÉTODOS AUXILIARES
  // ---------------------------------------------------------------

  private async buscarTrabajo(id: number) {
    const trabajo = await this.trabajoRepository.findOne({
      where: { id_trabajo: id },
    });
    if (!trabajo) {
      throw new NotFoundException('Trabajo no encontrado');
    }
    return trabajo;
  }

  private async buscarOferta(id: number) {
    const oferta = await this.ofertaRepository.findOne({
      where: { id_oferta: id },
    });
    if (!oferta) {
      throw new NotFoundException('Oferta no encontrada');
    }
    return oferta;
  }

  private async buscarSolicitud(id: number) {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id_solicitud: id },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return solicitud;
  }

  private esSupervisor(usuario: UsuarioContexto) {
    return usuario.roles.includes('supervisor') || usuario.roles.includes('super_supervisor');
  }

  // Las partes del trabajo y la supervisión (que atiende reclamos)
  private verificarParte(trabajo: Trabajo, usuario: UsuarioContexto) {
    const esParte =
      usuario.id_usuario === trabajo.id_cliente || usuario.id_usuario === trabajo.id_trabajador;
    if (!esParte && !this.esSupervisor(usuario)) {
      throw new ForbiddenException('No participa en este trabajo');
    }
  }

  private exigirEstadoVisita(visita: VisitaPrevia, permitidos: string[]) {
    if (!permitidos.includes(visita.estado)) {
      throw new BadRequestException(
        `La visita está en estado '${visita.estado}' y no admite esta acción`,
      );
    }
  }

  // Trazabilidad de cada cambio de estado (RNF-07)
  private async registrarHistorial(
    manager: EntityManager,
    idTrabajo: number,
    anterior: string | null,
    nuevo: string,
    idUsuario: number | null,
  ) {
    await manager.save(
      manager.create(TrabajoHistorialEstado, {
        id_trabajo: idTrabajo,
        estado_anterior: anterior,
        estado_nuevo: nuevo,
        id_usuario: idUsuario,
      }),
    );
  }

  // Fechas de agenda: deben venir juntas, fin > inicio y no ser pasadas
  private validarAgenda(inicio?: string, fin?: string) {
    if (!inicio && !fin) {
      return { inicio: null, fin: null };
    }
    if (!inicio || !fin) {
      throw new BadRequestException(
        'Debe enviar fecha_inicio_prog y fecha_fin_prog juntas',
      );
    }
    const fechaInicio = this.convertirFecha(inicio);
    const fechaFin = this.convertirFecha(fin);
    if (fechaFin.getTime() <= fechaInicio.getTime()) {
      throw new BadRequestException(
        'fecha_fin_prog debe ser posterior a fecha_inicio_prog',
      );
    }
    if (fechaInicio.getTime() < Date.now()) {
      throw new BadRequestException('La fecha de inicio no puede ser pasada');
    }
    return { inicio: fechaInicio, fin: fechaFin };
  }

  private convertirFecha(valor: string) {
    const fecha = new Date(valor);
    if (!valor || isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha no tiene un formato válido');
    }
    return fecha;
  }

  // Los parámetros de la URL llegan como texto
  private aEnteroOpcional(valor: unknown, campo: string) {
    if (valor === undefined || valor === null || valor === '') {
      return undefined;
    }
    const numero = Number(valor);
    if (!Number.isInteger(numero)) {
      throw new BadRequestException(`${campo} debe ser un número entero`);
    }
    return numero;
  }

  private aEnteroRequerido(valor: unknown, campo: string) {
    const numero = this.aEnteroOpcional(valor, campo);
    if (numero === undefined) {
      throw new BadRequestException(`${campo} es obligatorio`);
    }
    return numero;
  }

  // PostgreSQL devuelve los NUMERIC como texto; se convierten a número
  private aNumero(valor: number | null) {
    return valor === null || valor === undefined ? null : Number(valor);
  }

  private formatearTrabajo(trabajo: Trabajo) {
    return { ...trabajo, precio_final: Number(trabajo.precio_final) };
  }

  private formatearVisita(visita: VisitaPrevia) {
    return {
      ...visita,
      precio_definitivo: this.aNumero(visita.precio_definitivo),
    };
  }

  private formatearIncremento(incremento: IncrementoPrecio) {
    return { ...incremento, monto_adicional: Number(incremento.monto_adicional) };
  }

  // 23503 = clave foránea, 23505 = valor duplicado (índices únicos)
  private lanzarSiErrorBd(error: unknown): never {
    const codigo = (error as { code?: string }).code;
    if (codigo === '23505') {
      throw new ConflictException(
        'La operación entra en conflicto con un registro existente (por ejemplo, la solicitud ya tiene un trabajo vigente)',
      );
    }
    if (codigo === '23503') {
      throw new BadRequestException('Alguno de los datos enviados no existe');
    }
    throw error;
  }
}