import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { DocumentoTrabajador } from '../entities/documento-trabajador.entity';
import { TrabajadorCategoria } from '../entities/trabajador-categoria.entity';
import { TrabajadorZona } from '../entities/trabajador-zona.entity';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { Inspeccion } from '../entities/inspeccion.entity';

import { SistemaService } from '../sistema/sistema.service';
import { UsuariosService } from '../usuarios/usuarios.service';
import { manejarErrorBd } from '../common/utilidades';

import { CrearPerfilTrabajadorDto } from './dto/crear-perfil-trabajador.dto';
import { ActualizarPerfilTrabajadorDto } from './dto/actualizar-perfil-trabajador.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { RevisarPerfilDto } from './dto/revisar-perfil.dto';
import { AsignarCategoriasDto } from './dto/asignar-categorias.dto';
import { AsignarZonasDto } from './dto/asignar-zonas.dto';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { ActualizarDisponibilidadDto } from './dto/actualizar-disponibilidad.dto';
import { CrearInspeccionDto } from './dto/crear-inspeccion.dto';
import { RegistrarResultadoDto } from './dto/registrar-resultado.dto';
import { ReprogramarInspeccionDto } from './dto/reprogramar-inspeccion.dto';

const REGEX_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface FiltrosBusqueda {
  categoria?: number;
  zona?: number;
  calificacion_min?: number;
  q?: string;
}

