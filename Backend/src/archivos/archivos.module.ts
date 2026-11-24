import { Module } from '@nestjs/common';

import { ArchivosController } from './archivos.controller';
import { ArchivosService } from './archivos.service';

@Module({
  controllers: [ArchivosController],
  providers: [ArchivosService],
  exports: [ArchivosService],
})
export class ArchivosModule {}
