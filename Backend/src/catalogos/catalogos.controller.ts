import {
  Body,
  Controller,
  Get,
  Param,
  ParseBoolPipe,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { CatalogosService } from './catalogos.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { CrearZonaDto } from './dto/crear-zona.dto';
import { ActualizarZonaDto } from './dto/actualizar-zona.dto';
import { SolicitarZonaDto } from './dto/solicitar-zona.dto';

import { Public } from '../auth/decorators/public.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

const SUPERVISION = ['supervisor', 'super_supervisor'] as const;

// Rutas fijas ("todas", "solicitudes") antes que ":id".
@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  // ---------- CATEGORÍAS ----------

  @Public()
  @Get('categorias')
  listarCategorias() {
    return this.catalogosService.listarCategorias();
  }

  @Roles(...SUPERVISION)
  @Get('categorias/todas')
  listarTodasCategorias() {
    return this.catalogosService.listarTodasCategorias();
  }

  @Public()
  @Get('categorias/:id')
  obtenerCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.obtenerCategoria(id);
  }

  @Roles(...SUPERVISION)
  @Post('categorias')
  crearCategoria(@Body() dto: CrearCategoriaDto, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.catalogosService.crearCategoria(dto, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Patch('categorias/:id')
  actualizarCategoria(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCategoriaDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.catalogosService.actualizarCategoria(id, dto, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Patch('categorias/:id/desactivar')
  desactivarCategoria(@Param('id', ParseIntPipe) id: number, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.catalogosService.desactivarCategoria(id, idSupervisor);
  }

  // ---------- ZONAS ----------

  @Public()
  @Get('zonas')
  listarZonas() {
    return this.catalogosService.listarZonas();
  }

  @Roles(...SUPERVISION)
  @Get('zonas/todas')
  listarTodasZonas() {
    return this.catalogosService.listarTodasZonas();
  }

  // CU-05: el trabajador pide una zona que no existe
  @Roles('trabajador')
  @Post('zonas/solicitudes')
  solicitarZona(@CurrentUser('id_usuario') idTrabajador: number, @Body() dto: SolicitarZonaDto) {
    return this.catalogosService.solicitarZona(idTrabajador, dto);
  }

  @Public()
  @Get('zonas/:id')
  obtenerZona(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.obtenerZona(id);
  }

  @Roles(...SUPERVISION)
  @Post('zonas')
  crearZona(@Body() dto: CrearZonaDto, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.catalogosService.crearZona(dto, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Patch('zonas/:id')
  actualizarZona(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarZonaDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.catalogosService.actualizarZona(id, dto, idSupervisor);
  }

  // PATCH /catalogos/zonas/5/desactivar            -> avisa si hay trabajadores asignados
  // PATCH /catalogos/zonas/5/desactivar?confirmar=true -> desactiva igual
  @Roles(...SUPERVISION)
  @Patch('zonas/:id/desactivar')
  desactivarZona(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idSupervisor: number,
    @Query('confirmar', new ParseBoolPipe({ optional: true })) confirmar?: boolean,
  ) {
    return this.catalogosService.desactivarZona(id, idSupervisor, confirmar ?? false);
  }
}
