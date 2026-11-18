import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
 
import { Calificacion } from '../entities/calificacion.entity';
import { CalificacionHistorial } from '../entities/calificacion-historial.entity';
import { CalificacionInternaCliente } from '../entities/calificacion-interna-cliente.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { CalificacionesController } from './calificaciones.controller';
import { CalificacionesService } from './calificaciones.service';
 
@Module({
  imports: [
    TypeOrmModule.forFeature([
      Calificacion,
      CalificacionHistorial,
      CalificacionInternaCliente,
      Trabajo,
    ]),
  ],
  controllers: [CalificacionesController],
  providers: [CalificacionesService],
  exports: [CalificacionesService],
})
export class CalificacionesModule {}