import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Pago } from '../entities/pagos.entity';
import { Cancelacion } from '../entities/cacelacion.entity';
import { Devolucion } from '../entities/devolucion.entities';
import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';
import { AdministracionModule } from '../administracion/administracion.module';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';

@Module({
  imports: [
    AdministracionModule, // evaluarIncidentes() cuando cancela un trabajador (RF-08)
    TypeOrmModule.forFeature([
      Pago,
      Cancelacion,
      Devolucion,
      IncidenteTrabajador,
      Trabajo,
      TrabajoHistorialEstado,
      VistaTrabajosPrecioTotal,
    ]),
  ],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService], // TrabajosModule (cierre) y ReclamosModule (devoluciones) lo usan
})
export class PagosModule {}
