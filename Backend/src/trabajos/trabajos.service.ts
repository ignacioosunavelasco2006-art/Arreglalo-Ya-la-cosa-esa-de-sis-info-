import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { EntityManager, FindOptionsWhere, Not, Repository } from 'typeorm';

import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Oferta } from '../entities/oferta.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VisitaPrevia } from '../entities/visita-previa.entity';
import { IncrementoPrecio } from '../entities/incremento-precio.entity';
import { SolicitudFinalizacion } from '../entities/solicitud-finalizacion.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';

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

@Injectable()
export class TrabajosService {
  constructor(
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
  async aceptarOferta(dto: AceptarOfertaDto) {
    if (!dto.id_oferta || !dto.id_cliente) {
      throw new BadRequestException('id_oferta e id_cliente son obligatorios');
    }

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
          if (solicitud.id_cliente !== dto.id_cliente) {
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

          // RN-11: el trabajador no puede tener trabajos que se crucen
          if (inicio && fin) {
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
            dto.id_cliente,
          );

          return nuevo;
        },
      );

      return this.formatearTrabajo(trabajo);
    } catch (error) {
      return this.lanzarSiErrorBd(error);
    }
  }

  // Historial de trabajos del cliente o del trabajador (RF-21)
  async obtenerTrabajos(
    idCliente?: string,
    idTrabajador?: string,
    estado?: string,
  ) {
    const where: FindOptionsWhere<Trabajo> = {};

    const cliente = this.aEnteroOpcional(idCliente, 'id_cliente');
    const trabajador = this.aEnteroOpcional(idTrabajador, 'id_trabajador');
    if (cliente !== undefined) where.id_cliente = cliente;
    if (trabajador !== undefined) where.id_trabajador = trabajador;

    if (estado) {
      if (!ESTADOS_TRABAJO.includes(estado)) {
        throw new BadRequestException(
          `estado debe ser: ${ESTADOS_TRABAJO.join(', ')}`,
        );
      }
      where.estado = estado;
    }

    const trabajos = await this.trabajoRepository.find({
      where,
      order: { fecha_creacion: 'DESC' },
    });

    return trabajos.map((t) => this.formatearTrabajo(t));
  }

  // Detalle completo: precio total, historial, incrementos y finalizaciones.
  // Solo lo ven el cliente y el trabajador del trabajo.
  async obtenerTrabajo(id: number, idUsuario?: string) {
    const trabajo = await this.buscarTrabajo(id);
    this.verificarParte(trabajo, this.aEnteroRequerido(idUsuario, 'id_usuario'));

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
  async actualizarEstado(id: number, dto: ActualizarEstadoTrabajoDto) {
    const trabajo = await this.buscarTrabajo(id);

    if (dto.id_trabajador !== trabajo.id_trabajador) {
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
          dto.id_trabajador,
        );
        return guardado;
      },
    );

    return this.formatearTrabajo(actualizado);
  }

  // ---------------------------------------------------------------
  // VISITAS PREVIAS (RF-16)
  // ---------------------------------------------------------------

  // El trabajador propone fecha de visita para una oferta que la requiere
  async crearVisita(dto: CrearVisitaPreviaDto) {
    const oferta = await this.buscarOferta(dto.id_oferta);

    if (oferta.id_trabajador !== dto.id_trabajador) {
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
    return this.formatearVisita(guardada);
  }

  async obtenerVisitas(idOferta: number, idUsuario?: string) {
    const oferta = await this.buscarOferta(idOferta);
    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);
    const usuario = this.aEnteroRequerido(idUsuario, 'id_usuario');

    if (usuario !== oferta.id_trabajador && usuario !== solicitud.id_cliente) {
      throw new ForbiddenException('No participa en esta oferta');
    }

    const visitas = await this.visitaRepository.find({
      where: { id_oferta: idOferta },
      order: { fecha_propuesta: 'ASC' },
    });
    return visitas.map((v) => this.formatearVisita(v));
  }

  // Flujo: propuesta → aceptada → realizada → precio_aceptado (o cancelada)
  async responderVisita(idVisita: number, dto: ResponderVisitaPreviaDto) {
    const visita = await this.visitaRepository.findOne({
      where: { id_visita: idVisita },
    });
    if (!visita) {
      throw new NotFoundException('Visita no encontrada');
    }

    const oferta = await this.buscarOferta(visita.id_oferta);
    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);
    const esCliente = dto.id_usuario === solicitud.id_cliente;
    const esTrabajador = dto.id_usuario === oferta.id_trabajador;

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
    return this.formatearVisita(guardada);
  }

  // ---------------------------------------------------------------
  // INCREMENTOS DE PRECIO (RF-17, RF-18, RN-05)
  // ---------------------------------------------------------------

  async crearIncremento(dto: CrearIncrementoPrecioDto) {
    const trabajo = await this.buscarTrabajo(dto.id_trabajo);

    if (dto.id_trabajador !== trabajo.id_trabajador) {
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
      return this.formatearIncremento(guardado);
    } catch (error) {
      return this.lanzarSiErrorBd(error);
    }
  }

  async obtenerIncrementos(idTrabajo: number, idUsuario?: string) {
    const trabajo = await this.buscarTrabajo(idTrabajo);
    this.verificarParte(
      trabajo,
      this.aEnteroRequerido(idUsuario, 'id_usuario'),
    );

    const incrementos = await this.incrementoRepository.find({
      where: { id_trabajo: idTrabajo },
      order: { fecha_solicitud: 'ASC' },
    });
    return incrementos.map((i) => this.formatearIncremento(i));
  }

  // El cliente acepta o rechaza; el precio solo cambia si acepta
  async responderIncremento(
    idIncremento: number,
    dto: ResponderIncrementoPrecioDto,
  ) {
    const incremento = await this.incrementoRepository.findOne({
      where: { id_incremento: idIncremento },
    });
    if (!incremento) {
      throw new NotFoundException('Incremento no encontrado');
    }

    const trabajo = await this.buscarTrabajo(incremento.id_trabajo);
    if (dto.id_cliente !== trabajo.id_cliente) {
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
    return this.formatearIncremento(guardado);
  }

  // ---------------------------------------------------------------
  // FINALIZACIÓN (RF-20, RN-06)
  // ---------------------------------------------------------------

  async solicitarFinalizacion(dto: SolicitarFinalizacionDto) {
    const trabajo = await this.buscarTrabajo(dto.id_trabajo);

    if (dto.id_trabajador !== trabajo.id_trabajador) {
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

    return this.finalizacionRepository.save(
      this.finalizacionRepository.create({ id_trabajo: dto.id_trabajo }),
    );
  }

  // El cliente acepta (trabajo terminado) o rechaza con motivo (el trabajo continúa)
  async responderFinalizacion(
    idFinalizacion: number,
    dto: ResponderFinalizacionDto,
  ) {
    const finalizacion = await this.finalizacionRepository.findOne({
      where: { id_finalizacion: idFinalizacion },
    });
    if (!finalizacion) {
      throw new NotFoundException('Solicitud de finalización no encontrada');
    }

    const trabajo = await this.buscarTrabajo(finalizacion.id_trabajo);
    if (dto.id_cliente !== trabajo.id_cliente) {
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

    return this.trabajoRepository.manager.transaction(async (manager) => {
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
          dto.id_cliente,
        );
      } else {
        finalizacion.estado = 'rechazada';
        finalizacion.motivo_rechazo = dto.motivo_rechazo ?? null;
      }

      const guardada = await manager.save(finalizacion);
      return { finalizacion: guardada, estado_trabajo: trabajo.estado };
    });
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

  private verificarParte(trabajo: Trabajo, idUsuario: number) {
    if (idUsuario !== trabajo.id_cliente && idUsuario !== trabajo.id_trabajador) {
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