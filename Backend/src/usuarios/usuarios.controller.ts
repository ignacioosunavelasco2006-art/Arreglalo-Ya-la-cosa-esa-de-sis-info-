import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';

import { UsuariosService } from './usuarios.service';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { CrearStaffDto } from './dto/crear-staff.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { GuardarDatosBancariosDto } from './dto/datos-bancarios.dto';

import { CambiarContrasenaDto } from './dto/cambiar-contrasena.dto'; 
import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

// Las rutas fijas (roles, mi-cuenta, supervisores) van ANTES de ':id'.
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly usuariosService: UsuariosService) {}

  // ---------- Registro (público) ----------

  @Public()
  @Post()
  registrar(@Body() dto: CrearUsuarioDto) {
    return this.usuariosService.crear(dto);
  }

  // RF-34: crear supervisores / inspectores
  @Roles('super_supervisor')
  @Post('supervisores')
  crearStaff(
    @Body() dto: CrearStaffDto,
    @CurrentUser('id_usuario') idSuper: number,
  ) {
    return this.usuariosService.crearStaff(dto, idSuper);
  }

  @Roles('supervisor', 'super_supervisor')
  @Get('roles')
  listarRoles() {
    return this.usuariosService.listarRoles();
  }

  // ---------- Mi cuenta (siempre el usuario del token) ----------

  @Get('mi-cuenta')
  miCuenta(@CurrentUser('id_usuario') id: number) {
    return this.usuariosService.obtenerPorId(id);
  }

  @Patch('mi-cuenta')
  actualizarMiCuenta(
    @CurrentUser('id_usuario') id: number,
    @Body() dto: ActualizarUsuarioDto,
  ) {
    return this.usuariosService.actualizar(id, dto);
  }

  @Patch('mi-cuenta/desactivar')
  desactivarMiCuenta(@CurrentUser() usuario: UsuarioAutenticado) {
    return this.usuariosService.desactivar(usuario.id_usuario, usuario);
  }
  
  @Patch('mi-cuenta/contrasena') // NUEVO
  cambiarContrasena(
    @CurrentUser('id_usuario') id: number,
    @Body() dto: CambiarContrasenaDto,
  ) {
    return this.usuariosService.cambiarContrasena(id, dto);
  }
  // CU-02: cambiar de función sin crear otra cuenta
  @Post('mi-cuenta/funciones/:rol')
  activarFuncion(
    @CurrentUser('id_usuario') id: number,
    @Param('rol') rol: string,
  ) {
    if (rol !== 'cliente' && rol !== 'trabajador') {
      throw new ForbiddenException('Solo puedes activar la función de cliente o de trabajador');
    }
    return this.usuariosService.activarFuncion(id, rol);
  }

  // ---------- Datos bancarios (RF-03): solo el dueño ----------

  @Get('mi-cuenta/datos-bancarios')
  misDatosBancarios(@CurrentUser('id_usuario') id: number) {
    return this.usuariosService.obtenerDatosBancarios(id);
  }

  @Put('mi-cuenta/datos-bancarios')
  guardarDatosBancarios(
    @CurrentUser('id_usuario') id: number,
    @Body() dto: GuardarDatosBancariosDto,
  ) {
    return this.usuariosService.guardarDatosBancarios(id, dto);
  }

  // ---------- Supervisión ----------

  @Roles('supervisor', 'super_supervisor')
  @Get()
  obtenerTodos(@Query('rol') rol?: string) {
    return this.usuariosService.obtenerTodos(rol);
  }

  // El propio usuario o un supervisor
  @Get(':id')
  obtenerPorId(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const esSupervisor =
      usuario.roles.includes('supervisor') || usuario.roles.includes('super_supervisor');
    if (usuario.id_usuario !== id && !esSupervisor) {
      throw new ForbiddenException('No puedes ver los datos de otro usuario');
    }
    return this.usuariosService.obtenerPorId(id);
  }

  @Roles('supervisor', 'super_supervisor')
  @Patch(':id/desactivar')
  desactivar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.usuariosService.desactivar(id, usuario);
  }
}
