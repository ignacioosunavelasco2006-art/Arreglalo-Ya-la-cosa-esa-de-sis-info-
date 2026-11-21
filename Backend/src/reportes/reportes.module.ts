import { Module } from '@nestjs/common';

import { ReportesController } from './reportes.controller';
import { ReportesService } from './reportes.service';

// Solo lectura: usa DataSource (global en TypeORM) y SistemaService (módulo @Global).
@Module({
  controllers: [ReportesController],
  providers: [ReportesService],
})
export class ReportesModule {}