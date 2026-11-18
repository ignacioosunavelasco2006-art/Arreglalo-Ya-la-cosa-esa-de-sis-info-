import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { TrabajosService } from './trabajos.service';
import { AceptarOfertaDto } from './dto/aceptar-oferta.dto';
import { ActualizarEstadoTrabajoDto } from './dto/actualizar-estado-trabajo.dto';
import { CrearVisitaPreviaDto } from './dto/crear-visita-previa.dto';
import { ResponderVisitaPreviaDto } from './dto/responder-visita-previa.dto';
import { CrearIncrementoPrecioDto } from './dto/crear-incremento-precio.dto';
import { ResponderIncrementoPrecioDto } from './dto/responder-incremento-precio.dto';
import { SolicitarFinalizacionDto } from './dto/solicitar-finalizacion.dto';
import { ResponderFinalizacionDto } from './dto/responder-finalizacion.dto';

@Controller('trabajos')
export class TrabajosController {
  constructor(private readonly trabajosService: TrabajosService) {}

  // ----- Trabajos -----
  @Post('aceptar-oferta')
  aceptarOferta(@Body() dto: AceptarOfertaDto) {
    return this.trabajosService.aceptarOferta(dto);
  }

  @Get()
  obtenerTrabajos(
    @Query('id_cliente') idCliente?: string,
    @Query('id_trabajador') idTrabajador?: string,
    @Query('estado') estado?: string,
  ) {
    return this.trabajosService.obtenerTrabajos(idCliente, idTrabajador, estado);
  }

  // ----- Visitas previas -----
  @Post('visitas')
  crearVisita(@Body() dto: CrearVisitaPreviaDto) {
    return this.trabajosService.crearVisita(dto);
  }

  @Get('ofertas/:idOferta/visitas')
  obtenerVisitas(
    @Param('idOferta', ParseIntPipe) idOferta: number,
    @Query('id_usuario') idUsuario?: string,
  ) {
    return this.trabajosService.obtenerVisitas(idOferta, idUsuario);
  }

  @Patch('visitas/:idVisita')
  responderVisita(
    @Param('idVisita', ParseIntPipe) idVisita: number,
    @Body() dto: ResponderVisitaPreviaDto,
  ) {
    return this.trabajosService.responderVisita(idVisita, dto);
  }

  // ----- Incrementos de precio -----
  @Post('incrementos')
  crearIncremento(@Body() dto: CrearIncrementoPrecioDto) {
    return this.trabajosService.crearIncremento(dto);
  }

  @Patch('incrementos/:idIncremento')
  responderIncremento(
    @Param('idIncremento', ParseIntPipe) idIncremento: number,
    @Body() dto: ResponderIncrementoPrecioDto,
  ) {
    return this.trabajosService.responderIncremento(idIncremento, dto);
  }

  // ----- Finalización -----
  @Post('finalizaciones')
  solicitarFinalizacion(@Body() dto: SolicitarFinalizacionDto) {
    return this.trabajosService.solicitarFinalizacion(dto);
  }

  @Patch('finalizaciones/:idFinalizacion')
  responderFinalizacion(
    @Param('idFinalizacion', ParseIntPipe) idFinalizacion: number,
    @Body() dto: ResponderFinalizacionDto,
  ) {
    return this.trabajosService.responderFinalizacion(idFinalizacion, dto);
  }

  // ----- Rutas con :id (van al final) -----
  @Get(':id')
  obtenerTrabajo(
    @Param('id', ParseIntPipe) id: number,
    @Query('id_usuario') idUsuario?: string,
  ) {
    return this.trabajosService.obtenerTrabajo(id, idUsuario);
  }

  @Get(':id/incrementos')
  obtenerIncrementos(
    @Param('id', ParseIntPipe) id: number,
    @Query('id_usuario') idUsuario?: string,
  ) {
    return this.trabajosService.obtenerIncrementos(id, idUsuario);
  }

  @Patch(':id/estado')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarEstadoTrabajoDto,
  ) {
    return this.trabajosService.actualizarEstado(id, dto);
  }
}