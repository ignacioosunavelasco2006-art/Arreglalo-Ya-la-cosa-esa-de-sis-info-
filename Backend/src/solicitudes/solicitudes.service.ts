import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { FindOptionsWhere, In, LessThan, Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { SolicitudFoto } from '../entities/solicitud-foto.entity';
import { Oferta } from '../entities/oferta.entity';

import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';
import { ConsultarSolicitudesDto } from './dto/consultar-solicitudes.dto';
import { AgregarFotoSolicitudDto } from './dto/agregar-foto-solicitud.dto';
import { CrearOfertaDto } from './dto/crear-oferta.dto';
import { ActualizarOfertaDto } from './dto/actualizar-oferta.dto';
import { ResponderOfertaDto } from './dto/responder-oferta.dto';

const ESTADOS_SOLICITUD = ['abierta', 'contratada', 'vencida', 'cancelada'];
const DIAS_VIGENCIA = 30; // RN-09

@Injectable()
export class SolicitudesService {
  constructor(
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

  // ---------------------------------------------------------------
  // SOLICITUDES
  // ---------------------------------------------------------------

  // Publicar una solicitud (RF-11). Vigencia de 30 días (RN-09)
  async crearSolicitud(dto: CrearSolicitudDto) {
    if (!dto.id_cliente || !dto.id_categoria || !dto.id_zona) {
      throw new BadRequestException(
        'id_cliente, id_categoria e id_zona son obligatorios',
      );
    }
    if (!dto.descripcion?.trim() || !dto.direccion_exacta?.trim()) {
      throw new BadRequestException(
        'descripcion y direccion_exacta son obligatorias',
      );
    }
    if (dto.direccion_exacta.length > 250) {
      throw new BadRequestException(
        'direccion_exacta no puede superar los 250 caracteres',
      );
    }

    const fechaDeseada = this.convertirFecha(dto.fecha_deseada);
    if (fechaDeseada.getTime() < Date.now()) {
      throw new BadRequestException('La fecha deseada no puede ser pasada');
    }

    if (
      dto.presupuesto_aproximado !== undefined &&
      !(dto.presupuesto_aproximado > 0)
    ) {
      throw new BadRequestException(
        'presupuesto_aproximado debe ser mayor a 0',
      );
    }

    const fotos = dto.fotos ?? [];
    if (fotos.some((ruta) => !ruta || ruta.length > 300)) {
      throw new BadRequestException(
        'Cada foto debe tener una ruta de hasta 300 caracteres',
      );
    }

    await this.verificarUsuarioActivo(dto.id_cliente, 'Cliente no encontrado');

    const vencimiento = new Date();
    vencimiento.setDate(vencimiento.getDate() + DIAS_VIGENCIA);

    try {
      const guardada = await this.solicitudRepository.manager.transaction(
        async (manager) => {
          const solicitud = await manager.save(
            manager.create(SolicitudServicio, {
              id_cliente: dto.id_cliente,
              id_categoria: dto.id_categoria,
              id_zona: dto.id_zona,
              descripcion: dto.descripcion,
              direccion_exacta: dto.direccion_exacta,
              fecha_deseada: fechaDeseada,
              presupuesto_aproximado: dto.presupuesto_aproximado ?? null,
              fecha_vencimiento: vencimiento,
            }),
          );

          if (fotos.length > 0) {
            await manager.save(
              SolicitudFoto,
              fotos.map((ruta) =>
                manager.create(SolicitudFoto, {
                  id_solicitud: solicitud.id_solicitud,
                  ruta_archivo: ruta,
                }),
              ),
            );
          }

          return solicitud;
        },
      );

      return this.formatearSolicitud(guardada, true);
    } catch (error) {
      return this.lanzarSiClaveForanea(
        error,
        'La categoría o la zona no existe',
      );
    }
  }

  // Buscar y filtrar solicitudes (RF-12).
  // Sin id_cliente, solo se muestran las abiertas (vista del trabajador).
  async obtenerSolicitudes(filtros: ConsultarSolicitudesDto) {
    const where: FindOptionsWhere<SolicitudServicio> = {};

    const idCategoria = this.aEnteroOpcional(
      filtros.id_categoria,
      'id_categoria',
    );
    const idZona = this.aEnteroOpcional(filtros.id_zona, 'id_zona');
    const idCliente = this.aEnteroOpcional(filtros.id_cliente, 'id_cliente');

    if (idCategoria !== undefined) where.id_categoria = idCategoria;
    if (idZona !== undefined) where.id_zona = idZona;
    if (idCliente !== undefined) where.id_cliente = idCliente;

    if (filtros.estado) {
      if (!ESTADOS_SOLICITUD.includes(filtros.estado)) {
        throw new BadRequestException(
          `estado debe ser: ${ESTADOS_SOLICITUD.join(', ')}`,
        );
      }
      where.estado = filtros.estado;
    } else if (idCliente === undefined) {
      where.estado = 'abierta';
    }

    const solicitudes = await this.solicitudRepository.find({
      where,
      order: { fecha_publicacion: 'DESC' },
    });

    // En las búsquedas no se expone la dirección exacta, solo la zona
    return solicitudes.map((s) => this.formatearSolicitud(s, false));
  }

  // Consultar una solicitud con sus fotos.
  // La dirección exacta solo se muestra a su dueño.
  async obtenerSolicitud(id: number, idUsuario?: string) {
    const solicitud = await this.buscarSolicitud(id);
    const fotos = await this.fotoRepository.find({
      where: { id_solicitud: id },
    });

    const idSolicitante = this.aEnteroOpcional(idUsuario, 'id_usuario');
    const esDueno = idSolicitante === solicitud.id_cliente;

    return {
      ...this.formatearSolicitud(solicitud, esDueno),
      fotos,
    };
  }

  // Editar o cancelar una solicitud (solo el dueño, solo si está abierta)
  async actualizarSolicitud(id: number, dto: ActualizarSolicitudDto) {
    const solicitud = await this.buscarSolicitud(id);

    if (dto.id_cliente !== solicitud.id_cliente) {
      throw new ForbiddenException(
        'No puede modificar solicitudes de otro cliente',
      );
    }
    if (solicitud.estado !== 'abierta') {
      throw new BadRequestException(
        'Solo se pueden modificar solicitudes abiertas',
      );
    }
    if (dto.estado !== undefined && dto.estado !== 'cancelada') {
      throw new BadRequestException(
        "Solo se permite cambiar el estado a 'cancelada'",
      );
    }

    if (dto.descripcion !== undefined) {
      if (!dto.descripcion.trim()) {
        throw new BadRequestException('descripcion no puede estar vacía');
      }
      solicitud.descripcion = dto.descripcion;
    }
    if (dto.direccion_exacta !== undefined) {
      if (!dto.direccion_exacta.trim() || dto.direccion_exacta.length > 250) {
        throw new BadRequestException(
          'direccion_exacta debe tener entre 1 y 250 caracteres',
        );
      }
      solicitud.direccion_exacta = dto.direccion_exacta;
    }
    if (dto.fecha_deseada !== undefined) {
      const fecha = this.convertirFecha(dto.fecha_deseada);
      if (fecha.getTime() < Date.now()) {
        throw new BadRequestException('La fecha deseada no puede ser pasada');
      }
      solicitud.fecha_deseada = fecha;
    }
    if (dto.presupuesto_aproximado !== undefined) {
      if (!(dto.presupuesto_aproximado > 0)) {
        throw new BadRequestException(
          'presupuesto_aproximado debe ser mayor a 0',
        );
      }
      solicitud.presupuesto_aproximado = dto.presupuesto_aproximado;
    }
    if (dto.id_categoria !== undefined) solicitud.id_categoria = dto.id_categoria;
    if (dto.id_zona !== undefined) solicitud.id_zona = dto.id_zona;

    const cancelar = dto.estado === 'cancelada';
    if (cancelar) solicitud.estado = 'cancelada';

    try {
      const guardada = await this.solicitudRepository.manager.transaction(
        async (manager) => {
          const resultado = await manager.save(solicitud);
          if (cancelar) {
            // Las ofertas pendientes dejan de tener sentido
            await manager.update(
              Oferta,
              { id_solicitud: id, estado: 'pendiente' },
              { estado: 'rechazada' },
            );
          }
          return resultado;
        },
      );
      return this.formatearSolicitud(guardada, true);
    } catch (error) {
      return this.lanzarSiClaveForanea(
        error,
        'La categoría o la zona no existe',
      );
    }
  }

  // Cierre automático de solicitudes con 30 días cumplidos (RF-15, RN-09).
  // Se puede llamar a mano o desde una tarea programada.
  async cerrarVencidas() {
    return this.solicitudRepository.manager.transaction(async (manager) => {
      const vencidas = await manager.find(SolicitudServicio, {
        where: { estado: 'abierta', fecha_vencimiento: LessThan(new Date()) },
        select: { id_solicitud: true },
      });

      if (vencidas.length === 0) {
        return { solicitudes_cerradas: 0 };
      }

      const ids = vencidas.map((v) => v.id_solicitud);
      await manager.update(
        SolicitudServicio,
        { id_solicitud: In(ids) },
        { estado: 'vencida' },
      );
      await manager.update(
        Oferta,
        { id_solicitud: In(ids), estado: 'pendiente' },
        { estado: 'vencida' },
      );

      return { solicitudes_cerradas: ids.length };
    });
  }

  // ---------------------------------------------------------------
  // FOTOS
  // ---------------------------------------------------------------

  async agregarFoto(dto: AgregarFotoSolicitudDto) {
    const solicitud = await this.buscarSolicitud(dto.id_solicitud);

    if (solicitud.estado !== 'abierta') {
      throw new BadRequestException(
        'Solo se pueden agregar fotos a solicitudes abiertas',
      );
    }
    if (!dto.ruta_archivo || dto.ruta_archivo.length > 300) {
      throw new BadRequestException(
        'ruta_archivo es obligatoria y no puede superar 300 caracteres',
      );
    }

    const foto = this.fotoRepository.create({
      id_solicitud: dto.id_solicitud,
      ruta_archivo: dto.ruta_archivo,
    });
    return this.fotoRepository.save(foto);
  }

  // ---------------------------------------------------------------
  // OFERTAS
  // ---------------------------------------------------------------

  // Enviar una oferta (RF-13). Solo trabajadores aprobados y con cuenta activa
  async crearOferta(dto: CrearOfertaDto) {
    if (!dto.id_solicitud || !dto.id_trabajador) {
      throw new BadRequestException(
        'id_solicitud e id_trabajador son obligatorios',
      );
    }
    if (!(dto.precio_estimado > 0)) {
      throw new BadRequestException('precio_estimado debe ser mayor a 0');
    }
    if (dto.comentario !== undefined && dto.comentario.length > 500) {
      throw new BadRequestException(
        'comentario no puede superar los 500 caracteres',
      );
    }

    const solicitud = await this.buscarSolicitud(dto.id_solicitud);
    if (
      solicitud.estado !== 'abierta' ||
      solicitud.fecha_vencimiento.getTime() < Date.now()
    ) {
      throw new BadRequestException('La solicitud ya no está abierta');
    }
    if (solicitud.id_cliente === dto.id_trabajador) {
      throw new BadRequestException(
        'No puede ofertar en su propia solicitud',
      );
    }

    await this.verificarUsuarioActivo(
      dto.id_trabajador,
      'Trabajador no encontrado',
    );

    const perfil = await this.perfilRepository.findOne({
      where: { id_usuario: dto.id_trabajador },
    });
    if (!perfil) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }
    if (perfil.estado_verificacion !== 'aprobado') {
      throw new BadRequestException(
        'Solo los trabajadores aprobados pueden enviar ofertas',
      );
    }

    const yaOferto = await this.ofertaRepository.findOne({
      where: {
        id_solicitud: dto.id_solicitud,
        id_trabajador: dto.id_trabajador,
      },
    });
    if (yaOferto) {
      throw new ConflictException(
        'Ya envió una oferta para esta solicitud',
      );
    }

    const oferta = this.ofertaRepository.create({
      id_solicitud: dto.id_solicitud,
      id_trabajador: dto.id_trabajador,
      precio_estimado: dto.precio_estimado,
      comentario: dto.comentario ?? null,
      requiere_visita: dto.requiere_visita ?? false,
    });

    const guardada = await this.ofertaRepository.save(oferta);
    return this.formatearOferta(guardada);
  }

  // Ofertas recibidas por una solicitud (vista del cliente dueño)
  async obtenerOfertasDeSolicitud(idSolicitud: number, idCliente?: string) {
    const solicitud = await this.buscarSolicitud(idSolicitud);

    const cliente = this.aEnteroOpcional(idCliente, 'id_cliente');
    if (cliente === undefined) {
      throw new BadRequestException('id_cliente es obligatorio');
    }
    if (cliente !== solicitud.id_cliente) {
      throw new ForbiddenException(
        'Solo el dueño de la solicitud puede ver sus ofertas',
      );
    }

    const ofertas = await this.ofertaRepository.find({
      where: { id_solicitud: idSolicitud },
      order: { fecha_envio: 'ASC' },
    });

    const ids = ofertas.map((o) => o.id_trabajador);
    const perfiles =
      ids.length > 0
        ? await this.perfilRepository.find({
            where: { id_usuario: In(ids) },
          })
        : [];

    // Se incluye la reputación para que el cliente compare (RF-06)
    return ofertas.map((o) => {
      const perfil = perfiles.find((p) => p.id_usuario === o.id_trabajador);
      return {
        ...this.formatearOferta(o),
        trabajador: perfil
          ? {
              id_usuario: perfil.id_usuario,
              calificacion_promedio: Number(perfil.calificacion_promedio),
              total_calificaciones: perfil.total_calificaciones,
              anios_experiencia: perfil.anios_experiencia,
            }
          : null,
      };
    });
  }

  // Ofertas enviadas por un trabajador
  async obtenerOfertasDeTrabajador(idTrabajador: number) {
    const ofertas = await this.ofertaRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { fecha_envio: 'DESC' },
    });
    return ofertas.map((o) => this.formatearOferta(o));
  }

  // El trabajador corrige su oferta mientras siga pendiente
  async actualizarOferta(idOferta: number, dto: ActualizarOfertaDto) {
    const oferta = await this.buscarOferta(idOferta);

    if (dto.id_trabajador !== oferta.id_trabajador) {
      throw new ForbiddenException('No puede modificar ofertas de otro trabajador');
    }
    if (oferta.estado !== 'pendiente') {
      throw new BadRequestException(
        'Solo se pueden modificar ofertas pendientes',
      );
    }

    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);
    if (solicitud.estado !== 'abierta') {
      throw new BadRequestException('La solicitud ya no está abierta');
    }

    if (dto.precio_estimado !== undefined) {
      if (!(dto.precio_estimado > 0)) {
        throw new BadRequestException('precio_estimado debe ser mayor a 0');
      }
      oferta.precio_estimado = dto.precio_estimado;
    }
    if (dto.comentario !== undefined) {
      if (dto.comentario.length > 500) {
        throw new BadRequestException(
          'comentario no puede superar los 500 caracteres',
        );
      }
      oferta.comentario = dto.comentario;
    }
    if (dto.requiere_visita !== undefined) {
      oferta.requiere_visita = dto.requiere_visita;
    }

    const guardada = await this.ofertaRepository.save(oferta);
    return this.formatearOferta(guardada);
  }

  // El cliente rechaza una oferta pendiente.
  // Aceptar una oferta se hace en TrabajosModule (crea el trabajo en una transacción).
  async rechazarOferta(idOferta: number, dto: ResponderOfertaDto) {
    const oferta = await this.buscarOferta(idOferta);
    const solicitud = await this.buscarSolicitud(oferta.id_solicitud);

    if (dto.id_cliente !== solicitud.id_cliente) {
      throw new ForbiddenException(
        'Solo el dueño de la solicitud puede rechazar sus ofertas',
      );
    }
    if (oferta.estado !== 'pendiente') {
      throw new BadRequestException(
        'Solo se pueden rechazar ofertas pendientes',
      );
    }

    oferta.estado = 'rechazada';
    const guardada = await this.ofertaRepository.save(oferta);
    return this.formatearOferta(guardada);
  }

  // ---------------------------------------------------------------
  // MÉTODOS AUXILIARES
  // ---------------------------------------------------------------

  private async buscarSolicitud(id: number) {
    const solicitud = await this.solicitudRepository.findOne({
      where: { id_solicitud: id },
    });
    if (!solicitud) {
      throw new NotFoundException('Solicitud no encontrada');
    }
    return solicitud;
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

  // RN-18: una cuenta suspendida o eliminada no puede publicar ni ofertar
  private async verificarUsuarioActivo(id: number, mensaje: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: id },
    });
    if (!usuario) {
      throw new NotFoundException(mensaje);
    }
    if (usuario.estado !== 'activa') {
      throw new BadRequestException('La cuenta no está activa');
    }
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

  // PostgreSQL devuelve los NUMERIC como texto; se convierten a número
  private aNumero(valor: number | null) {
    return valor === null || valor === undefined ? null : Number(valor);
  }

  private formatearSolicitud(
    solicitud: SolicitudServicio,
    incluirDireccion: boolean,
  ) {
    const { direccion_exacta, ...resto } = solicitud;
    return {
      ...resto,
      presupuesto_aproximado: this.aNumero(solicitud.presupuesto_aproximado),
      ...(incluirDireccion ? { direccion_exacta } : {}),
    };
  }

  private formatearOferta(oferta: Oferta) {
    return {
      ...oferta,
      precio_estimado: Number(oferta.precio_estimado),
    };
  }

  // Código 23503 de PostgreSQL = violación de clave foránea
  private lanzarSiClaveForanea(error: unknown, mensaje: string): never {
    if ((error as { code?: string }).code === '23503') {
      throw new BadRequestException(mensaje);
    }
    throw error;
  }
}