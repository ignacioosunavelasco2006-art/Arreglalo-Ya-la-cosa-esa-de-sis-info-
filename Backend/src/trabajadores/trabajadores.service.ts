import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { DocumentoTrabajador } from '../entities/documento-trabajador.entity';
import { TrabajadorCategoria } from '../entities/trabajador-categoria.entity';
import { TrabajadorZona } from '../entities/trabajador-zona.entity';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { Inspeccion } from '../entities/inspeccion.entity';

import { CrearPerfilTrabajadorDto } from './dto/crear-perfil-trabajador.dto';
import { ActualizarPerfilTrabajadorDto } from './dto/actualizar-perfil-trabajador.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { AsignarCategoriasDto } from './dto/asignar-categorias.dto';
import { AsignarZonasDto } from './dto/asignar-zonas.dto';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { ActualizarDisponibilidadDto } from './dto/actualizar-disponibilidad.dto';
import { CrearInspeccionDto } from './dto/crear-inspeccion.dto';
import { ActualizarInspeccionDto } from './dto/actualizar-inspeccion.dto';

const TIPOS_DOCUMENTO = ['carnet', 'antecedentes', 'otro'];
const ESTADOS_REVISION = ['observado', 'aprobado', 'rechazado'];
const ESTADOS_INSPECCION = ['programada', 'realizada', 'reprogramada'];
const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

