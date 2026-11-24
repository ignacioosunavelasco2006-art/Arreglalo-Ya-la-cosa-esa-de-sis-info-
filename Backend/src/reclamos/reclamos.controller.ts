import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';

import { ReclamosService } from './reclamos.service';
import { CrearReclamoDto } from './dto/crear-reclamo.dto';
import { AgregarEvidenciaDto } from './dto/agregar-evidencia.dto';
import { ResolverReclamoDto } from './dto/resolver-reclamo.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

const SUPERVISION = ['supervisor', 'super_supervisor'] as const;

// Rutas fijas primero, ":id" al final.
@Controller('reclamos')
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}

  // ---------- Cliente ----------

  @Roles('cliente')
  @Post()
  crear(@CurrentUser('id_usuario') idCliente: number, @Body() dto: CrearReclamoDto) {
    return this.reclamosService.crear(idCliente, dto);
  }

  @Roles('cliente')
  @Get('mios')
  misReclamos(@CurrentUser('id_usuario') idCliente: number) {
    return this.reclamosService.misReclamos(idCliente);
  }

  // ---------- Trabajador ----------

  @Roles('trabajador')
  @Get('contra-mi')
  contraMi(@CurrentUser('id_usuario') idTrabajador: number) {
    return this.reclamosService.reclamosContraMi(idTrabajador);
  }

  // ---------- Supervisión ----------

  @Roles(...SUPERVISION)
  @Get()
  listar(@Query('estado') estado?: string) {
    return this.reclamosService.listar(estado);
  }

  // ---------- Rutas con :id ----------

  // Vista consolidada del caso (sección 8.14)
  @Roles(...SUPERVISION)
  @Get(':id/caso')
  caso(@Param('id', ParseIntPipe) id: number) {
    return this.reclamosService.obtenerCaso(id);
  }

  // Cliente o trabajador del trabajo aportan evidencias
  @Roles('cliente', 'trabajador')
  @Post(':id/evidencias')
  agregarEvidencia(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idUsuario: number,
    @Body() dto: AgregarEvidenciaDto,
  ) {
    return this.reclamosService.agregarEvidencia(id, idUsuario, dto);
  }

  @Roles(...SUPERVISION)
  @Patch(':id/revision')
  tomarEnRevision(@Param('id', ParseIntPipe) id: number, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.reclamosService.tomarEnRevision(id, idSupervisor);
  }

  @Roles('supervisor')
  @Patch(':id/escalar')
  escalar(@Param('id', ParseIntPipe) id: number, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.reclamosService.escalar(id, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Patch(':id/resolucion')
  resolver(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
    @Body() dto: ResolverReclamoDto,
  ) {
    return this.reclamosService.resolver(id, usuario, dto);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.reclamosService.obtenerPorId(id, usuario);
  }
}
