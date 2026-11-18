import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';

import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Suspension } from '../entities/suspension.entity';

import { CrearIncidenteDto } from './dto/crear-incidente.dto';
import { ActualizarIncidenteDto } from './dto/actualizar-incidente.dto';
import { CrearSuspensionDto } from './dto/crear-suspension.dto';
import { ActualizarSuspensionDto } from './dto/actualizar-suspension.dto';

@Injectable()
export class AdministracionService {
  constructor(
    @InjectRepository(IncidenteTrabajador)
    private readonly incidenteRepository: Repository<IncidenteTrabajador>,

    @InjectRepository(Suspension)
    private readonly suspensionRepository: Repository<Suspension>,
  ) {}

  // INCIDENTES

  async crearIncidente(dto: CrearIncidenteDto) {
    const incidente = this.incidenteRepository.create({
      ...dto,
      anulado: false,
    });

    return this.incidenteRepository.save(incidente);
  }

  async obtenerIncidentes() {
    return this.incidenteRepository.find();
  }

  async obtenerIncidente(id: number) {
    const incidente = await this.incidenteRepository.findOneBy({
      id_incidente: id,
    });

    if (!incidente) {
      throw new NotFoundException('Incidente no encontrado');
    }

    return incidente;
  }

  async actualizarIncidente(
    id: number,
    dto: ActualizarIncidenteDto,
  ) {
    const incidente = await this.obtenerIncidente(id);

    Object.assign(incidente, dto);

    return this.incidenteRepository.save(incidente);
  }

  // SUSPENSIONES

  async crearSuspension(dto: CrearSuspensionDto) {
    const fechaInicio = dto.fecha_inicio
      ? new Date(dto.fecha_inicio)
      : new Date();

    const fechaFin = new Date(dto.fecha_fin);

    if (fechaFin <= fechaInicio) {
      throw new BadRequestException(
        'La fecha final debe ser posterior a la inicial',
      );
    }

    const suspension = this.suspensionRepository.create({
      ...dto,
      fecha_inicio: fechaInicio,
      fecha_fin: fechaFin,
      estado: 'vigente',
    });

    return this.suspensionRepository.save(suspension);
  }

  async obtenerSuspensiones() {
    return this.suspensionRepository.find();
  }

  async obtenerSuspension(id: number) {
    const suspension = await this.suspensionRepository.findOneBy({
      id_suspension: id,
    });

    if (!suspension) {
      throw new NotFoundException('Suspensión no encontrada');
    }

    return suspension;
  }

  async actualizarSuspension(
    id: number,
    dto: ActualizarSuspensionDto,
  ) {
    const suspension = await this.obtenerSuspension(id);

    Object.assign(suspension, dto);

    return this.suspensionRepository.save(suspension);
  }
}
