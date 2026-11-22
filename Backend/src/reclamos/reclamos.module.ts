import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Reclamo } from '../entities/reclamo.entity';
import { ReclamoEvidencia } from '../entities/reclamo-evidencia.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';

import { PagosModule } from '../pagos/pagos.module';
import { AdministracionModule } from '../administracion/administracion.module';
import { CalificacionesModule } from '../calificaciones/calificaciones.module';

import { ReclamosController } from './reclamos.controller';
import { ReclamosService } from './reclamos.service';

@Module({
  imports: [
    PagosModule, // devolver dinero
    AdministracionModule, // sancionar y suspender
    CalificacionesModule, // ajustar calificación por reclamo (CU-28)
    TypeOrmModule.forFeature([Reclamo, ReclamoEvidencia, Trabajo, TrabajoHistorialEstado]),
  ],
  controllers: [ReclamosController],
  providers: [ReclamosService],
  exports: [ReclamosService],
})
export class ReclamosModule {}
