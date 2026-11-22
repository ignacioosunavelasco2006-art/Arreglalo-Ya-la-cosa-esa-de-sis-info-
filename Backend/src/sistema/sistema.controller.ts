import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { SistemaService } from './sistema.service';
import { CrearParametroDto } from './dto/crear-parametro.dto';
import { ActualizarParametroDto } from './dto/actualizar-parametro.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('sistema')
@UseGuards(JwtAuthGuard, RolesGuard)
export class SistemaController {
  constructor(private readonly sistemaService: SistemaService) {}

  // ---------- Parámetros (RF-34) ----------

  // Lectura para cualquier usuario con sesión: comisión, anticipo y plazos
  // deben ser transparentes (visión del informe).
  @Get('parametros')
  obtenerParametros() {
    return this.sistemaService.obtenerParametros();
  }

  @Get('parametros/:clave')
  obtenerParametro(@Param('clave') clave: string) {
    return this.sistemaService.obtenerParametro(clave);
  }

  @Roles('super_supervisor')
  @Post('parametros')
  crearParametro(
    @Body() dto: CrearParametroDto,
    @CurrentUser('id_usuario') idUsuario: number,
  ) {
    return this.sistemaService.crearParametro(dto, idUsuario);
  }

  @Roles('super_supervisor')
  @Patch('parametros/:clave')
  actualizarParametro(
    @Param('clave') clave: string,
    @Body() dto: ActualizarParametroDto,
    @CurrentUser('id_usuario') idUsuario: number,
  ) {
    return this.sistemaService.actualizarParametro(clave, dto, idUsuario);
  }

  // ---------- Notificaciones (RF-35): siempre las del usuario del token ----------

  @Get('notificaciones/mias')
  misNotificaciones(@CurrentUser('id_usuario') idUsuario: number) {
    return this.sistemaService.obtenerMias(idUsuario);
  }

  @Patch('notificaciones/leer-todas')
  leerTodas(@CurrentUser('id_usuario') idUsuario: number) {
    return this.sistemaService.marcarTodasLeidas(idUsuario);
  }

  @Patch('notificaciones/:id/leer')
  leer(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idUsuario: number,
  ) {
    return this.sistemaService.marcarLeida(id, idUsuario);
  }

  // ---------- Bitácora: solo lectura y solo super supervisor ----------

  @Roles('super_supervisor')
  @Get('bitacora')
  bitacora(
    @Query('id_usuario') idUsuario?: string,
    @Query('accion') accion?: string,
    @Query('limite') limite?: string,
  ) {
    return this.sistemaService.obtenerAuditoria({
      id_usuario: idUsuario ? Number(idUsuario) : undefined,
      accion,
      limite: limite ? Number(limite) : undefined,
    });
  }
}
