import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { ReclamosService } from './reclamos.service';
import { CrearReclamoDto } from './dto/crear-reclamo.dto';
import { AgregarEvidenciaDto } from './dto/agregar-evidencia.dto';
import { TomarReclamoDto } from './dto/tomar-reclamo.dto';
import { ResolverReclamoDto } from './dto/resolver-reclamo.dto';
 
@Controller('reclamos')
export class ReclamosController {
  constructor(private readonly reclamosService: ReclamosService) {}
 
  // --- Rutas fijas primero ---
  @Post()
  crear(@Body() dto: CrearReclamoDto) {
    return this.reclamosService.crear(dto);
  }
 
  @Get()
  listar(@Query('estado') estado?: string) {
    return this.reclamosService.listar(estado);
  }
 
  @Get('cliente/:id_cliente')
  obtenerPorCliente(@Param('id_cliente', ParseIntPipe) id_cliente: number) {
    return this.reclamosService.obtenerPorCliente(id_cliente);
  }
 
  // --- Rutas con :id al final ---
  @Post(':id/evidencias')
  agregarEvidencia(@Param('id', ParseIntPipe) id: number, @Body() dto: AgregarEvidenciaDto) {
    return this.reclamosService.agregarEvidencia(id, dto);
  }
 
  @Patch(':id/revision')
  tomarEnRevision(@Param('id', ParseIntPipe) id: number, @Body() dto: TomarReclamoDto) {
    return this.reclamosService.tomarEnRevision(id, dto);
  }
 
  @Patch(':id/escalar')
  escalar(@Param('id', ParseIntPipe) id: number, @Body() dto: TomarReclamoDto) {
    return this.reclamosService.escalar(id, dto);
  }
 
  @Patch(':id/resolucion')
  resolver(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolverReclamoDto) {
    return this.reclamosService.resolver(id, dto);
  }
 
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.reclamosService.obtenerPorId(id);
  }
}
 