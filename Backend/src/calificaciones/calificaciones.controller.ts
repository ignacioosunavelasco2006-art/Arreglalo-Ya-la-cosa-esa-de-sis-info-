import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post } from '@nestjs/common';
import { CalificacionesService } from './calificaciones.service';
import { CrearCalificacionDto } from './dto/crear-calificacion.dto';
import { ActualizarCalificacionDto } from './dto/actualizar-calificacion.dto';
import { ResponderCalificacionDto } from './dto/responder-calificacion.dto';
import { CrearCalificacionInternaDto } from './dto/crear-calificacion-interna.dto';
 
@Controller('calificaciones')
export class CalificacionesController {
  constructor(private readonly calificacionesService: CalificacionesService) {}
 
  // --- Rutas fijas primero ---
  @Post()
  crear(@Body() dto: CrearCalificacionDto) {
    return this.calificacionesService.crear(dto);
  }
 
  @Post('internas')
  crearInterna(@Body() dto: CrearCalificacionInternaDto) {
    return this.calificacionesService.crearInterna(dto);
  }
 
  @Get('internas/cliente/:id_cliente')
  obtenerInternasPorCliente(@Param('id_cliente', ParseIntPipe) id_cliente: number) {
    return this.calificacionesService.obtenerInternasPorCliente(id_cliente);
  }
 
  @Get('trabajador/:id_trabajador')
  obtenerPorTrabajador(@Param('id_trabajador', ParseIntPipe) id_trabajador: number) {
    return this.calificacionesService.obtenerPorTrabajador(id_trabajador);
  }
 
  // --- Rutas con :id al final ---
  @Get(':id/historial')
  obtenerHistorial(@Param('id', ParseIntPipe) id: number) {
    return this.calificacionesService.obtenerHistorial(id);
  }
 
  @Patch(':id/respuesta')
  responder(@Param('id', ParseIntPipe) id: number, @Body() dto: ResponderCalificacionDto) {
    return this.calificacionesService.responder(id, dto);
  }
 
  @Patch(':id')
  actualizar(@Param('id', ParseIntPipe) id: number, @Body() dto: ActualizarCalificacionDto) {
    return this.calificacionesService.actualizar(id, dto);
  }
 
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.calificacionesService.obtenerPorId(id);
  }
}
 