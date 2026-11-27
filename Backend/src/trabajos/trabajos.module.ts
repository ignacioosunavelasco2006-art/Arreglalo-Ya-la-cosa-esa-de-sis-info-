import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TrabajosController } from './trabajos.controller';
import { TrabajosService } from './trabajos.service';
import { PagosModule } from '../pagos/pagos.module';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { SolicitudServicio } from '../entities/solicitud-servicio.entity';
import { Oferta } from '../entities/oferta.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VisitaPrevia } from '../entities/visita-previa.entity';
import { IncrementoPrecio } from '../entities/incremento-precio.entity';
import { SolicitudFinalizacion } from '../entities/solicitud-finalizacion.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';
import { ReprogramacionTrabajo } from '../entities/reprogramacion-trabajo.entity';

@Module({
  imports: [
    PagosModule, // al aceptar la finalización se cobra el saldo y se liquida (RF-20 → RF-25)
    TypeOrmModule.forFeature([
      Usuario,
      PerfilTrabajador,
      SolicitudServicio,
      Oferta,
      Trabajo,
      TrabajoHistorialEstado,
      VisitaPrevia,
      IncrementoPrecio,
      SolicitudFinalizacion,
      VistaTrabajosPrecioTotal,
      ReprogramacionTrabajo,
    ]),
  ],
  controllers: [TrabajosController],
  providers: [TrabajosService],
  exports: [TrabajosService],
})
export class TrabajosModule {}