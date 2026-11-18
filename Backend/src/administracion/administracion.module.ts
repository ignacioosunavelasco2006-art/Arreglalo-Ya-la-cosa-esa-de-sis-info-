import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdministracionController } from './administracion.controller';
import { AdministracionService } from './administracion.service';

import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Suspension } from '../entities/suspension.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      IncidenteTrabajador,
      Suspension,
    ]),
  ],
  controllers: [AdministracionController],
  providers: [AdministracionService],
  exports: [AdministracionService],
})
export class AdministracionModule {}