@Injectable()
export class TrabajadoresService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(PerfilTrabajador)
    private readonly perfilRepository: Repository<PerfilTrabajador>,
    @InjectRepository(DocumentoTrabajador)
    private readonly documentoRepository: Repository<DocumentoTrabajador>,
    @InjectRepository(TrabajadorCategoria)
    private readonly categoriaRepository: Repository<TrabajadorCategoria>,
    @InjectRepository(TrabajadorZona)
    private readonly zonaRepository: Repository<TrabajadorZona>,
    @InjectRepository(DisponibilidadTrabajador)
    private readonly disponibilidadRepository: Repository<DisponibilidadTrabajador>,
    @InjectRepository(Inspeccion)
    private readonly inspeccionRepository: Repository<Inspeccion>,
  ) {}

  // ---------------------------------------------------------------
  // PERFIL DEL TRABAJADOR
  // ---------------------------------------------------------------

  // Crear perfil de trabajador (queda en estado 'pendiente')
  async crearPerfil(dto: CrearPerfilTrabajadorDto) {
    if (!dto.id_usuario || !dto.carnet_identidad) {
      throw new BadRequestException(
        'id_usuario y carnet_identidad son obligatorios',
      );
    }

    if (dto.anios_experiencia !== undefined) {
      this.validarAnios(dto.anios_experiencia);
    }

    await this.verificarUsuarioExiste(dto.id_usuario, 'Usuario no encontrado');

    const perfilExiste = await this.perfilRepository.findOne({
      where: { id_usuario: dto.id_usuario },
    });
    if (perfilExiste) {
      throw new ConflictException(
        'El usuario ya tiene un perfil de trabajador',
      );
    }

    const carnetExiste = await this.perfilRepository.findOne({
      where: { carnet_identidad: dto.carnet_identidad },
    });
    if (carnetExiste) {
      throw new ConflictException('El carnet de identidad ya está registrado');
    }

    const nuevoPerfil = this.perfilRepository.create({
      id_usuario: dto.id_usuario,
      carnet_identidad: dto.carnet_identidad,
      descripcion: dto.descripcion ?? null,
      anios_experiencia: dto.anios_experiencia ?? 0,
      foto_perfil: dto.foto_perfil ?? null,
    });

    const guardado = await this.perfilRepository.save(nuevoPerfil);
    return this.formatearPerfil(guardado);
  }

  // Consultar perfiles (opcionalmente filtrados por estado de verificación)
  async obtenerPerfiles(estado?: string) {
    const perfiles = await this.perfilRepository.find({
      where: estado ? { estado_verificacion: estado } : {},
      order: { fecha_creacion: 'DESC' },
    });
    return perfiles.map((p) => this.formatearPerfil(p));
  }

  // Consultar un perfil con sus categorías y zonas
  async obtenerPerfil(id: number) {
    const perfil = await this.buscarPerfil(id);

    const categorias = await this.categoriaRepository.find({
      where: { id_trabajador: id },
    });
    const zonas = await this.zonaRepository.find({
      where: { id_trabajador: id },
    });

    return {
      ...this.formatearPerfil(perfil),
      categorias: categorias.map((c) => ({
        id_categoria: c.id_categoria,
        precio_estimado: this.aNumero(c.precio_estimado),
      })),
      zonas: zonas.map((z) => z.id_zona),
    };
  }

  // Actualizar datos del perfil
  async actualizarPerfil(id: number, dto: ActualizarPerfilTrabajadorDto) {
    const perfil = await this.buscarPerfil(id);

    if (
      dto.carnet_identidad !== undefined &&
      dto.carnet_identidad !== perfil.carnet_identidad
    ) {
      const carnetExiste = await this.perfilRepository.findOne({
        where: { carnet_identidad: dto.carnet_identidad },
      });
      if (carnetExiste) {
        throw new ConflictException(
          'El carnet de identidad ya está registrado',
        );
      }
      perfil.carnet_identidad = dto.carnet_identidad;
    }

    if (dto.anios_experiencia !== undefined) {
      this.validarAnios(dto.anios_experiencia);
      perfil.anios_experiencia = dto.anios_experiencia;
    }
    if (dto.descripcion !== undefined) perfil.descripcion = dto.descripcion;
    if (dto.foto_perfil !== undefined) perfil.foto_perfil = dto.foto_perfil;

    const guardado = await this.perfilRepository.save(perfil);
    return this.formatearPerfil(guardado);
  }

  // Revisión del supervisor: aprobar, observar o rechazar (RF-09)
  async revisarPerfil(id: number, dto: RevisarDocumentoDto) {
    const perfil = await this.buscarPerfil(id);

    if (!ESTADOS_REVISION.includes(dto.estado_verificacion)) {
      throw new BadRequestException(
        `estado_verificacion debe ser: ${ESTADOS_REVISION.join(', ')}`,
      );
    }

    await this.verificarUsuarioExiste(
      dto.id_supervisor_revisor,
      'Supervisor no encontrado',
    );

    if (dto.estado_verificacion === 'rechazado' && !dto.motivo_rechazo) {
      throw new BadRequestException('Debe indicar el motivo del rechazo');
    }

    if (dto.estado_verificacion === 'aprobado') {
      const documentos = await this.documentoRepository.find({
        where: { id_trabajador: id },
      });
      const tipos = documentos.map((d) => d.tipo);
      if (!tipos.includes('carnet') || !tipos.includes('antecedentes')) {
        throw new BadRequestException(
          'Para aprobar, el trabajador debe tener carnet y antecedentes subidos',
        );
      }
    }

    perfil.estado_verificacion = dto.estado_verificacion;
    perfil.id_supervisor_revisor = dto.id_supervisor_revisor;
    perfil.fecha_decision = new Date();
    perfil.motivo_rechazo =
      dto.estado_verificacion === 'aprobado'
        ? null
        : (dto.motivo_rechazo ?? null);

    const guardado = await this.perfilRepository.save(perfil);
    return this.formatearPerfil(guardado);
  }

  // ---------------------------------------------------------------
  // DOCUMENTOS
  // ---------------------------------------------------------------

  async subirDocumento(dto: SubirDocumentoDto) {
    await this.buscarPerfil(dto.id_trabajador);

    if (!TIPOS_DOCUMENTO.includes(dto.tipo)) {
      throw new BadRequestException(
        `tipo debe ser: ${TIPOS_DOCUMENTO.join(', ')}`,
      );
    }
    if (!dto.ruta_archivo) {
      throw new BadRequestException('ruta_archivo es obligatoria');
    }

    const documento = this.documentoRepository.create({
      id_trabajador: dto.id_trabajador,
      tipo: dto.tipo,
      ruta_archivo: dto.ruta_archivo,
    });

    return this.documentoRepository.save(documento);
  }

  async obtenerDocumentos(idTrabajador: number) {
    await this.buscarPerfil(idTrabajador);
    return this.documentoRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { fecha_subida: 'DESC' },
    });
  }

  // ---------------------------------------------------------------
  // CATEGORÍAS Y ZONAS (se reemplaza todo el conjunto)
  // ---------------------------------------------------------------

  async asignarCategorias(id: number, dto: AsignarCategoriasDto) {
    await this.buscarPerfil(id);

    if (!dto.categorias || dto.categorias.length === 0) {
      throw new BadRequestException('Debe enviar al menos una categoría');
    }

    const ids = dto.categorias.map((c) => c.id_categoria);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Hay categorías repetidas');
    }
    for (const c of dto.categorias) {
      if (!Number.isInteger(c.id_categoria)) {
        throw new BadRequestException('id_categoria debe ser un número entero');
      }
      if (c.precio_estimado !== undefined && c.precio_estimado < 0) {
        throw new BadRequestException('precio_estimado no puede ser negativo');
      }
    }

    try {
      await this.perfilRepository.manager.transaction(async (manager) => {
        await manager.delete(TrabajadorCategoria, { id_trabajador: id });
        await manager.save(
          TrabajadorCategoria,
          dto.categorias.map((c) =>
            manager.create(TrabajadorCategoria, {
              id_trabajador: id,
              id_categoria: c.id_categoria,
              precio_estimado: c.precio_estimado ?? null,
            }),
          ),
        );
      });
    } catch (error) {
      this.lanzarSiClaveForanea(error, 'Alguna categoría no existe');
    }

    return this.obtenerPerfil(id);
  }

  async asignarZonas(id: number, dto: AsignarZonasDto) {
    await this.buscarPerfil(id);

    if (!dto.ids_zonas || dto.ids_zonas.length === 0) {
      throw new BadRequestException('Debe enviar al menos una zona');
    }
    if (new Set(dto.ids_zonas).size !== dto.ids_zonas.length) {
      throw new BadRequestException('Hay zonas repetidas');
    }
    if (!dto.ids_zonas.every((z) => Number.isInteger(z))) {
      throw new BadRequestException('Los ids de zona deben ser enteros');
    }

    try {
      await this.perfilRepository.manager.transaction(async (manager) => {
        await manager.delete(TrabajadorZona, { id_trabajador: id });
        await manager.save(
          TrabajadorZona,
          dto.ids_zonas.map((idZona) =>
            manager.create(TrabajadorZona, {
              id_trabajador: id,
              id_zona: idZona,
            }),
          ),
        );
      });
    } catch (error) {
      this.lanzarSiClaveForanea(error, 'Alguna zona no existe');
    }

    return this.obtenerPerfil(id);
  }

  // ---------------------------------------------------------------
  // DISPONIBILIDAD (agenda semanal)
  // ---------------------------------------------------------------

  async crearDisponibilidad(dto: CrearDisponibilidadDto) {
    await this.buscarPerfil(dto.id_trabajador);
    this.validarHorario(dto.dia_semana, dto.hora_inicio, dto.hora_fin);
    await this.verificarTraslape(
      dto.id_trabajador,
      dto.dia_semana,
      dto.hora_inicio,
      dto.hora_fin,
    );

    const bloque = this.disponibilidadRepository.create({
      id_trabajador: dto.id_trabajador,
      dia_semana: dto.dia_semana,
      hora_inicio: dto.hora_inicio,
      hora_fin: dto.hora_fin,
      activa: dto.activa ?? true,
    });

    return this.disponibilidadRepository.save(bloque);
  }

  async obtenerDisponibilidad(idTrabajador: number) {
    await this.buscarPerfil(idTrabajador);
    return this.disponibilidadRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { dia_semana: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async actualizarDisponibilidad(
    idDisponibilidad: number,
    dto: ActualizarDisponibilidadDto,
  ) {
    const bloque = await this.disponibilidadRepository.findOne({
      where: { id_disponibilidad: idDisponibilidad },
    });
    if (!bloque) {
      throw new NotFoundException('Bloque de disponibilidad no encontrado');
    }

    const dia = dto.dia_semana ?? bloque.dia_semana;
    const inicio = dto.hora_inicio ?? bloque.hora_inicio.substring(0, 5);
    const fin = dto.hora_fin ?? bloque.hora_fin.substring(0, 5);

    this.validarHorario(dia, inicio, fin);
    await this.verificarTraslape(
      bloque.id_trabajador,
      dia,
      inicio,
      fin,
      idDisponibilidad,
    );

    bloque.dia_semana = dia;
    bloque.hora_inicio = inicio;
    bloque.hora_fin = fin;
    if (dto.activa !== undefined) bloque.activa = dto.activa;

    return this.disponibilidadRepository.save(bloque);
  }

  // ---------------------------------------------------------------
  // INSPECCIONES
  // ---------------------------------------------------------------

  async crearInspeccion(dto: CrearInspeccionDto) {
    await this.buscarPerfil(dto.id_trabajador);
    await this.verificarUsuarioExiste(
      dto.id_supervisor,
      'Supervisor no encontrado',
    );
    await this.verificarUsuarioExiste(
      dto.id_inspector,
      'Inspector no encontrado',
    );

    const inspeccion = this.inspeccionRepository.create({
      id_trabajador: dto.id_trabajador,
      id_supervisor: dto.id_supervisor,
      id_inspector: dto.id_inspector,
      fecha_programada: this.convertirFecha(dto.fecha_programada),
    });

    const guardada = await this.inspeccionRepository.save(inspeccion);
    return this.formatearInspeccion(guardada);
  }

  async obtenerInspecciones(idTrabajador: number) {
    await this.buscarPerfil(idTrabajador);
    const inspecciones = await this.inspeccionRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { fecha_programada: 'DESC' },
    });
    return inspecciones.map((i) => this.formatearInspeccion(i));
  }

  async actualizarInspeccion(
    idInspeccion: number,
    dto: ActualizarInspeccionDto,
  ) {
    const inspeccion = await this.inspeccionRepository.findOne({
      where: { id_inspeccion: idInspeccion },
    });
    if (!inspeccion) {
      throw new NotFoundException('Inspección no encontrada');
    }

    if (dto.fecha_programada !== undefined) {
      inspeccion.fecha_programada = this.convertirFecha(dto.fecha_programada);
    }
    if (dto.estado !== undefined) {
      if (!ESTADOS_INSPECCION.includes(dto.estado)) {
        throw new BadRequestException(
          `estado debe ser: ${ESTADOS_INSPECCION.join(', ')}`,
        );
      }
      inspeccion.estado = dto.estado;
    }
    if (dto.resultado !== undefined) inspeccion.resultado = dto.resultado;
    if (dto.costo_transporte !== undefined) {
      if (dto.costo_transporte < 0) {
        throw new BadRequestException('costo_transporte no puede ser negativo');
      }
      inspeccion.costo_transporte = dto.costo_transporte;
    }

    const guardada = await this.inspeccionRepository.save(inspeccion);
    return this.formatearInspeccion(guardada);
  }

  // ---------------------------------------------------------------
  // MÉTODOS AUXILIARES
  // ---------------------------------------------------------------

  private async buscarPerfil(id: number) {
    const perfil = await this.perfilRepository.findOne({
      where: { id_usuario: id },
    });
    if (!perfil) {
      throw new NotFoundException('Perfil de trabajador no encontrado');
    }
    return perfil;
  }

  private async verificarUsuarioExiste(id: number, mensaje: string) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: id },
    });
    if (!usuario) {
      throw new NotFoundException(mensaje);
    }
  }

  private validarAnios(anios: number) {
    if (!Number.isInteger(anios) || anios < 0 || anios > 60) {
      throw new BadRequestException(
        'anios_experiencia debe ser un entero entre 0 y 60',
      );
    }
  }

  private validarHorario(dia: number, inicio: string, fin: string) {
    if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
      throw new BadRequestException(
        'dia_semana debe estar entre 1 (lunes) y 7 (domingo)',
      );
    }
    if (!REGEX_HORA.test(inicio) || !REGEX_HORA.test(fin)) {
      throw new BadRequestException('Las horas deben tener formato HH:MM');
    }
    if (fin <= inicio) {
      throw new BadRequestException('hora_fin debe ser mayor que hora_inicio');
    }
  }

  private async verificarTraslape(
    idTrabajador: number,
    dia: number,
    inicio: string,
    fin: string,
    excluirId?: number,
  ) {
    const bloques = await this.disponibilidadRepository.find({
      where: { id_trabajador: idTrabajador, dia_semana: dia },
    });

    const hayTraslape = bloques.some(
      (b) =>
        b.id_disponibilidad !== excluirId &&
        inicio < b.hora_fin.substring(0, 5) &&
        fin > b.hora_inicio.substring(0, 5),
    );

    if (hayTraslape) {
      throw new ConflictException(
        'El horario se traslapa con otro bloque del mismo día',
      );
    }
  }

  private convertirFecha(valor: string) {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) {
      throw new BadRequestException('La fecha no tiene un formato válido');
    }
    return fecha;
  }

  // PostgreSQL devuelve los NUMERIC como texto; se convierten a número
  private aNumero(valor: number | null) {
    return valor === null || valor === undefined ? null : Number(valor);
  }

  private formatearPerfil(perfil: PerfilTrabajador) {
    return {
      ...perfil,
      calificacion_promedio: Number(perfil.calificacion_promedio),
    };
  }

  private formatearInspeccion(inspeccion: Inspeccion) {
    return {
      ...inspeccion,
      costo_transporte: this.aNumero(inspeccion.costo_transporte),
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