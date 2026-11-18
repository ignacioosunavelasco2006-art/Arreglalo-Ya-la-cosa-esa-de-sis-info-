import {
  BadRequestException,
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
 
import { CrearReclamoDto } from './dto/crear-reclamo.dto';
import { AgregarEvidenciaDto } from './dto/agregar-evidencia.dto';
import { TomarReclamoDto } from './dto/tomar-reclamo.dto';
import { ResolverReclamoDto } from './dto/resolver-reclamo.dto';
import { esEnteroPositivo, manejarErrorBd } from '../common/utilidades';
 
const DIAS_PARA_RECLAMAR = 7; // RN-07
const DIA_MS = 24 * 60 * 60 * 1000;
 
@Injectable()
export class ReclamosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Reclamo)
    private readonly reclamoRepository: Repository<Reclamo>,
    @InjectRepository(ReclamoEvidencia)
    private readonly evidenciaRepository: Repository<ReclamoEvidencia>,
  ) {}
 
  private async cambiarEstadoTrabajo(
    m: EntityManager,
    trabajo: Trabajo,
    estado_nuevo: string,
    id_usuario: number | null,
  ) {
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
 
  private validarRuta(ruta: string) {
    if (!ruta || ruta.trim() === '' || ruta.length > 300) {
      throw new BadRequestException('La ruta del archivo es obligatoria (máx. 300 caracteres)');
    }
  }
 
  // ---------- Crear reclamo (RN-07) ----------
 
  async crear(dto: CrearReclamoDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_trabajo e id_cliente son obligatorios');
    }
    if (!dto.descripcion || dto.descripcion.trim() === '') {
      throw new BadRequestException('La descripción es obligatoria');
    }
    const evidencias = dto.evidencias ?? [];
    evidencias.forEach((r) => this.validarRuta(r));
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await m.findOne(Trabajo, { where: { id_trabajo: dto.id_trabajo } });
        if (!trabajo) throw new NotFoundException('Trabajo no encontrado');
 
        if (trabajo.id_cliente !== dto.id_cliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        if (trabajo.estado !== 'terminado' || !trabajo.fecha_cierre) {
          throw new BadRequestException('Solo se puede reclamar un trabajo terminado');
        }
 
        const limite = new Date(trabajo.fecha_cierre).getTime() + DIAS_PARA_RECLAMAR * DIA_MS;
        if (Date.now() > limite) {
          throw new BadRequestException(
            `El plazo de ${DIAS_PARA_RECLAMAR} días para reclamar ya venció`,
          );
        }
 
        const reclamo = await m.save(
          m.create(Reclamo, {
            id_trabajo: trabajo.id_trabajo,
            id_cliente: dto.id_cliente,
            descripcion: dto.descripcion,
          }),
        );
 
        for (const ruta of evidencias) {
          await m.insert(ReclamoEvidencia, { id_reclamo: reclamo.id_reclamo, ruta_archivo: ruta });
        }
 
        await this.cambiarEstadoTrabajo(m, trabajo, 'en_reclamo', dto.id_cliente);
        return reclamo;
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // ---------- Evidencias ----------
 
  async agregarEvidencia(id_reclamo: number, dto: AgregarEvidenciaDto) {
    if (!esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_cliente es obligatorio');
    }
    this.validarRuta(dto.ruta_archivo);
 
    const reclamo = await this.obtenerReclamo(id_reclamo);
    if (reclamo.id_cliente !== dto.id_cliente) {
      throw new ForbiddenException('Solo el cliente del reclamo puede agregar evidencias');
    }
    if (['resuelto', 'improcedente'].includes(reclamo.estado)) {
      throw new BadRequestException('El reclamo ya está cerrado');
    }
 
    return this.evidenciaRepository.save(
      this.evidenciaRepository.create({ id_reclamo, ruta_archivo: dto.ruta_archivo }),
    );
  }
 
  // ---------- Revisión y resolución ----------
 
  async tomarEnRevision(id_reclamo: number, dto: TomarReclamoDto) {
    if (!esEnteroPositivo(dto.id_supervisor)) {
      throw new BadRequestException('id_supervisor es obligatorio');
    }
 
    const reclamo = await this.obtenerReclamo(id_reclamo);
    if (reclamo.estado !== 'abierto') {
      throw new BadRequestException('El reclamo no está abierto');
    }
 
    reclamo.estado = 'en_revision';
    reclamo.id_supervisor = dto.id_supervisor;
 
    try {
      return await this.reclamoRepository.save(reclamo);
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // Casos graves pasan al super supervisor
  async escalar(id_reclamo: number, dto: TomarReclamoDto) {
    if (!esEnteroPositivo(dto.id_supervisor)) {
      throw new BadRequestException('id_supervisor es obligatorio');
    }
 
    const reclamo = await this.obtenerReclamo(id_reclamo);
    if (reclamo.estado !== 'en_revision') {
      throw new BadRequestException('Solo se escalan reclamos en revisión');
    }
    if (reclamo.id_supervisor !== dto.id_supervisor) {
      throw new ForbiddenException('Solo el supervisor asignado puede escalar el reclamo');
    }
 
    reclamo.escalado_super = true;
    return this.reclamoRepository.save(reclamo);
  }
 
  async resolver(id_reclamo: number, dto: ResolverReclamoDto) {
    if (!esEnteroPositivo(dto.id_supervisor)) {
      throw new BadRequestException('id_supervisor es obligatorio');
    }
    if (!['resuelto', 'improcedente'].includes(dto.estado)) {
      throw new BadRequestException("El estado debe ser 'resuelto' o 'improcedente'");
    }
    if (!dto.resolucion || dto.resolucion.trim() === '' || dto.resolucion.length > 500) {
      throw new BadRequestException('La resolución es obligatoria (máx. 500 caracteres)');
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const reclamo = await m.findOne(Reclamo, { where: { id_reclamo } });
        if (!reclamo) throw new NotFoundException('Reclamo no encontrado');
 
        if (reclamo.estado !== 'en_revision') {
          throw new BadRequestException('El reclamo debe estar en revisión para resolverse');
        }
        if (reclamo.id_supervisor !== dto.id_supervisor) {
          throw new ForbiddenException('Solo el supervisor asignado puede resolver el reclamo');
        }
 
        reclamo.estado = dto.estado;
        reclamo.resolucion = dto.resolucion;
        reclamo.fecha_resolucion = new Date();
        const guardado = await m.save(reclamo);
 
        // El trabajo vuelve a 'terminado' al cerrarse el reclamo
        const trabajo = await m.findOne(Trabajo, { where: { id_trabajo: reclamo.id_trabajo } });
        if (trabajo && trabajo.estado === 'en_reclamo') {
          await this.cambiarEstadoTrabajo(m, trabajo, 'terminado', dto.id_supervisor);
        }
 
        return guardado;
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // ---------- Consultas ----------
 
  listar(estado?: string) {
    return this.reclamoRepository.find({
      where: estado ? { estado } : {},
      order: { fecha_reclamo: 'DESC' },
    });
  }
 
  obtenerPorCliente(id_cliente: number) {
    return this.reclamoRepository.find({
      where: { id_cliente },
      order: { fecha_reclamo: 'DESC' },
    });
  }
 
  async obtenerPorId(id_reclamo: number) {
    const reclamo = await this.obtenerReclamo(id_reclamo);
    const evidencias = await this.evidenciaRepository.find({ where: { id_reclamo } });
    return { ...reclamo, evidencias };
  }
}
 