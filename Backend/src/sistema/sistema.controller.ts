import { Controller, Get, Post, Patch, Param, Body, ParseIntPipe } from '@nestjs/common';
import { SistemaService } from './sistema.service';
import { CrearParametroDto } from './dto/crear-parametro.dto';
import { ActualizarParametroDto } from './dto/actualizar-parametro.dto';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { ActualizarNotificacionDto } from './dto/actualizar-notificacion.dto';
import { RegistrarAuditoriaDto } from './dto/registrar-auditoria.dto';

@Controller('sistema')
export class SistemaController {
  constructor(private readonly sistemaService: SistemaService) {}

  @Get('parametros')
  obtenerParametros() {
    return this.sistemaService.listarParametros();
  }

  @Post('parametros')
  crearParametro(@Body() dto: CrearParametroDto) {
    return this.sistemaService.crearParametro(dto);
  }

  @Patch('parametros/:id')
  actualizarParametro(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarParametroDto,
  ) {
    return this.sistemaService.actualizarParametro(id, dto);
  }

  @Get('notificaciones/:usuarioId')
  obtenerNotificaciones(@Param('usuarioId', ParseIntPipe) usuarioId: number) {
    return this.sistemaService.listarNotificacionesPorUsuario(usuarioId);
  }

  @Post('notificaciones')
  crearNotificacion(@Body() dto: CrearNotificacionDto) {
    return this.sistemaService.crearNotificacion(dto);
  }

  @Patch('notificaciones/:id')
  actualizarNotificacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarNotificacionDto,
  ) {
    return this.sistemaService.marcarNotificacionLeida(id, dto);
  }

  @Get('auditoria')
  obtenerAuditoria() {
    return this.sistemaService.listarAuditorias();
  }

  @Post('auditoria')
  registrarAuditoria(@Body() dto: RegistrarAuditoriaDto) {
    return this.sistemaService.registrarAuditoria(dto);
  }
}
