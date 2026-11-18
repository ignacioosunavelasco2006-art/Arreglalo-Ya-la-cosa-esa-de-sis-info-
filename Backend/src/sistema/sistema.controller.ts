import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { SistemaService } from './sistema.service';

import { CrearParametroDto } from './dto/crear-parametro.dto';
import { ActualizarParametroDto } from './dto/actualizar-parametro.dto';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { ActualizarNotificacionDto } from './dto/actualizar-notificacion.dto';
import { RegistrarAuditoriaDto } from './dto/registrar-auditoria.dto';

@Controller('sistema')
export class SistemaController {
  constructor(
    private readonly sistemaService: SistemaService,
  ) {}

  @Post('parametros')
  crearParametro(@Body() dto: CrearParametroDto) {
    return this.sistemaService.crearParametro(dto);
  }

  @Get('parametros')
  obtenerParametros() {
    return this.sistemaService.obtenerParametros();
  }

  @Get('parametros/:clave')
  obtenerParametro(@Param('clave') clave: string) {
    return this.sistemaService.obtenerParametro(clave);
  }

  @Patch('parametros/:clave')
  actualizarParametro(
    @Param('clave') clave: string,
    @Body() dto: ActualizarParametroDto,
  ) {
    return this.sistemaService.actualizarParametro(clave, dto);
  }

  @Post('notificaciones')
  crearNotificacion(@Body() dto: CrearNotificacionDto) {
    return this.sistemaService.crearNotificacion(dto);
  }

  @Get('notificaciones/usuario/:idUsuario')
  obtenerNotificaciones(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
  ) {
    return this.sistemaService.obtenerNotificaciones(idUsuario);
  }

  @Patch('notificaciones/:id')
  actualizarNotificacion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarNotificacionDto,
  ) {
    return this.sistemaService.actualizarNotificacion(id, dto);
  }

  @Post('auditoria')
  registrarAuditoria(@Body() dto: RegistrarAuditoriaDto) {
    return this.sistemaService.registrarAuditoria(dto);
  }

  @Get('auditoria')
  obtenerAuditoria() {
    return this.sistemaService.obtenerAuditoria();
  }

  @Get('auditoria/usuario/:idUsuario')
  obtenerAuditoriaPorUsuario(
    @Param('idUsuario', ParseIntPipe) idUsuario: number,
  ) {
    return this.sistemaService.obtenerAuditoriaPorUsuario(idUsuario);
  }
}
