import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
 
import { Pago } from '../entities/pago.entity';
import { Cancelacion } from '../entities/cancelacion.entity';
import { Devolucion } from '../entities/devolucion.entity';
import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
 
@Module({
  imports: [
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
  exports: [PagosService],
})
export class PagosModule {}