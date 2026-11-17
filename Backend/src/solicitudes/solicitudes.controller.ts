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

import { SolicitudesService } from './solicitudes.service';
import { CrearSolicitudDto } from './dto/crear-solicitud.dto';
import { ActualizarSolicitudDto } from './dto/actualizar-solicitud.dto';
import { ConsultarSolicitudesDto } from './dto/consultar-solicitudes.dto';
import { AgregarFotoSolicitudDto } from './dto/agregar-foto-solicitud.dto';
import { CrearOfertaDto } from './dto/crear-oferta.dto';
import { ActualizarOfertaDto } from './dto/actualizar-oferta.dto';
import { ResponderOfertaDto } from './dto/responder-oferta.dto';

@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  // ----- Solicitudes -----
  @Post()
  crearSolicitud(@Body() dto: CrearSolicitudDto) {
    return this.solicitudesService.crearSolicitud(dto);
  }

  @Get()
  obtenerSolicitudes(@Query() filtros: ConsultarSolicitudesDto) {
    return this.solicitudesService.obtenerSolicitudes(filtros);
  }

  @Post('cerrar-vencidas')
  cerrarVencidas() {
    return this.solicitudesService.cerrarVencidas();
  }

  // ----- Fotos -----
  @Post('fotos')
  agregarFoto(@Body() dto: AgregarFotoSolicitudDto) {
    return this.solicitudesService.agregarFoto(dto);
  }

  // ----- Ofertas -----
  @Post('ofertas')
  crearOferta(@Body() dto: CrearOfertaDto) {
    return this.solicitudesService.crearOferta(dto);
  }

  @Get('ofertas/trabajador/:idTrabajador')
  obtenerOfertasDeTrabajador(
    @Param('idTrabajador', ParseIntPipe) idTrabajador: number,
  ) {
    return this.solicitudesService.obtenerOfertasDeTrabajador(idTrabajador);
  }

  @Patch('ofertas/:idOferta')
  actualizarOferta(
    @Param('idOferta', ParseIntPipe) idOferta: number,
    @Body() dto: ActualizarOfertaDto,
  ) {
    return this.solicitudesService.actualizarOferta(idOferta, dto);
  }

  @Patch('ofertas/:idOferta/rechazo')
  rechazarOferta(
    @Param('idOferta', ParseIntPipe) idOferta: number,
    @Body() dto: ResponderOfertaDto,
  ) {
    return this.solicitudesService.rechazarOferta(idOferta, dto);
  }

  // ----- Rutas con :id (van al final) -----
  @Get(':id')
  obtenerSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Query('id_usuario') idUsuario?: string,
  ) {
    return this.solicitudesService.obtenerSolicitud(id, idUsuario);
  }

  @Get(':id/ofertas')
  obtenerOfertasDeSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Query('id_cliente') idCliente?: string,
  ) {
    return this.solicitudesService.obtenerOfertasDeSolicitud(id, idCliente);
  }

  @Patch(':id')
  actualizarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSolicitudDto,
  ) {
    return this.solicitudesService.actualizarSolicitud(id, dto);
  }
}