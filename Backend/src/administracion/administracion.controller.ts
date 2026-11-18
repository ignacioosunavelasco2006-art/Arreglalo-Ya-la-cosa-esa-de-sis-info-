import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
} from '@nestjs/common';

import { AdministracionService } from './administracion.service';

import { CrearIncidenteDto } from './dto/crear-incidente.dto';
import { ActualizarIncidenteDto } from './dto/actualizar-incidente.dto';
import { CrearSuspensionDto } from './dto/crear-suspension.dto';
import { ActualizarSuspensionDto } from './dto/actualizar-suspension.dto';

@Controller('administracion')
export class AdministracionController {
  constructor(
    private readonly administracionService: AdministracionService,
  ) {}

  @Post('incidentes')
  crearIncidente(@Body() dto: CrearIncidenteDto) {
    return this.administracionService.crearIncidente(dto);
  }

  @Get('incidentes')
  obtenerIncidentes() {
    return this.administracionService.obtenerIncidentes();
  }

  @Get('incidentes/:id')
  obtenerIncidente(@Param('id', ParseIntPipe) id: number) {
    return this.administracionService.obtenerIncidente(id);
  }

  @Patch('incidentes/:id')
  actualizarIncidente(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarIncidenteDto,
  ) {
    return this.administracionService.actualizarIncidente(id, dto);
  }

  @Post('suspensiones')
  crearSuspension(@Body() dto: CrearSuspensionDto) {
    return this.administracionService.crearSuspension(dto);
  }

  @Get('suspensiones')
  obtenerSuspensiones() {
    return this.administracionService.obtenerSuspensiones();
  }

  @Get('suspensiones/:id')
  obtenerSuspension(@Param('id', ParseIntPipe) id: number) {
    return this.administracionService.obtenerSuspension(id);
  }

  @Patch('suspensiones/:id')
  actualizarSuspension(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ActualizarSuspensionDto,
  ) {
    return this.administracionService.actualizarSuspension(id, dto);
  }
}
