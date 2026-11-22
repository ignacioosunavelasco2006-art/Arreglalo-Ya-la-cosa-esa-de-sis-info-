import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SolicitudesController } from './solicitudes.controller';
import { SolicitudesService } from './solicitudes.service';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { SolicitudFoto } from '../entities/solicitud-foto.entity';
import { Oferta } from '../entities/oferta.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([Usuario, PerfilTrabajador, SolicitudServicio, SolicitudFoto, Oferta]),
  ],
  controllers: [SolicitudesController],
  providers: [SolicitudesService],
  exports: [SolicitudesService],
})
export class SolicitudesModule {}
