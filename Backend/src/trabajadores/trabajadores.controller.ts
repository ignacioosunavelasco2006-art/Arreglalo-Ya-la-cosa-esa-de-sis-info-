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
} from '@nestjs/common';

import { TrabajadoresService } from './trabajadores.service';
import { CrearPerfilTrabajadorDto } from './dto/crear-perfil-trabajador.dto';
import { ActualizarPerfilTrabajadorDto } from './dto/actualizar-perfil-trabajador.dto';
import { SubirDocumentoDto } from './dto/subir-documento.dto';
import { RevisarDocumentoDto } from './dto/revisar-documento.dto';
import { AsignarCategoriasDto } from './dto/asignar-categorias.dto';
import { AsignarZonasDto } from './dto/asignar-zonas.dto';
import { CrearDisponibilidadDto } from './dto/crear-disponibilidad.dto';
import { ActualizarDisponibilidadDto } from './dto/actualizar-disponibilidad.dto';
import { CrearInspeccionDto } from './dto/crear-inspeccion.dto';
import { ActualizarInspeccionDto } from './dto/actualizar-inspeccion.dto';

@Controller('trabajadores')
export class TrabajadoresController {
  constructor(private readonly trabajadoresService: TrabajadoresService) {}

  // ----- Perfil -----
  @Post()
  crearPerfil(@Body() dto: CrearPerfilTrabajadorDto) {
    return this.trabajadoresService.crearPerfil(dto);
  }

  @Get()
  obtenerPerfiles(@Query('estado') estado?: string) {
    return this.trabajadoresService.obtenerPerfiles(estado);
  }

  @Get(':id')
  obtenerPerfil(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerPerfil(id);
  }

  @Patch(':id')
  actualizarPerfil(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarPerfilTrabajadorDto,
  ) {
    return this.trabajadoresService.actualizarPerfil(id, dto);
  }

  @Patch(':id/revision')
  revisarPerfil(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: RevisarDocumentoDto,
  ) {
    return this.trabajadoresService.revisarPerfil(id, dto);
  }

  // ----- Documentos -----
  @Post('documentos')
  subirDocumento(@Body() dto: SubirDocumentoDto) {
    return this.trabajadoresService.subirDocumento(dto);
  }

  @Get(':id/documentos')
  obtenerDocumentos(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerDocumentos(id);
  }

  // ----- Categorías y zonas -----
  @Put(':id/categorias')
  asignarCategorias(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarCategoriasDto,
  ) {
    return this.trabajadoresService.asignarCategorias(id, dto);
  }

  @Put(':id/zonas')
  asignarZonas(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: AsignarZonasDto,
  ) {
    return this.trabajadoresService.asignarZonas(id, dto);
  }

  // ----- Disponibilidad -----
  @Post('disponibilidad')
  crearDisponibilidad(@Body() dto: CrearDisponibilidadDto) {
    return this.trabajadoresService.crearDisponibilidad(dto);
  }

  @Get(':id/disponibilidad')
  obtenerDisponibilidad(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerDisponibilidad(id);
  }

  @Patch('disponibilidad/:idDisponibilidad')
  actualizarDisponibilidad(
    @Param('idDisponibilidad', ParseIntPipe) idDisponibilidad: number,
    @Body() dto: ActualizarDisponibilidadDto,
  ) {
    return this.trabajadoresService.actualizarDisponibilidad(
      idDisponibilidad,
      dto,
    );
  }

  // ----- Inspecciones -----
  @Post('inspecciones')
  crearInspeccion(@Body() dto: CrearInspeccionDto) {
    return this.trabajadoresService.crearInspeccion(dto);
  }

  @Get(':id/inspecciones')
  obtenerInspecciones(@Param('id', ParseIntPipe) id: number) {
    return this.trabajadoresService.obtenerInspecciones(id);
  }

  @Patch('inspecciones/:idInspeccion')
  actualizarInspeccion(
    @Param('idInspeccion', ParseIntPipe) idInspeccion: number,
    @Body() dto: ActualizarInspeccionDto,
  ) {
    return this.trabajadoresService.actualizarInspeccion(idInspeccion, dto);
  }
}