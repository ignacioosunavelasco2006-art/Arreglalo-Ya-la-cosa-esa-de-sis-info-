import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, Repository } from 'typeorm';

import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { Zona } from '../entities/zona.entity';
import { SistemaService } from '../sistema/sistema.service';

import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { CrearZonaDto } from './dto/crear-zona.dto';
import { ActualizarZonaDto } from './dto/actualizar-zona.dto';
import { SolicitarZonaDto } from './dto/solicitar-zona.dto';

@Injectable()
export class CatalogosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    @InjectRepository(CategoriaServicio)
    private readonly categoriaRepository: Repository<CategoriaServicio>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
  ) {}

  // ---------- CATEGORÍAS ----------

  // Públicas: solo las activas
  listarCategorias() {
    return this.categoriaRepository.find({ where: { activa: true }, order: { nombre: 'ASC' } });
  }

  // Supervisión: incluye las desactivadas
  listarTodasCategorias() {
    return this.categoriaRepository.find({ order: { nombre: 'ASC' } });
  }

  async obtenerCategoria(id: number) {
    const categoria = await this.categoriaRepository.findOne({ where: { id_categoria: id } });
    if (!categoria) throw new NotFoundException('La categoría no existe.');
    return categoria;
  }

  async crearCategoria(dto: CrearCategoriaDto, idSupervisor: number) {
    const categoria = this.categoriaRepository.create({
      nombre: dto.nombre.trim(),
      activa: dto.activa ?? true,
    });
    const guardada = await this.guardar(
      () => this.categoriaRepository.save(categoria),
      'Ya existe una categoría con ese nombre.',
    );
    await this.sistema.auditar(idSupervisor, 'categoria_creada', 'categorias_servicio', guardada.id_categoria, guardada.nombre);
    return guardada;
  }

  async actualizarCategoria(id: number, dto: ActualizarCategoriaDto, idSupervisor: number) {
    const categoria = await this.obtenerCategoria(id);
    if (dto.nombre !== undefined) categoria.nombre = dto.nombre.trim();
    if (dto.activa !== undefined) categoria.activa = dto.activa;
    const guardada = await this.guardar(
      () => this.categoriaRepository.save(categoria),
      'Ya existe otra categoría con ese nombre.',
    );
    await this.sistema.auditar(idSupervisor, 'categoria_actualizada', 'categorias_servicio', id);
    return guardada;
  }

  async desactivarCategoria(id: number, idSupervisor: number) {
    const categoria = await this.obtenerCategoria(id);
    categoria.activa = false;
    const guardada = await this.categoriaRepository.save(categoria);
    await this.sistema.auditar(idSupervisor, 'categoria_desactivada', 'categorias_servicio', id);
    return guardada;
  }

  // ---------- ZONAS ----------

  listarZonas() {
    return this.zonaRepository.find({ where: { activa: true }, order: { nombre: 'ASC' } });
  }

  // CU-32 paso 1: "abre la lista de zonas" (todas, con cuántos trabajadores tiene cada una)
  async listarTodasZonas() {
    return this.dataSource.query(
      `SELECT z.id_zona, z.nombre, z.activa,
              (SELECT COUNT(*)::int FROM trabajador_zonas tz WHERE tz.id_zona = z.id_zona) AS trabajadores_asignados
         FROM zonas z
        ORDER BY z.nombre`,
    );
  }

  async obtenerZona(id: number) {
    const zona = await this.zonaRepository.findOne({ where: { id_zona: id } });
    if (!zona) throw new NotFoundException('La zona no existe.');
    return zona;
  }

  async crearZona(dto: CrearZonaDto, idSupervisor: number) {
    const zona = this.zonaRepository.create({
      nombre: dto.nombre.trim(),
      activa: dto.activa ?? true,
    });
    const guardada = await this.guardar(
      () => this.zonaRepository.save(zona),
      'Ya existe una zona con ese nombre.',
    );
    await this.sistema.auditar(idSupervisor, 'zona_creada', 'zonas', guardada.id_zona, guardada.nombre);
    return guardada;
  }

  async actualizarZona(id: number, dto: ActualizarZonaDto, idSupervisor: number) {
    const zona = await this.obtenerZona(id);

    // Reactivar o editar no requiere aviso; desactivar por esta vía sí
    if (dto.activa === false && zona.activa) {
      await this.exigirConfirmacionSiHayTrabajadores(id, false);
    }

    if (dto.nombre !== undefined) zona.nombre = dto.nombre.trim();
    if (dto.activa !== undefined) zona.activa = dto.activa;
    const guardada = await this.guardar(
      () => this.zonaRepository.save(zona),
      'Ya existe otra zona con ese nombre.',
    );
    await this.sistema.auditar(idSupervisor, 'zona_actualizada', 'zonas', id);
    return guardada;
  }

  // CU-32 flujo alterno: "zona con trabajadores asignados, se avisa antes de desactivarla".
  // Primera llamada sin ?confirmar=true: devuelve el aviso (409). Con confirmar=true: desactiva.
  async desactivarZona(id: number, idSupervisor: number, confirmar: boolean) {
    const zona = await this.obtenerZona(id);
    await this.exigirConfirmacionSiHayTrabajadores(id, confirmar);

    zona.activa = false;
    const guardada = await this.zonaRepository.save(zona);
    await this.sistema.auditar(idSupervisor, 'zona_desactivada', 'zonas', id, confirmar ? 'con confirmación' : null);
    return guardada;
  }

  private async exigirConfirmacionSiHayTrabajadores(idZona: number, confirmar: boolean) {
    const [{ trabajadores }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS trabajadores FROM trabajador_zonas WHERE id_zona = $1`,
      [idZona],
    );
    const [{ solicitudes }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS solicitudes FROM solicitudes_servicio
        WHERE id_zona = $1 AND estado = 'abierta'`,
      [idZona],
    );

    if ((trabajadores > 0 || solicitudes > 0) && !confirmar) {
      throw new ConflictException({
        message: `La zona tiene ${trabajadores} trabajador(es) asignado(s) y ${solicitudes} solicitud(es) abierta(s). Repite la petición con ?confirmar=true para desactivarla.`,
        trabajadores_asignados: trabajadores,
        solicitudes_abiertas: solicitudes,
        requiere_confirmacion: true,
      });
    }
  }

  // CU-05 flujo alterno: el trabajador pide una zona que no existe
  async solicitarZona(idTrabajador: number, dto: SolicitarZonaDto) {
    const existe = await this.zonaRepository
      .createQueryBuilder('z')
      .where('LOWER(z.nombre) = LOWER(:n)', { n: dto.nombre_zona.trim() })
      .getExists();
    if (existe) throw new ConflictException('Esa zona ya existe: búscala en la lista de zonas.');

    const texto = `El trabajador ${idTrabajador} solicita la zona "${dto.nombre_zona.trim()}"${dto.comentario ? ` (${dto.comentario.trim()})` : ''}.`;
    const avisados = await this.sistema.notificarRol('supervisor', 'solicitud_zona', texto);
    await this.sistema.auditar(idTrabajador, 'zona_solicitada', 'zonas', null, dto.nombre_zona.trim());
    return { mensaje: 'Solicitud enviada a los supervisores', supervisores_avisados: avisados };
  }

  // ---------- Auxiliar ----------

  // Convierte el error de "nombre duplicado" de PostgreSQL (23505) en un 409
  private async guardar<T>(operacion: () => Promise<T>, mensaje: string): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (error instanceof QueryFailedError && (error as any).driverError?.code === '23505') {
        throw new ConflictException(mensaje);
      }
      throw error;
    }
  }
}
