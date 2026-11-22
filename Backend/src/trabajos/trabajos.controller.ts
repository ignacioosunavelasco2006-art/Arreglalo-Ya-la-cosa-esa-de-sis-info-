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

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

const SUPERVISION = ['supervisor', 'super_supervisor'] as const;

// Quién actúa (cliente o trabajador) sale SIEMPRE del token, no del body ni de la URL.
// Rutas fijas primero, ":id" al final.
@Controller('trabajos')
export class TrabajosController {
  constructor(private readonly trabajosService: TrabajosService) {}

  // ================= Trabajos =================

  @Roles('cliente')
  @Post('aceptar-oferta')
  aceptarOferta(@CurrentUser('id_usuario') idCliente: number, @Body() dto: AceptarOfertaDto) {
    return this.trabajosService.aceptarOferta(idCliente, dto);
  }

  // RF-21: mi historial (con filtro por estado)
  @Get('mis-trabajos')
  misTrabajos(@CurrentUser('id_usuario') idUsuario: number, @Query('estado') estado?: string) {
    return this.trabajosService.obtenerMisTrabajos(idUsuario, estado);
  }

  // RF-19: calendario del trabajador
  @Roles('trabajador')
  @Get('calendario')
  calendario(
    @CurrentUser('id_usuario') idTrabajador: number,
    @Query('desde') desde?: string,
    @Query('hasta') hasta?: string,
  ) {
    return this.trabajosService.calendario(idTrabajador, desde, hasta);
  }

  @Roles(...SUPERVISION)
  @Get()
  obtenerTodos(
    @Query('id_cliente') idCliente?: string,
    @Query('id_trabajador') idTrabajador?: string,
    @Query('estado') estado?: string,
  ) {
    return this.trabajosService.obtenerTodos({
      id_cliente: idCliente ? Number(idCliente) : undefined,
      id_trabajador: idTrabajador ? Number(idTrabajador) : undefined,
      estado,
    });
  }

  // ================= Visitas previas (RF-16) =================

  @Roles('trabajador')
  @Post('visitas')
  crearVisita(@CurrentUser('id_usuario') idTrabajador: number, @Body() dto: CrearVisitaPreviaDto) {
    return this.trabajosService.crearVisita(idTrabajador, dto);
  }

  @Get('ofertas/:idOferta/visitas')
  obtenerVisitas(
    @Param('idOferta', ParseIntPipe) idOferta: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.trabajosService.obtenerVisitas(idOferta, usuario);
  }

  // Cliente: aceptar_fecha, aceptar_precio, rechazar. Trabajador: registrar_resultado.
  // El service valida quién puede cada acción.
  @Roles('cliente', 'trabajador')
  @Patch('visitas/:idVisita')
  responderVisita(
    @Param('idVisita', ParseIntPipe) idVisita: number,
    @CurrentUser('id_usuario') idUsuario: number,
    @Body() dto: ResponderVisitaPreviaDto,
  ) {
    return this.trabajosService.responderVisita(idVisita, idUsuario, dto);
  }

  // ================= Incrementos de precio (RF-17, RF-18) =================

  @Roles('trabajador')
  @Post('incrementos')
  crearIncremento(@CurrentUser('id_usuario') idTrabajador: number, @Body() dto: CrearIncrementoPrecioDto) {
    return this.trabajosService.crearIncremento(idTrabajador, dto);
  }

  @Roles('cliente')
  @Patch('incrementos/:idIncremento')
  responderIncremento(
    @Param('idIncremento', ParseIntPipe) idIncremento: number,
    @CurrentUser('id_usuario') idCliente: number,
    @Body() dto: ResponderIncrementoPrecioDto,
  ) {
    return this.trabajosService.responderIncremento(idIncremento, idCliente, dto);
  }

  // ================= Finalización (RF-20) =================

  @Roles('trabajador')
  @Post('finalizaciones')
  solicitarFinalizacion(@CurrentUser('id_usuario') idTrabajador: number, @Body() dto: SolicitarFinalizacionDto) {
    return this.trabajosService.solicitarFinalizacion(idTrabajador, dto);
  }

  @Roles('cliente')
  @Patch('finalizaciones/:idFinalizacion')
  responderFinalizacion(
    @Param('idFinalizacion', ParseIntPipe) idFinalizacion: number,
    @CurrentUser('id_usuario') idCliente: number,
    @Body() dto: ResponderFinalizacionDto,
  ) {
    return this.trabajosService.responderFinalizacion(idFinalizacion, idCliente, dto);
  }

  // ================= Rutas con :id (al final) =================

  @Get(':id')
  obtenerTrabajo(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.trabajosService.obtenerTrabajo(id, usuario);
  }

  @Get(':id/incrementos')
  obtenerIncrementos(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.trabajosService.obtenerIncrementos(id, usuario);
  }

  @Roles('trabajador')
  @Patch(':id/estado')
  actualizarEstado(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idTrabajador: number,
    @Body() dto: ActualizarEstadoTrabajoDto,
  ) {
    return this.trabajosService.actualizarEstado(id, idTrabajador, dto);
  }
}
