import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { AdministracionController } from './administracion.controller';
import { AdministracionService } from './administracion.service';

import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Suspension } from '../entities/suspension.entity';
import { Usuario } from '../entities/usuario.entity';

// SistemaService llega solo: SistemaModule es @Global.
// PagosModule debe importar AdministracionModule para llamar a evaluarIncidentes().
@Module({
  imports: [TypeOrmModule.forFeature([IncidenteTrabajador, Suspension, Usuario])],
  controllers: [AdministracionController],
  providers: [AdministracionService],
  exports: [AdministracionService],
})
export class AdministracionModule {}
