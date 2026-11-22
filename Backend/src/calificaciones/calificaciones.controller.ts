import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';

import { CalificacionesService } from './calificaciones.service';
import { CrearCalificacionDto } from './dto/crear-calificacion.dto';
import { ActualizarCalificacionDto } from './dto/actualizar-calificacion.dto';
import { ResponderCalificacionDto } from './dto/responder-calificacion.dto';
import { CrearCalificacionInternaDto } from './dto/crear-calificacion-interna.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

// Rutas fijas primero, ":id" al final.
@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly calificacionesService: CalificacionesService) {}

  // ---------- Cliente ----------

  @Roles('cliente')
  @Post()
  crear(@CurrentUser('id_usuario') idCliente: number, @Body() dto: CrearCalificacionDto) {
    return this.calificacionesService.crear(idCliente, dto);
  }

  // Trabajos terminados que aún no calificaste
  @Roles('cliente')
  @Get('pendientes')
  pendientes(@CurrentUser('id_usuario') idCliente: number) {
    return this.calificacionesService.pendientes(idCliente);
  }

  // ---------- Calificación interna (RF-30) ----------

  // El trabajador la crea…
  @Roles('trabajador')
  @Post('internas')
  crearInterna(@CurrentUser('id_usuario') idTrabajador: number, @Body() dto: CrearCalificacionInternaDto) {
    return this.calificacionesService.crearInterna(idTrabajador, dto);
  }

  // …pero SOLO la administración la lee (antes cualquiera podía)
  @Roles('supervisor', 'super_supervisor')
  @Get('internas/cliente/:id_cliente')
  obtenerInternasPorCliente(@Param('id_cliente', ParseIntPipe) idCliente: number) {
    return this.calificacionesService.obtenerInternasPorCliente(idCliente);
  }

  // ---------- Consulta pública (usuario con sesión) ----------

  @Get('trabajador/:id_trabajador')
  obtenerPorTrabajador(
    @Param('id_trabajador', ParseIntPipe) idTrabajador: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.calificacionesService.obtenerPorTrabajador(idTrabajador, usuario);
  }

  // ---------- Rutas con :id ----------

  @Get(':id/historial')
  obtenerHistorial(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.calificacionesService.obtenerHistorial(id, usuario);
  }

  @Roles('trabajador')
  @Patch(':id/respuesta')
  responder(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idTrabajador: number,
    @Body() dto: ResponderCalificacionDto,
  ) {
    return this.calificacionesService.responder(id, idTrabajador, dto);
  }

  @Roles('cliente')
  @Patch(':id')
  actualizar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idCliente: number,
    @Body() dto: ActualizarCalificacionDto,
  ) {
    return this.calificacionesService.actualizar(id, idCliente, dto);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.calificacionesService.obtenerPorId(id, usuario);
  }
}
