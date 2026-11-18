import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
 
import { Calificacion } from '../entities/calificacion.entity';
import { CalificacionHistorial } from '../entities/calificacion-historial.entity';
import { CalificacionInternaCliente } from '../entities/calificacion-interna-cliente.entity';
import { Trabajo } from '../entities/trabajo.entity';
 
import { CrearCalificacionDto } from './dto/crear-calificacion.dto';
import { ActualizarCalificacionDto } from './dto/actualizar-calificacion.dto';
import { ResponderCalificacionDto } from './dto/responder-calificacion.dto';
import { CrearCalificacionInternaDto } from './dto/crear-calificacion-interna.dto';
import { esEnteroPositivo, manejarErrorBd } from '../common/utilidades';
 
@Injectable()
export class CalificacionesService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Calificacion)
    private readonly calificacionRepository: Repository<Calificacion>,
    @InjectRepository(CalificacionHistorial)
    private readonly historialRepository: Repository<CalificacionHistorial>,
    @InjectRepository(CalificacionInternaCliente)
    private readonly internaRepository: Repository<CalificacionInternaCliente>,
  ) {}
 
  private validarPuntaje(puntaje: any) {
    if (!Number.isInteger(puntaje) || puntaje < 1 || puntaje > 5) {
      throw new BadRequestException('El puntaje debe ser un entero entre 1 y 5');
    }
  }
 
  private validarTexto(texto: string | undefined, campo: string) {
    if (texto !== undefined && texto.length > 500) {
      throw new BadRequestException(`${campo} no puede pasar de 500 caracteres`);
    }
  }
 
  private async obtenerTrabajoTerminado(m: EntityManager, id_trabajo: number) {
    const trabajo = await m.findOne(Trabajo, { where: { id_trabajo } });
    if (!trabajo) throw new NotFoundException('Trabajo no encontrado');
    if (trabajo.estado !== 'terminado') {
      throw new BadRequestException('Solo se califican trabajos terminados');
    }
    return trabajo;
  }
 
  // Actualiza promedio y total en el perfil del trabajador
  private async recalcularPromedio(m: EntityManager, id_trabajador: number) {
    await m.query(
      `UPDATE perfiles_trabajador
          SET calificacion_promedio = COALESCE((SELECT ROUND(AVG(puntaje), 2)
                                                  FROM calificaciones
                                                 WHERE id_trabajador = $1), 0),
              total_calificaciones  = (SELECT COUNT(*)
                                         FROM calificaciones
                                        WHERE id_trabajador = $1)
        WHERE id_usuario = $1`,
      [id_trabajador],
    );
  }
 
  // ---------- Calificación pública ----------
 
  async crear(dto: CrearCalificacionDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_trabajo e id_cliente son obligatorios');
    }
    this.validarPuntaje(dto.puntaje);
    this.validarTexto(dto.comentario, 'El comentario');
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajoTerminado(m, dto.id_trabajo);
        if (trabajo.id_cliente !== dto.id_cliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
 
        const calificacion = await m.save(
          m.create(Calificacion, {
            id_trabajo: trabajo.id_trabajo,
            id_cliente: dto.id_cliente,
            id_trabajador: trabajo.id_trabajador,
            puntaje: dto.puntaje,
            comentario: dto.comentario ?? null,
          }),
        );
 
        await this.recalcularPromedio(m, trabajo.id_trabajador);
        return calificacion;
      });
    } catch (e) {
      manejarErrorBd(e, 'Este trabajo ya fue calificado');
    }
  }
 
  // El cliente puede cambiar su calificación; cada cambio de puntaje queda en el historial (RN-15)
  async actualizar(id_calificacion: number, dto: ActualizarCalificacionDto) {
    if (!esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_cliente es obligatorio');
    }
    if (dto.puntaje === undefined && dto.comentario === undefined) {
      throw new BadRequestException('Indica el puntaje o el comentario a cambiar');
    }
    if (dto.puntaje !== undefined) this.validarPuntaje(dto.puntaje);
    this.validarTexto(dto.comentario, 'El comentario');
 
    return this.dataSource.transaction(async (m) => {
      const cal = await m.findOne(Calificacion, { where: { id_calificacion } });
      if (!cal) throw new NotFoundException('Calificación no encontrada');
      if (cal.id_cliente !== dto.id_cliente) {
        throw new ForbiddenException('Solo el cliente que calificó puede modificarla');
      }
 
      if (dto.puntaje !== undefined && dto.puntaje !== cal.puntaje) {
        await m.insert(CalificacionHistorial, {
          id_calificacion,
          puntaje_anterior: cal.puntaje,
          puntaje_nuevo: dto.puntaje,
        });
        cal.puntaje = dto.puntaje;
      }
      if (dto.comentario !== undefined) cal.comentario = dto.comentario;
 
      const guardada = await m.save(cal);
      await this.recalcularPromedio(m, cal.id_trabajador);
      return guardada;
    });
  }
 
  // El trabajador responde a la calificación (RF-28)
  async responder(id_calificacion: number, dto: ResponderCalificacionDto) {
    if (!esEnteroPositivo(dto.id_trabajador)) {
      throw new BadRequestException('id_trabajador es obligatorio');
    }
    if (!dto.respuesta || dto.respuesta.trim() === '') {
      throw new BadRequestException('La respuesta no puede estar vacía');
    }
    this.validarTexto(dto.respuesta, 'La respuesta');
 
    const cal = await this.calificacionRepository.findOne({ where: { id_calificacion } });
    if (!cal) throw new NotFoundException('Calificación no encontrada');
    if (cal.id_trabajador !== dto.id_trabajador) {
      throw new ForbiddenException('Solo el trabajador calificado puede responder');
    }
 
    cal.respuesta_trabajador = dto.respuesta;
    return this.calificacionRepository.save(cal);
  }
 
  // ---------- Calificación interna del cliente (RF-30, solo administración) ----------
 
  async crearInterna(dto: CrearCalificacionInternaDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_trabajador)) {
      throw new BadRequestException('id_trabajo e id_trabajador son obligatorios');
    }
    this.validarPuntaje(dto.puntaje);
    this.validarTexto(dto.nota, 'La nota');
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajoTerminado(m, dto.id_trabajo);
        if (trabajo.id_trabajador !== dto.id_trabajador) {
          throw new ForbiddenException('El trabajo no pertenece a este trabajador');
        }
 
        return m.save(
          m.create(CalificacionInternaCliente, {
            id_trabajo: trabajo.id_trabajo,
            id_trabajador: dto.id_trabajador,
            id_cliente: trabajo.id_cliente,
            puntaje: dto.puntaje,
            nota: dto.nota ?? null,
          }),
        );
      });
    } catch (e) {
      manejarErrorBd(e, 'Este cliente ya fue calificado en este trabajo');
    }
  }
 
  // ---------- Consultas ----------
 
  obtenerPorTrabajador(id_trabajador: number) {
    return this.calificacionRepository.find({
      where: { id_trabajador },
      order: { fecha: 'DESC' },
    });
  }
 
  async obtenerPorId(id_calificacion: number) {
    const cal = await this.calificacionRepository.findOne({ where: { id_calificacion } });
    if (!cal) throw new NotFoundException('Calificación no encontrada');
    return cal;
  }
 
  obtenerHistorial(id_calificacion: number) {
    return this.historialRepository.find({
      where: { id_calificacion },
      order: { fecha_cambio: 'ASC' },
    });
  }
 
  obtenerInternasPorCliente(id_cliente: number) {
    return this.internaRepository.find({
      where: { id_cliente },
      order: { fecha: 'DESC' },
    });
  }
}