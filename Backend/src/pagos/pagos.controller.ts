import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';

import { PagosService } from './pagos.service';
import { RegistrarAnticipoDto } from './dto/registrar-anticipo.dto';
import { RegistrarSaldoDto } from './dto/registrar-saldo.dto';
import { LiquidarDto } from './dto/liquidar.dto';
import { ConfirmarEfectivoDto } from './dto/confirmar-efectivo.dto';
import { CancelarTrabajoDto } from './dto/cancelar-trabajo.dto';
import { SolicitarDevolucionDto } from './dto/solicitar-devolucion.dto';
import { ResolverDevolucionDto } from './dto/resolver-devolucion.dto';

import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser, type UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

const SUPERVISION = ['supervisor', 'super_supervisor'] as const;

// Antes cualquiera podía "pagar" por otro o liquidar un trabajo. Ahora el usuario sale del token.
// Rutas fijas primero, ":id" al final.
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}

  // ---------- Cliente ----------

  @Roles('cliente')
  @Post('anticipo')
  registrarAnticipo(@CurrentUser('id_usuario') idCliente: number, @Body() dto: RegistrarAnticipoDto) {
    return this.pagosService.registrarAnticipo(idCliente, dto);
  }

  @Roles('cliente')
  @Post('saldo')
  registrarSaldo(@CurrentUser('id_usuario') idCliente: number, @Body() dto: RegistrarSaldoDto) {
    return this.pagosService.registrarSaldo(idCliente, dto);
  }

  @Roles('cliente')
  @Post('devoluciones')
  solicitarDevolucion(@CurrentUser('id_usuario') idCliente: number, @Body() dto: SolicitarDevolucionDto) {
    return this.pagosService.solicitarDevolucion(idCliente, dto);
  }

  @Roles('cliente')
  @Get('devoluciones/mias')
  misDevoluciones(@CurrentUser('id_usuario') idCliente: number) {
    return this.pagosService.misDevoluciones(idCliente);
  }

  // ---------- Cliente o trabajador del trabajo ----------

  @Roles('cliente', 'trabajador')
  @Post('cancelaciones')
  cancelar(@CurrentUser('id_usuario') idUsuario: number, @Body() dto: CancelarTrabajoDto) {
    return this.pagosService.cancelar(idUsuario, dto);
  }

  @Get('mis-pagos')
  misPagos(@CurrentUser('id_usuario') idUsuario: number) {
    return this.pagosService.misPagos(idUsuario);
  }

  @Get('trabajo/:id_trabajo')
  pagosDeTrabajo(
    @Param('id_trabajo', ParseIntPipe) idTrabajo: number,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    return this.pagosService.obtenerPagosDeTrabajo(idTrabajo, usuario);
  }

  // ---------- Supervisión ----------

  // Reintento manual de una liquidación fallida (CU-25 flujo alterno)
  @Roles(...SUPERVISION)
  @Post('liquidacion')
  liquidar(@Body() dto: LiquidarDto, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.pagosService.liquidar(dto.id_trabajo, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Get('devoluciones')
  listarDevoluciones(@Query('estado') estado?: string) {
    return this.pagosService.listarDevoluciones(estado);
  }

  @Roles(...SUPERVISION)
  @Patch('devoluciones/:id/resolver')
  resolverDevolucion(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ResolverDevolucionDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.pagosService.resolverDevolucion(id, dto, idSupervisor);
  }

  @Roles(...SUPERVISION)
  @Patch('devoluciones/:id/procesar')
  procesarDevolucion(@Param('id', ParseIntPipe) id: number, @CurrentUser('id_usuario') idSupervisor: number) {
    return this.pagosService.procesarDevolucion(id, idSupervisor);
  }

  // ---------- Rutas con :id al final ----------

  @Roles('trabajador')
  @Patch(':id/efectivo')
  confirmarEfectivo(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idTrabajador: number,
    @Body() dto: ConfirmarEfectivoDto,
  ) {
    return this.pagosService.confirmarEfectivo(id, idTrabajador, dto);
  }

  @Get(':id/comprobante')
  comprobante(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.pagosService.comprobante(id, usuario);
  }

  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number, @CurrentUser() usuario: UsuarioAutenticado) {
    return this.pagosService.obtenerPorId(id, usuario);
  }
}
