import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { ParametroSistema } from '../entities/parametro-sistema.entity';
import { Notificacion } from '../entities/notificacion.entity';
import { BitacoraAuditoria } from '../entities/bitacora-auditoria.entity';

import { CrearParametroDto } from './dto/crear-parametro.dto';
import { ActualizarParametroDto } from './dto/actualizar-parametro.dto';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { ActualizarNotificacionDto } from './dto/actualizar-notificacion.dto';
import { RegistrarAuditoriaDto } from './dto/registrar-auditoria.dto';

@Injectable()
export class SistemaService {
  constructor(
    @InjectRepository(ParametroSistema)
    private readonly parametroRepository: Repository<ParametroSistema>,

    @InjectRepository(Notificacion)
    private readonly notificacionRepository: Repository<Notificacion>,

    @InjectRepository(BitacoraAuditoria)
    private readonly auditoriaRepository: Repository<BitacoraAuditoria>,
  ) {}


  async crearParametro(dto: CrearParametroDto) {
    const parametro = this.parametroRepository.create(dto);
    return this.parametroRepository.save(parametro);
  }

  async obtenerParametros() {
    return this.parametroRepository.find();
  }

  async obtenerParametro(clave: string) {
    const parametro = await this.parametroRepository.findOneBy({ clave });

    if (!parametro) {
      throw new NotFoundException('Parámetro no encontrado');
    }

    return parametro;
  }

  async actualizarParametro(
    clave: string,
    dto: ActualizarParametroDto,
  ) {
    const parametro = await this.obtenerParametro(clave);
    Object.assign(parametro, dto);
    return this.parametroRepository.save(parametro);
  }


  async crearNotificacion(dto: CrearNotificacionDto) {
    const notificacion = this.notificacionRepository.create(dto);
    return this.notificacionRepository.save(notificacion);
  }

  async obtenerNotificaciones(idUsuario: number) {
    return this.notificacionRepository.find({
      where: { id_usuario: idUsuario },
    });
  }

  async obtenerNotificacion(id: number) {
    const notificacion = await this.notificacionRepository.findOneBy({
      id_notificacion: id,
    });

    if (!notificacion) {
      throw new NotFoundException('Notificación no encontrada');
    }

    return notificacion;
  }

  async actualizarNotificacion(
    id: number,
    dto: ActualizarNotificacionDto,
  ) {
    const notificacion = await this.obtenerNotificacion(id);
    Object.assign(notificacion, dto);
    return this.notificacionRepository.save(notificacion);
  }


  async registrarAuditoria(dto: RegistrarAuditoriaDto) {
    const registro = this.auditoriaRepository.create(dto);
    return this.auditoriaRepository.save(registro);
  }

  async obtenerAuditoria() {
    return this.auditoriaRepository.find();
  }

  async obtenerAuditoriaPorUsuario(idUsuario: number) {
    return this.auditoriaRepository.find({
      where: { id_usuario: idUsuario },
    });
  }
}
