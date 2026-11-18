import {
  Body, Controller, Get, Param, ParseIntPipe, Patch, Post, UseGuards,
} from '@nestjs/common';
import { CatalogosService } from './catalogos.service';
import { CrearCategoriaDto } from './dto/crear-categoria.dto';
import { ActualizarCategoriaDto } from './dto/actualizar-categoria.dto';
import { CrearZonaDto } from './dto/crear-zona.dto';
import { ActualizarZonaDto } from './dto/actualizar-zona.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@Controller('catalogos')
export class CatalogosController {
  constructor(private readonly catalogosService: CatalogosService) {}

  // ---------- CATEGORÍAS ----------

  @Get('categorias')
  listarCategorias() {
    return this.catalogosService.listarCategorias();
  }

  @Get('categorias/:id')
  obtenerCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.obtenerCategoria(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'super_supervisor')
  @Post('categorias')
  crearCategoria(@Body() dto: CrearCategoriaDto) {
    return this.catalogosService.crearCategoria(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'super_supervisor')
  @Patch('categorias/:id')
  actualizarCategoria(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarCategoriaDto,
  ) {
    return this.catalogosService.actualizarCategoria(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'super_supervisor')
  @Patch('categorias/:id/desactivar')
  desactivarCategoria(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.desactivarCategoria(id);
  }

  // ---------- ZONAS ----------

  @Get('zonas')
  listarZonas() {
    return this.catalogosService.listarZonas();
  }

  @Get('zonas/:id')
  obtenerZona(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.obtenerZona(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'super_supervisor')
  @Post('zonas')
  crearZona(@Body() dto: CrearZonaDto) {
    return this.catalogosService.crearZona(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'super_supervisor')
  @Patch('zonas/:id')
  actualizarZona(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarZonaDto,
  ) {
    return this.catalogosService.actualizarZona(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('supervisor', 'super_supervisor')
  @Patch('zonas/:id/desactivar')
  desactivarZona(@Param('id', ParseIntPipe) id: number) {
    return this.catalogosService.desactivarZona(id);
  }
}