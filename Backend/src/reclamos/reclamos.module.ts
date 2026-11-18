import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
 
import { Reclamo } from '../entities/reclamo.entity';
import { ReclamoEvidencia } from '../entities/reclamo-evidencia.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { ReclamosController } from './reclamos.controller';
import { ReclamosService } from './reclamos.service';
 
@Module({
  imports: [
    TypeOrmModule.forFeature([Reclamo, ReclamoEvidencia, Trabajo, TrabajoHistorialEstado]),
  ],
  controllers: [ReclamosController],
  providers: [ReclamosService],
  exports: [ReclamosService],
})
export class ReclamosModule {}
 