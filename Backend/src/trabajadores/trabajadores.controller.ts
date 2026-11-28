import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  UseInterceptors,
  UploadedFile,
} from '@nestjs/common';

import { FileInterceptor } from '@nestjs/platform-express';
import { TrabajadoresService } from './trabajadores.service';
import { CrearPerfilTrabajadorDto } from './dto/crear-perfil-trabajador.dto';
import { ActualizarPerfilTrabajadorDto } from './dto/actualizar-perfil-trabajador.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { RevisarPerfilDto } from './dto/revisar-perfil.dto';
import { AsignarCategoriasDto } from './dto/asignar-categorias.dto';
import { AsignarZonasDto } from './dto/asignar-zonas.dto';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { ActualizarDisponibilidadDto } from './dto/actualizar-disponibilidad.dto';
import { CrearInspeccionDto } from './dto/crear-inspeccion.dto';
import { RegistrarResultadoDto } from './dto/registrar-resultado.dto';
import { ReprogramarInspeccionDto } from './dto/reprogramar-inspeccion.dto';
import { BuscarTrabajadoresDto } from './dto/buscar-trabajadores.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

const SUPERVISION = ['supervisor', 'super_supervisor'] as const;

// ORDEN IMPORTANTE: las rutas fijas ("mi-perfil", "revision", "inspecciones/...")
// van antes que ":id", si no Nest las confundiría con un id.
@Controller('trabajadores')
export class TrabajadoresController {
  constructor(private readonly trabajadoresService: TrabajadoresService) {}

  // ================= MI PERFIL (trabajador del token) =================

  @Post('mi-perfil')
  crearPerfil(@CurrentUser('id_usuario') id: number, @Body() dto: CrearPerfilTrabajadorDto) {
    return this.trabajadoresService.crearPerfil(id, dto);
  }
@Post('mi-perfil/foto-perfil')
@UseInterceptors(FileInterceptor('foto'))
subirFotoPerfil(
  @CurrentUser('id_usuario') id: number,
@UploadedFile() foto: any,) {
  return this.trabajadoresService.subirFotoPerfil(id, foto);
}
  @Get('mi-perfil')
  miPerfil(@CurrentUser('id_usuario') id: number) {
    return this.trabajadoresService.obtenerMiPerfil(id);
  }

  @Patch('mi-perfil')
  actualizarPerfil(@CurrentUser('id_usuario') id: number, @Body() dto: ActualizarPerfilTrabajadorDto) {
    return this.trabajadoresService.actualizarPerfil(id, dto);
  }

  @Post('mi-perfil/enviar-revision')
  enviarRevision(@CurrentUser('id_usuario') id: number) {
    return this.trabajadoresService.enviarRevision(id);
  }

  @Post('mi-perfil/documentos')
  subirDocumento(@CurrentUser('id_usuario') id: number, @Body() dto: SubirDocumentoDto) {
    return this.trabajadoresService.subirDocumento(id, dto);
  }

  @Get('mi-perfil/documentos')
  misDocumentos(@CurrentUser('id_usuario') id: number) {
    return this.trabajadoresService.obtenerDocumentos(id);
  }

  @Put('mi-perfil/categorias')
  asignarCategorias(@CurrentUser('id_usuario') id: number, @Body() dto: AsignarCategoriasDto) {
    return this.trabajadoresService.asignarCategorias(id, dto);
  }

  @Put('mi-perfil/zonas')
  asignarZonas(@CurrentUser('id_usuario') id: number, @Body() dto: AsignarZonasDto) {
    return this.trabajadoresService.asignarZonas(id, dto);
  }

  @Get('mi-perfil/disponibilidad')
  miDisponibilidad(@CurrentUser('id_usuario') id: number) {
    return this.trabajadoresService.obtenerDisponibilidad(id);
  }

  @Post('mi-perfil/disponibilidad')
  crearDisponibilidad(@CurrentUser('id_usuario') id: number, @Body() dto: CrearDisponibilidadDto) {
    return this.trabajadoresService.crearDisponibilidad(id, dto);
  }

  @Patch('mi-perfil/disponibilidad/:idDisponibilidad')
  actualizarDisponibilidad(
    @CurrentUser('id_usuario') id: number,
    @Param('idDisponibilidad', ParseIntPipe) idDisponibilidad: number,
    @Body() dto: ActualizarDisponibilidadDto,
  ) {
    return this.trabajadoresService.actualizarDisponibilidad(id, idDisponibilidad, dto);
  }

  // ================= INSPECCIONES (rutas fijas) =================

  @Roles('inspector')
  @Get('inspecciones/mias')
  misInspecciones(@CurrentUser('id_usuario') id: number) {
    return this.trabajadoresService.misInspecciones(id);
  }

  // El inspector registra resultado y costo de transporte (RN-10)
  @Roles('inspector')
  @Patch('inspecciones/:idInspeccion/resultado')
  registrarResultado(
    @Param('idInspeccion', ParseIntPipe) idInspeccion: number,
    @Body() dto: RegistrarResultadoDto,
    @CurrentUser('id_usuario') idInspector: number,
  ) {
    return this.trabajadoresService.registrarResultado(idInspeccion, dto, idInspector);
  }

  @Roles(...SUPERVISION)
  @Patch('inspecciones/:idInspeccion/reprogramar')
  reprogramar(
    @Param('idInspeccion', ParseIntPipe) idInspeccion: number,
    @Body() dto: ReprogramarInspeccionDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.trabajadoresService.reprogramarInspeccion(idInspeccion, dto, idSupervisor);
  }

  // ================= SUPERVISIÓN =================

  @Roles(...SUPERVISION)
  @Get('revision')
  cola(@Query('estado') estado?: string) {
    return this.trabajadoresService.obtenerCola(estado);
  }

  // ================= BÚSQUEDA Y PERFIL PÚBLICO (usuario con sesión) =================

  // RF-12: filtros por habilidad, zona y calificación
  @Get()
  buscar(@Query() filtros: BuscarTrabajadoresDto) {
    return this.trabajadoresService.buscar(filtros);
  }

  // RF-06 / CU-06: perfil público (sin carnet ni documentos)
  @Get(':id')
  perfilPublico(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerPerfilPublico(id);
  }

  @Roles(...SUPERVISION)
  @Get(':id/detalle')
  detalle(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerDetalle(id);
  }

  // Documentos privados: solo administración (sección 8.16 del informe)
  @Roles(...SUPERVISION)
  @Get(':id/documentos')
  documentos(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerDocumentos(id);
  }

  // RF-09: aprobar, observar o rechazar
  @Roles(...SUPERVISION)
  @Patch(':id/revision')
  revisar(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarPerfilDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.trabajadoresService.revisarPerfil(id, dto, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Post(':id/inspecciones')
  crearInspeccion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: CrearInspeccionDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.trabajadoresService.crearInspeccion(id, dto, idSupervisor);
  }

  @Roles(...SUPERVISION, 'inspector')
  @Get(':id/inspecciones')
  inspecciones(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerInspecciones(id);
  }
}
