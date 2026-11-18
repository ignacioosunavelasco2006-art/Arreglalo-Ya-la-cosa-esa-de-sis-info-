import { Body, Controller, Get, Param, ParseIntPipe, Patch, Post, Query } from '@nestjs/common';
import { PagosService } from './pagos.service';
import { RegistrarAnticipoDto } from './dto/registrar-anticipo.dto';
import { RegistrarSaldoDto } from './dto/registrar-saldo.dto';
import { LiquidarDto } from './dto/liquidar.dto';
import { ConfirmarEfectivoDto } from './dto/confirmar-efectivo.dto';
import { CancelarTrabajoDto } from './dto/cancelar-trabajo.dto';
import { SolicitarDevolucionDto } from './dto/solicitar-devolucion.dto';
import { ResolverDevolucionDto } from './dto/resolver-devolucion.dto';
 
@Controller('pagos')
export class PagosController {
  constructor(private readonly pagosService: PagosService) {}
 
  // --- Rutas fijas primero ---
  @Post('anticipo')
  registrarAnticipo(@Body() dto: RegistrarAnticipoDto) {
    return this.pagosService.registrarAnticipo(dto);
  }
 
  @Post('saldo')
  registrarSaldo(@Body() dto: RegistrarSaldoDto) {
    return this.pagosService.registrarSaldo(dto);
  }
 
  @Post('liquidacion')
  liquidar(@Body() dto: LiquidarDto) {
    return this.pagosService.liquidar(dto);
  }
 
  @Post('cancelaciones')
  cancelar(@Body() dto: CancelarTrabajoDto) {
    return this.pagosService.cancelar(dto);
  }
 
  @Post('devoluciones')
  solicitarDevolucion(@Body() dto: SolicitarDevolucionDto) {
    return this.pagosService.solicitarDevolucion(dto);
  }
 
  @Get('devoluciones')
  listarDevoluciones(@Query('estado') estado?: string) {
    return this.pagosService.listarDevoluciones(estado);
  }
 
  @Patch('devoluciones/:id/resolver')
  resolverDevolucion(@Param('id', ParseIntPipe) id: number, @Body() dto: ResolverDevolucionDto) {
    return this.pagosService.resolverDevolucion(id, dto);
  }
 
  @Patch('devoluciones/:id/procesar')
  procesarDevolucion(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.procesarDevolucion(id);
  }
 
  @Get('trabajo/:id_trabajo')
  obtenerPagosDeTrabajo(@Param('id_trabajo', ParseIntPipe) id_trabajo: number) {
    return this.pagosService.obtenerPagosDeTrabajo(id_trabajo);
  }
 
  // --- Rutas con :id al final ---
  @Patch(':id/efectivo')
  confirmarEfectivo(@Param('id', ParseIntPipe) id: number, @Body() dto: ConfirmarEfectivoDto) {
    return this.pagosService.confirmarEfectivo(id, dto);
  }
 
  @Get(':id')
  obtenerPorId(@Param('id', ParseIntPipe) id: number) {
    return this.pagosService.obtenerPorId(id);
  }
}