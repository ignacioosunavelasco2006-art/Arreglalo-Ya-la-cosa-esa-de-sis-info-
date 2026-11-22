import { Module } from '@nestjs/common';

import { AdministracionModule } from '../administracion/administracion.module';
import { TareasService } from './tareas.service';

// Requiere ScheduleModule.forRoot() en AppModule.
@Module({
  imports: [AdministracionModule],
  providers: [TareasService],
})
export class TareasModule {}
