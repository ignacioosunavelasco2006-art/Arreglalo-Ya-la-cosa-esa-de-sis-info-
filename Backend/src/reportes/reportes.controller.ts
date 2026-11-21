import { Controller, Get, Param, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';

import { ReportesService } from './reportes.service';
import { RangoDto } from './dto/rango.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

// CU-31: solo supervisor y super supervisor
@Controller('reportes')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('supervisor', 'super_supervisor')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('trabajos')
  trabajos(@Query() q: RangoDto) {
    return this.reportesService.trabajos(q.desde, q.hasta);
  }

  @Get('ingresos')
  ingresos(@Query() q: RangoDto) {
    return this.reportesService.ingresos(q.desde, q.hasta);
  }

  @Get('calificaciones')
  calificaciones(@Query() q: RangoDto) {
    return this.reportesService.calificaciones(q.desde, q.hasta);
  }

  @Get('reclamos')
  reclamos(@Query() q: RangoDto) {
    return this.reportesService.reclamos(q.desde, q.hasta);
  }

  @Get('cancelaciones')
  cancelaciones(@Query() q: RangoDto) {
    return this.reportesService.cancelaciones(q.desde, q.hasta);
  }

  @Get('flujo-economico')
  flujoEconomico(@Query() q: RangoDto) {
    return this.reportesService.flujoEconomico(q.desde, q.hasta);
  }

  // GET /reportes/ingresos/exportar?desde=2026-11-01&hasta=2026-11-30
  @Get(':tipo/exportar')
  async exportar(
    @Param('tipo') tipo: string,
    @Query() q: RangoDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const csv = await this.reportesService.exportarCsv(tipo, q.desde, q.hasta);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="reporte-${tipo}.csv"`);
    return csv;
  }
}