import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';

import { AdministracionService } from './administracion.service';
import { RegistrarIncidenteDto, SancionarDto } from './dto/administracion.dto';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Controller('administracion')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AdministracionController {
  constructor(private readonly administracionService: AdministracionService) {}

  // ---------- Incidentes (supervisión) ----------

  @Roles('supervisor', 'super_supervisor', 'inspector')
  @Post('incidentes')
  registrarIncidente(
    @Body() dto: RegistrarIncidenteDto,
    @CurrentUser('id_usuario') idUsuario: number,
  ) {
    return this.administracionService.registrarIncidente(dto, idUsuario);
  }

  @Roles('supervisor', 'super_supervisor')
  @Get('incidentes')
  listarIncidentes(@Query('id_trabajador') idTrabajador?: string) {
    return this.administracionService.listarIncidentes(
      idTrabajador ? Number(idTrabajador) : undefined,
    );
  }

  @Roles('supervisor', 'super_supervisor')
  @Patch('incidentes/:id/anular')
  anularIncidente(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.administracionService.anularIncidente(id, idSupervisor);
  }

  // ---------- Suspensiones (supervisión) ----------

  @Roles('supervisor', 'super_supervisor')
  @Get('suspensiones')
  listarSuspensiones(@Query('id_usuario') idUsuario?: string) {
    return this.administracionService.listarSuspensiones(
      idUsuario ? Number(idUsuario) : undefined,
    );
  }

  @Roles('supervisor', 'super_supervisor')
  @Post('suspensiones')
  sancionar(
    @Body() dto: SancionarDto,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.administracionService.sancionar(dto, idSupervisor);
  }

  @Roles('supervisor', 'super_supervisor')
  @Patch('suspensiones/:id/levantar')
  levantar(
    @Param('id', ParseIntPipe) id: number,
    @CurrentUser('id_usuario') idSupervisor: number,
  ) {
    return this.administracionService.levantar(id, idSupervisor);
  }

  // ---------- Suspensión voluntaria del propio trabajador (RF-07) ----------

  @Roles('trabajador')
  @Post('mi-suspension')
  suspenderMiCuenta(@CurrentUser('id_usuario') idUsuario: number) {
    return this.administracionService.suspenderVoluntaria(idUsuario);
  }

  @Roles('trabajador')
  @Post('mi-suspension/reactivar')
  reactivarMiCuenta(@CurrentUser('id_usuario') idUsuario: number) {
    return this.administracionService.reactivarVoluntaria(idUsuario);
  }
}