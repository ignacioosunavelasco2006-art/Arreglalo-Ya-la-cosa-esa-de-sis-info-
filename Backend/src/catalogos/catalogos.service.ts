import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, Repository } from 'typeorm';
import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { Zona } from '../entities/zona.entity';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { CrearZonaDto } from './dto/crear-zona.dto';
import { ActualizarZonaDto } from './dto/actualizar-zona.dto';

@Injectable()
export class CatalogosService {
  constructor(
    @InjectRepository(CategoriaServicio)
    private readonly categoriaRepository: Repository<CategoriaServicio>,
    @InjectRepository(Zona)
    private readonly zonaRepository: Repository<Zona>,
  ) {}

  // ---------- CATEGORÍAS ----------

  listarCategorias() {
    return this.categoriaRepository.find({
      where: { activa: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerCategoria(id: number) {
    const categoria = await this.categoriaRepository.findOne({
      where: { id_categoria: id },
    });
    if (!categoria) throw new NotFoundException('La categoría no existe.');
    return categoria;
  }

  crearCategoria(dto: CrearCategoriaDto) {
    const categoria = this.categoriaRepository.create({
      nombre: dto.nombre.trim(),
      activa: dto.activa ?? true,
    });
    return this.guardar(
      () => this.categoriaRepository.save(categoria),
      'Ya existe una categoría con ese nombre.',
    );
  }

  async actualizarCategoria(id: number, dto: ActualizarCategoriaDto) {
    const categoria = await this.obtenerCategoria(id);
    if (dto.nombre !== undefined) categoria.nombre = dto.nombre.trim();
    if (dto.activa !== undefined) categoria.activa = dto.activa;
    return this.guardar(
      () => this.categoriaRepository.save(categoria),
      'Ya existe otra categoría con ese nombre.',
    );
  }

  async desactivarCategoria(id: number) {
    const categoria = await this.obtenerCategoria(id);
    categoria.activa = false;
    return this.categoriaRepository.save(categoria);
  }

  // ---------- ZONAS ----------

  listarZonas() {
    return this.zonaRepository.find({
      where: { activa: true },
      order: { nombre: 'ASC' },
    });
  }

  async obtenerZona(id: number) {
    const zona = await this.zonaRepository.findOne({ where: { id_zona: id } });
    if (!zona) throw new NotFoundException('La zona no existe.');
    return zona;
  }

  crearZona(dto: CrearZonaDto) {
    const zona = this.zonaRepository.create({
      nombre: dto.nombre.trim(),
      activa: dto.activa ?? true,
    });
    return this.guardar(
      () => this.zonaRepository.save(zona),
      'Ya existe una zona con ese nombre.',
    );
  }

  async actualizarZona(id: number, dto: ActualizarZonaDto) {
    const zona = await this.obtenerZona(id);
    if (dto.nombre !== undefined) zona.nombre = dto.nombre.trim();
    if (dto.activa !== undefined) zona.activa = dto.activa;
    return this.guardar(
      () => this.zonaRepository.save(zona),
      'Ya existe otra zona con ese nombre.',
    );
  }

  async desactivarZona(id: number) {
    const zona = await this.obtenerZona(id);
    zona.activa = false;
    return this.zonaRepository.save(zona);
  }

  // Convierte el error de "nombre duplicado" de PostgreSQL (23505) en un 409
  private async guardar<T>(operacion: () => Promise<T>, mensaje: string): Promise<T> {
    try {
      return await operacion();
    } catch (error) {
      if (
        error instanceof QueryFailedError &&
        (error as any).driverError?.code === '23505'
      ) {
        throw new ConflictException(mensaje);
      }
      throw error;
    }
  }
}