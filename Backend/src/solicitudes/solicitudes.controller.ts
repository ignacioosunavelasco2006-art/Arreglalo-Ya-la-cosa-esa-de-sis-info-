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

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

// ORDEN: rutas fijas primero ("mias", "disponibles", "ofertas/..."), ":id" al final.
// Los ids de cliente y trabajador salen del token, nunca del body ni de la URL.
@Controller('solicitudes')
export class SolicitudesController {
  constructor(private readonly solicitudesService: SolicitudesService) {}

  // ================= Cliente =================

  @Roles('cliente')
  @Post()
  crearSolicitud(@CurrentUser('id_usuario') idCliente: number, @Body() dto: CrearSolicitudDto) {
    return this.solicitudesService.crearSolicitud(idCliente, dto);
  }

  @Roles('cliente')
  @Get('mias')
  misSolicitudes(@CurrentUser('id_usuario') idCliente: number, @Query() filtros: ConsultarSolicitudesDto) {
    return this.solicitudesService.obtenerMias(idCliente, filtros.estado);
  }

  // ================= Trabajador =================

  // RF-05 / RF-12: solo solicitudes de sus categorías y zonas
  @Roles('trabajador')
  @Get('disponibles')
  disponibles(@CurrentUser('id_usuario') idTrabajador: number, @Query() filtros: ConsultarSolicitudesDto) {
    return this.solicitudesService.obtenerDisponibles(idTrabajador, filtros);
  }

  @Roles('trabajador')
  @Get('ofertas/mias')
  misOfertas(@CurrentUser('id_usuario') idTrabajador: number) {
    return this.solicitudesService.obtenerMisOfertas(idTrabajador);
  }

  @Roles('trabajador')
  @Patch('ofertas/:idOferta')
  actualizarOferta(
    @Param('idOferta', ParseIntPipe) idOferta: number,
    @CurrentUser('id_usuario') idTrabajador: number,
    @Body() dto: ActualizarOfertaDto,
  ) {
    return this.solicitudesService.actualizarOferta(idOferta, idTrabajador, dto);
  }

  @Roles('cliente')
  @Patch('ofertas/:idOferta/rechazo')
  rechazarOferta(
    @Param('idOferta', ParseIntPipe) idOferta: number,
    @CurrentUser('id_usuario') idCliente: number,
  ) {
    return this.solicitudesService.rechazarOferta(idOferta, idCliente);
  }

  // ================= Supervisión =================

  @Roles('supervisor', 'super_supervisor')
  @Get()
  obtenerTodas(@Query() filtros: ConsultarSolicitudesDto) {
    return this.solicitudesService.obtenerTodas(filtros);
  }

  // ================= Rutas con :id =================

  @Get(':id')
  obtenerSolicitud(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.solicitudesService.obtenerSolicitud(id, usuario);
  }

  @Get(':id/ofertas')
  obtenerOfertas(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.solicitudesService.obtenerOfertasDeSolicitud(id, usuario);
  }

  @Roles('cliente')
  @Patch(':id')
  actualizarSolicitud(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idCliente: number,
    @Body() dto: ActualizarSolicitudDto,
  ) {
    return this.solicitudesService.actualizarSolicitud(id, idCliente, dto);
  }

  @Roles('cliente')
  @Post(':id/fotos')
  agregarFoto(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idCliente: number,
    @Body() dto: AgregarFotoSolicitudDto,
  ) {
    return this.solicitudesService.agregarFoto(id, idCliente, dto);
  }

  @Roles('trabajador')
  @Post(':id/ofertas')
  crearOferta(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idTrabajador: number,
    @Body() dto: CrearOfertaDto,
  ) {
    return this.solicitudesService.crearOferta(id, idTrabajador, dto);
  }
}