@Injectable()
export class TrabajadoresService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    private readonly usuariosService: UsuariosService,
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

  // ===============================================================
  // MI PERFIL (RF-04, CU-04): siempre el trabajador del token
  // ===============================================================

  async crearPerfil(idUsuario: number, dto: CrearPerfilTrabajadorDto) {
    // Se consulta la BD y no el token: así funciona justo después de activar la función.
    const roles = await this.rolesDe(idUsuario);
    if (!roles.includes('trabajador')) {
      throw new ForbiddenException(
        'Primero activa la función de trabajador (POST /usuarios/mi-cuenta/funciones/trabajador)',
      );
    }

    if (await this.perfilRepository.existsBy({ id_usuario: idUsuario })) {
      throw new ConflictException('Ya tienes un perfil de trabajador');
    }

    const carnet = dto.carnet_identidad.trim().toUpperCase();
    if (await this.perfilRepository.existsBy({ carnet_identidad: carnet })) {
      throw new ConflictException('El carnet de identidad ya está registrado');
    }

    try {
      const guardado = await this.perfilRepository.save(
        this.perfilRepository.create({
          id_usuario: idUsuario,
          carnet_identidad: carnet,
          descripcion: dto.descripcion ?? null,
          anios_experiencia: dto.anios_experiencia ?? 0,
          foto_perfil: dto.foto_perfil ?? null,
        }),
      );
      await this.sistema.auditar(idUsuario, 'perfil_trabajador_creado', 'perfiles_trabajador', idUsuario);
      return this.formatearPerfil(guardado);
    } catch (error) {
      manejarErrorBd(error, 'El carnet de identidad ya está registrado');
    }
  }

  // Vista privada completa (el trabajador ve su estado y el motivo si fue observado)
  async obtenerMiPerfil(idUsuario: number) {
    const perfil = await this.buscarPerfil(idUsuario);
    return {
      ...this.formatearPerfil(perfil),
      ...(await this.cargarRelaciones(idUsuario)),
      documentos: await this.obtenerDocumentos(idUsuario),
      tiene_datos_bancarios: await this.usuariosService.tieneDatosBancarios(idUsuario),
    };
  }

  async actualizarPerfil(idUsuario: number, dto: ActualizarPerfilTrabajadorDto) {
    const perfil = await this.buscarPerfil(idUsuario);

    if (dto.carnet_identidad !== undefined) {
      const carnet = dto.carnet_identidad.trim().toUpperCase();
      if (carnet !== perfil.carnet_identidad) {
        if (await this.perfilRepository.existsBy({ carnet_identidad: carnet })) {
          throw new ConflictException('El carnet de identidad ya está registrado');
        }
        perfil.carnet_identidad = carnet;
        // Cambiar el carnet de un perfil aprobado obliga a revisarlo de nuevo
        if (perfil.estado_verificacion === 'aprobado') perfil.estado_verificacion = 'pendiente';
      }
    }
    if (dto.anios_experiencia !== undefined) perfil.anios_experiencia = dto.anios_experiencia;
    if (dto.descripcion !== undefined) perfil.descripcion = dto.descripcion;
    if (dto.foto_perfil !== undefined) perfil.foto_perfil = dto.foto_perfil;

    try {
      return this.formatearPerfil(await this.perfilRepository.save(perfil));
    } catch (error) {
      manejarErrorBd(error, 'El carnet de identidad ya está registrado');
    }
  }

  // CU-04 paso 4: "envía el perfil a revisión". Si falta algo, el sistema no permite enviar.
  async enviarRevision(idUsuario: number) {
    const perfil = await this.buscarPerfil(idUsuario);
    if (perfil.estado_verificacion === 'aprobado') {
      throw new BadRequestException('Tu perfil ya está aprobado');
    }

    const faltantes: string[] = [];
    const tipos = (await this.documentoRepository.find({ where: { id_trabajador: idUsuario } })).map((d) => d.tipo);
    if (!tipos.includes('carnet')) faltantes.push('documento: carnet de identidad');
    if (!tipos.includes('antecedentes')) faltantes.push('documento: certificado de antecedentes');
    if ((await this.categoriaRepository.count({ where: { id_trabajador: idUsuario } })) === 0) {
      faltantes.push('al menos una habilidad (categoría)');
    }
    if ((await this.zonaRepository.count({ where: { id_trabajador: idUsuario } })) === 0) {
      faltantes.push('al menos una zona de cobertura');
    }
    // RF-03: obligatorio para trabajadores
    if (!(await this.usuariosService.tieneDatosBancarios(idUsuario))) {
      faltantes.push('datos bancarios');
    }
    if (faltantes.length > 0) {
      throw new BadRequestException({
        message: 'No se puede enviar el perfil: faltan datos',
        faltantes,
      });
    }

    perfil.estado_verificacion = 'pendiente';
    perfil.motivo_rechazo = null;
    await this.perfilRepository.save(perfil);

    await this.sistema.notificarRol(
      'supervisor',
      'perfil_en_revision',
      `Un trabajador (id ${idUsuario}) envió su perfil para revisión.`,
    );
    await this.sistema.auditar(idUsuario, 'perfil_enviado_revision', 'perfiles_trabajador', idUsuario);
    return { mensaje: 'Perfil enviado: quedó pendiente de revisión', estado_verificacion: 'pendiente' };
  }

  // ---------------- Documentos ----------------

  async subirDocumento(idUsuario: number, dto: SubirDocumentoDto) {
    const perfil = await this.buscarPerfil(idUsuario);
    const documento = await this.documentoRepository.save(
      this.documentoRepository.create({
        id_trabajador: idUsuario,
        tipo: dto.tipo,
        ruta_archivo: dto.ruta_archivo,
      }),
    );

    // Si ya estaba aprobado/rechazado, subir documentos nuevos reabre la revisión
    if (perfil.estado_verificacion === 'observado') {
      await this.sistema.auditar(idUsuario, 'documento_corregido', 'documentos_trabajador', documento.id_documento);
    }
    return documento;
  }

  // Lo usan el dueño y los supervisores (los controllers lo restringen)
  async obtenerDocumentos(idTrabajador: number) {
    await this.buscarPerfil(idTrabajador);
    return this.documentoRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { fecha_subida: 'DESC' },
    });
  }

  // ---------------- Categorías y zonas (RF-05, CU-05) ----------------

  async asignarCategorias(idUsuario: number, dto: AsignarCategoriasDto) {
    await this.buscarPerfil(idUsuario);

    const ids = dto.categorias.map((c) => c.id_categoria);
    if (new Set(ids).size !== ids.length) throw new BadRequestException('Hay categorías repetidas');

    try {
      await this.dataSource.transaction(async (m) => {
        await m.delete(TrabajadorCategoria, { id_trabajador: idUsuario });
        await m.save(
          TrabajadorCategoria,
          dto.categorias.map((c) =>
            m.create(TrabajadorCategoria, {
              id_trabajador: idUsuario,
              id_categoria: c.id_categoria,
              precio_estimado: c.precio_estimado ?? null,
            }),
          ),
        );
      });
    } catch (error) {
      this.lanzarSiClaveForanea(error, 'Alguna categoría no existe');
    }
    return this.obtenerMiPerfil(idUsuario);
  }

  async asignarZonas(idUsuario: number, dto: AsignarZonasDto) {
    await this.buscarPerfil(idUsuario);
    if (new Set(dto.ids_zonas).size !== dto.ids_zonas.length) {
      throw new BadRequestException('Hay zonas repetidas');
    }

    try {
      await this.dataSource.transaction(async (m) => {
        await m.delete(TrabajadorZona, { id_trabajador: idUsuario });
        await m.save(
          TrabajadorZona,
          dto.ids_zonas.map((idZona) => m.create(TrabajadorZona, { id_trabajador: idUsuario, id_zona: idZona })),
        );
      });
    } catch (error) {
      this.lanzarSiClaveForanea(error, 'Alguna zona no existe');
    }
    return this.obtenerMiPerfil(idUsuario);
  }

  // ---------------- Disponibilidad (agenda semanal) ----------------

  async crearDisponibilidad(idUsuario: number, dto: CrearDisponibilidadDto) {
    await this.buscarPerfil(idUsuario);
    this.validarHorario(dto.dia_semana, dto.hora_inicio, dto.hora_fin);
    await this.verificarTraslape(idUsuario, dto.dia_semana, dto.hora_inicio, dto.hora_fin);

    return this.disponibilidadRepository.save(
      this.disponibilidadRepository.create({
        id_trabajador: idUsuario,
        dia_semana: dto.dia_semana,
        hora_inicio: dto.hora_inicio,
        hora_fin: dto.hora_fin,
        activa: dto.activa ?? true,
      }),
    );
  }

  async obtenerDisponibilidad(idTrabajador: number) {
    await this.buscarPerfil(idTrabajador);
    return this.disponibilidadRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { dia_semana: 'ASC', hora_inicio: 'ASC' },
    });
  }

  async actualizarDisponibilidad(idUsuario: number, idDisponibilidad: number, dto: ActualizarDisponibilidadDto) {
    const bloque = await this.disponibilidadRepository.findOne({ where: { id_disponibilidad: idDisponibilidad } });
    if (!bloque) throw new NotFoundException('Bloque de disponibilidad no encontrado');
    // Antes cualquiera podía editar el bloque de otro trabajador
    if (bloque.id_trabajador !== idUsuario) throw new ForbiddenException('Ese bloque no es tuyo');

    const dia = dto.dia_semana ?? bloque.dia_semana;
    const inicio = dto.hora_inicio ?? bloque.hora_inicio.substring(0, 5);
    const fin = dto.hora_fin ?? bloque.hora_fin.substring(0, 5);

    this.validarHorario(dia, inicio, fin);
    await this.verificarTraslape(idUsuario, dia, inicio, fin, idDisponibilidad);

    bloque.dia_semana = dia;
    bloque.hora_inicio = inicio;
    bloque.hora_fin = fin;
    if (dto.activa !== undefined) bloque.activa = dto.activa;
    return this.disponibilidadRepository.save(bloque);
  }

  // ===============================================================
  // CONSULTA PÚBLICA (RF-06, RF-12, CU-06, CU-12)
  // Nunca expone carnet, documentos, motivo de rechazo ni revisor.
  // ===============================================================

  async buscar(filtros: FiltrosBusqueda) {
    const params: unknown[] = [];
    const cond: string[] = ["p.estado_verificacion = 'aprobado'", "u.estado <> 'eliminada'"];

    if (filtros.categoria) {
      params.push(filtros.categoria);
      cond.push(
        `EXISTS (SELECT 1 FROM trabajador_categorias tc
                  WHERE tc.id_trabajador = p.id_usuario AND tc.id_categoria = $${params.length})`,
      );
    }
    if (filtros.zona) {
      params.push(filtros.zona);
      cond.push(
        `EXISTS (SELECT 1 FROM trabajador_zonas tz
                  WHERE tz.id_trabajador = p.id_usuario AND tz.id_zona = $${params.length})`,
      );
    }
    if (filtros.calificacion_min !== undefined) {
      params.push(filtros.calificacion_min);
      cond.push(`p.calificacion_promedio >= $${params.length}::numeric`);
    }
    if (filtros.q) {
      params.push(`%${filtros.q.trim()}%`);
      cond.push(`(u.nombres ILIKE $${params.length} OR u.apellidos ILIKE $${params.length})`);
    }

    const filas: any[] = await this.dataSource.query(
      `SELECT p.id_usuario, u.nombres, u.apellidos, p.descripcion, p.anios_experiencia,
              p.foto_perfil, p.calificacion_promedio::float AS calificacion_promedio,
              p.total_calificaciones, (u.estado = 'activa') AS disponible
         FROM perfiles_trabajador p
         JOIN usuarios u ON u.id_usuario = p.id_usuario
        WHERE ${cond.join(' AND ')}
        ORDER BY (u.estado = 'activa') DESC, p.calificacion_promedio DESC, p.total_calificaciones DESC
        LIMIT 100`,
      params,
    );

    // Sin resultados: el front muestra "amplía los filtros" (CU-12 flujo alterno)
    if (filas.length === 0) {
      return { resultados: [], sugerencia: 'Sin resultados: prueba ampliando los filtros.' };
    }

    const ids = filas.map((f) => f.id_usuario);
    const categorias: any[] = await this.dataSource.query(
      `SELECT tc.id_trabajador, tc.id_categoria, c.nombre, tc.precio_estimado::float AS precio_estimado
         FROM trabajador_categorias tc JOIN categorias_servicio c ON c.id_categoria = tc.id_categoria
        WHERE tc.id_trabajador = ANY($1)`,
      [ids],
    );
    const zonas: any[] = await this.dataSource.query(
      `SELECT tz.id_trabajador, tz.id_zona, z.nombre
         FROM trabajador_zonas tz JOIN zonas z ON z.id_zona = tz.id_zona
        WHERE tz.id_trabajador = ANY($1)`,
      [ids],
    );

    const resultados = filas.map((f) => ({
      ...f,
      estado_disponibilidad: f.disponible ? 'disponible' : 'no disponible', // RF-07 / RN-18
      etiqueta: f.total_calificaciones === 0 ? 'nuevo' : null, // CU-06
      categorias: categorias
        .filter((c) => c.id_trabajador === f.id_usuario)
        .map(({ id_categoria, nombre, precio_estimado }) => ({ id_categoria, nombre, precio_estimado })),
      zonas: zonas
        .filter((z) => z.id_trabajador === f.id_usuario)
        .map(({ id_zona, nombre }) => ({ id_zona, nombre })),
    }));

    return { resultados };
  }

  async obtenerPerfilPublico(id: number) {
    const [fila]: any[] = await this.dataSource.query(
      `SELECT p.id_usuario, u.nombres, u.apellidos, p.descripcion, p.anios_experiencia,
              p.foto_perfil, p.calificacion_promedio::float AS calificacion_promedio,
              p.total_calificaciones, (u.estado = 'activa') AS disponible
         FROM perfiles_trabajador p
         JOIN usuarios u ON u.id_usuario = p.id_usuario
        WHERE p.id_usuario = $1 AND p.estado_verificacion = 'aprobado' AND u.estado <> 'eliminada'`,
      [id],
    );
    if (!fila) throw new NotFoundException('Trabajador no encontrado');

    const relaciones = await this.cargarRelaciones(id);

    // Comentarios sin identificar al cliente
    const comentarios = await this.dataSource.query(
      `SELECT puntaje, comentario, respuesta_trabajador, fecha
         FROM calificaciones
        WHERE id_trabajador = $1 AND comentario IS NOT NULL
        ORDER BY fecha DESC LIMIT 10`,
      [id],
    );
    const [{ n }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM trabajos WHERE id_trabajador = $1 AND estado = 'terminado'`,
      [id],
    );

    return {
      ...fila,
      estado_disponibilidad: fila.disponible ? 'disponible' : 'no disponible',
      etiqueta: fila.total_calificaciones === 0 ? 'nuevo' : null,
      ...relaciones,
      trabajos_completados: n,
      comentarios,
    };
  }

  // ===============================================================
  // SUPERVISIÓN (RF-09, CU-09)
  // ===============================================================

  // Cola de revisión: por defecto pendientes y observados
  async obtenerCola(estado?: string) {
    const perfiles = await this.perfilRepository.find({
      where: estado ? { estado_verificacion: estado } : [{ estado_verificacion: 'pendiente' }, { estado_verificacion: 'observado' }],
      order: { fecha_creacion: 'ASC' },
    });
    return perfiles.map((p) => this.formatearPerfil(p));
  }

  async obtenerDetalle(id: number) {
    const perfil = await this.buscarPerfil(id);
    return {
      ...this.formatearPerfil(perfil),
      ...(await this.cargarRelaciones(id)),
      documentos: await this.obtenerDocumentos(id),
      tiene_datos_bancarios: await this.usuariosService.tieneDatosBancarios(id),
      inspecciones: await this.obtenerInspecciones(id),
    };
  }

  async revisarPerfil(id: number, dto: RevisarPerfilDto, idSupervisor: number) {
    const perfil = await this.buscarPerfil(id);

    if (dto.estado_verificacion !== 'aprobado' && !dto.motivo_rechazo?.trim()) {
      throw new BadRequestException('Debes indicar el motivo (observación o rechazo)');
    }

    if (dto.estado_verificacion === 'aprobado') {
      const tipos = (await this.documentoRepository.find({ where: { id_trabajador: id } })).map((d) => d.tipo);
      if (!tipos.includes('carnet') || !tipos.includes('antecedentes')) {
        throw new BadRequestException('Para aprobar, el trabajador debe tener carnet y antecedentes subidos');
      }
      // RF-03: sin datos bancarios no puede ser aprobado ni recibir pagos
      if (!(await this.usuariosService.tieneDatosBancarios(id))) {
        throw new BadRequestException('El trabajador no registró sus datos bancarios');
      }
    }

    perfil.estado_verificacion = dto.estado_verificacion;
    perfil.id_supervisor_revisor = idSupervisor;
    perfil.fecha_decision = new Date();
    perfil.motivo_rechazo = dto.estado_verificacion === 'aprobado' ? null : (dto.motivo_rechazo ?? null);
    const guardado = await this.perfilRepository.save(perfil);

    const mensajes: Record<string, string> = {
      aprobado: 'Tu perfil fue aprobado: ya apareces en las búsquedas y puedes ofertar.',
      observado: `Tu perfil tiene observaciones: ${dto.motivo_rechazo}`,
      rechazado: `Tu perfil fue rechazado: ${dto.motivo_rechazo}`,
    };
    await this.sistema.notificar(id, `perfil_${dto.estado_verificacion}`, mensajes[dto.estado_verificacion]);
    await this.sistema.auditar(idSupervisor, `perfil_${dto.estado_verificacion}`, 'perfiles_trabajador', id, dto.motivo_rechazo ?? null);

    return this.formatearPerfil(guardado);
  }

  // ===============================================================
  // INSPECCIONES (RF-10, CU-10, RN-10)
  // ===============================================================

  async crearInspeccion(idTrabajador: number, dto: CrearInspeccionDto, idSupervisor: number) {
    await this.buscarPerfil(idTrabajador);

    const rolesInspector = await this.rolesDe(dto.id_inspector);
    if (!rolesInspector.includes('inspector')) {
      throw new BadRequestException('El usuario indicado no tiene el rol de inspector');
    }

    const fecha = this.convertirFecha(dto.fecha_programada);
    if (fecha.getTime() < Date.now()) {
      throw new BadRequestException('La fecha de la inspección debe ser futura');
    }

    const guardada = await this.inspeccionRepository.save(
      this.inspeccionRepository.create({
        id_trabajador: idTrabajador,
        id_supervisor: idSupervisor,
        id_inspector: dto.id_inspector,
        fecha_programada: fecha,
      }),
    );

    const cuando = fecha.toISOString().slice(0, 16).replace('T', ' ');
    await this.sistema.notificar(dto.id_inspector, 'inspeccion_asignada', `Tienes una inspección programada para el ${cuando} (trabajador ${idTrabajador}).`);
    await this.sistema.notificar(idTrabajador, 'inspeccion_programada', `Se programó una visita de inspección para el ${cuando}. El costo de transporte del inspector corre por tu cuenta.`);
    await this.sistema.auditar(idSupervisor, 'inspeccion_programada', 'inspecciones', guardada.id_inspeccion);
    return this.formatearInspeccion(guardada);
  }

  async obtenerInspecciones(idTrabajador: number) {
    const inspecciones = await this.inspeccionRepository.find({
      where: { id_trabajador: idTrabajador },
      order: { fecha_programada: 'DESC' },
    });
    return inspecciones.map((i) => this.formatearInspeccion(i));
  }

  async misInspecciones(idInspector: number) {
    const inspecciones = await this.inspeccionRepository.find({
      where: { id_inspector: idInspector },
      order: { fecha_programada: 'DESC' },
    });
    return inspecciones.map((i) => this.formatearInspeccion(i));
  }

  // El inspector registra el resultado y el costo (o reprograma si el trabajador no estaba)
  async registrarResultado(idInspeccion: number, dto: RegistrarResultadoDto, idInspector: number) {
    const inspeccion = await this.buscarInspeccion(idInspeccion);
    if (inspeccion.id_inspector !== idInspector) {
      throw new ForbiddenException('Esta inspección fue asignada a otro inspector');
    }
    if (inspeccion.estado === 'realizada') {
      throw new BadRequestException('La inspección ya fue registrada como realizada');
    }

    if (dto.estado === 'realizada') {
      if (!dto.resultado?.trim()) throw new BadRequestException('Debes registrar el resultado de la visita');
      if (dto.costo_transporte === undefined) throw new BadRequestException('Debes registrar el costo de transporte');
      inspeccion.estado = 'realizada';
      inspeccion.resultado = dto.resultado.trim();
      inspeccion.costo_transporte = dto.costo_transporte;
    } else {
      // CU-10 flujo alterno: el trabajador no está presente, se reprograma
      if (!dto.fecha_programada) throw new BadRequestException('Indica la nueva fecha para reprogramar');
      const fecha = this.convertirFecha(dto.fecha_programada);
      if (fecha.getTime() < Date.now()) throw new BadRequestException('La nueva fecha debe ser futura');
      inspeccion.estado = 'reprogramada';
      inspeccion.fecha_programada = fecha;
      if (dto.resultado) inspeccion.resultado = dto.resultado;
    }

    const guardada = await this.inspeccionRepository.save(inspeccion);

    if (dto.estado === 'realizada') {
      // RN-10: el costo de la visita lo paga el trabajador. En la v1 el cobro es simulado
      // (igual que el QR): queda registrado el monto y el trabajador es notificado.
      await this.sistema.notificar(inspeccion.id_trabajador, 'inspeccion_realizada', `Se realizó tu inspección. Costo de transporte a tu cargo: Bs ${Number(dto.costo_transporte).toFixed(2)}.`);
      await this.sistema.notificarRol('supervisor', 'inspeccion_realizada', `Inspección ${idInspeccion} realizada: revisa el resultado y decide la aprobación del trabajador ${inspeccion.id_trabajador}.`);
    } else {
      await this.sistema.notificar(inspeccion.id_trabajador, 'inspeccion_reprogramada', 'Tu inspección fue reprogramada porque no estabas presente.');
    }
    await this.sistema.auditar(idInspector, `inspeccion_${dto.estado}`, 'inspecciones', idInspeccion);
    return this.formatearInspeccion(guardada);
  }

  async reprogramarInspeccion(idInspeccion: number, dto: ReprogramarInspeccionDto, idSupervisor: number) {
    const inspeccion = await this.buscarInspeccion(idInspeccion);
    if (inspeccion.estado === 'realizada') {
      throw new BadRequestException('No se puede reprogramar una inspección realizada');
    }
    const fecha = this.convertirFecha(dto.fecha_programada);
    if (fecha.getTime() < Date.now()) throw new BadRequestException('La fecha debe ser futura');

    inspeccion.fecha_programada = fecha;
    inspeccion.estado = 'reprogramada';
    const guardada = await this.inspeccionRepository.save(inspeccion);

    await this.sistema.notificar(inspeccion.id_inspector, 'inspeccion_reprogramada', 'Una inspección asignada a ti fue reprogramada.');
    await this.sistema.notificar(inspeccion.id_trabajador, 'inspeccion_reprogramada', 'Tu inspección fue reprogramada.');
    await this.sistema.auditar(idSupervisor, 'inspeccion_reprogramada', 'inspecciones', idInspeccion);
    return this.formatearInspeccion(guardada);
  }

  // ===============================================================
  // AUXILIARES
  // ===============================================================

  private async buscarPerfil(id: number) {
    const perfil = await this.perfilRepository.findOne({ where: { id_usuario: id } });
    if (!perfil) throw new NotFoundException('Perfil de trabajador no encontrado');
    return perfil;
  }

  private async buscarInspeccion(id: number) {
    const inspeccion = await this.inspeccionRepository.findOne({ where: { id_inspeccion: id } });
    if (!inspeccion) throw new NotFoundException('Inspección no encontrada');
    return inspeccion;
  }

  private async rolesDe(idUsuario: number): Promise<string[]> {
    const filas: { nombre: string }[] = await this.dataSource.query(
      `SELECT r.nombre FROM usuario_roles ur JOIN roles r ON r.id_rol = ur.id_rol WHERE ur.id_usuario = $1`,
      [idUsuario],
    );
    return filas.map((f) => f.nombre);
  }

  // Categorías y zonas con su nombre
  private async cargarRelaciones(idTrabajador: number) {
    const categorias: any[] = await this.dataSource.query(
      `SELECT tc.id_categoria, c.nombre, tc.precio_estimado::float AS precio_estimado
         FROM trabajador_categorias tc JOIN categorias_servicio c ON c.id_categoria = tc.id_categoria
        WHERE tc.id_trabajador = $1 ORDER BY c.nombre`,
      [idTrabajador],
    );
    const zonas: any[] = await this.dataSource.query(
      `SELECT tz.id_zona, z.nombre
         FROM trabajador_zonas tz JOIN zonas z ON z.id_zona = tz.id_zona
        WHERE tz.id_trabajador = $1 ORDER BY z.nombre`,
      [idTrabajador],
    );
    return { categorias, zonas };
  }

  private validarHorario(dia: number, inicio: string, fin: string) {
    if (!Number.isInteger(dia) || dia < 1 || dia > 7) {
      throw new BadRequestException('dia_semana debe estar entre 1 (lunes) y 7 (domingo)');
    }
    if (!REGEX_HORA.test(inicio) || !REGEX_HORA.test(fin)) {
      throw new BadRequestException('Las horas deben tener formato HH:MM');
    }
    if (fin <= inicio) throw new BadRequestException('hora_fin debe ser mayor que hora_inicio');
  }

  private async verificarTraslape(idTrabajador: number, dia: number, inicio: string, fin: string, excluirId?: number) {
    const bloques = await this.disponibilidadRepository.find({
      where: { id_trabajador: idTrabajador, dia_semana: dia },
    });
    const hayTraslape = bloques.some(
      (b) =>
        b.id_disponibilidad !== excluirId &&
        inicio < b.hora_fin.substring(0, 5) &&
        fin > b.hora_inicio.substring(0, 5),
    );
    if (hayTraslape) throw new ConflictException('El horario se traslapa con otro bloque del mismo día');
  }

  private convertirFecha(valor: string) {
    const fecha = new Date(valor);
    if (isNaN(fecha.getTime())) throw new BadRequestException('La fecha no tiene un formato válido');
    return fecha;
  }

  private formatearPerfil(perfil: PerfilTrabajador) {
    return { ...perfil, calificacion_promedio: Number(perfil.calificacion_promedio) };
  }

  private formatearInspeccion(i: Inspeccion) {
    return {
      ...i,
      costo_transporte: i.costo_transporte === null || i.costo_transporte === undefined ? null : Number(i.costo_transporte),
    };
  }

  private lanzarSiClaveForanea(error: unknown, mensaje: string): never {
    if ((error as { code?: string }).code === '23503') throw new BadRequestException(mensaje);
    throw error;
  }
}
