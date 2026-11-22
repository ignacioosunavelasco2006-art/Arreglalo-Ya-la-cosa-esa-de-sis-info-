import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { CategoriaServicio } from '../entities/categoria-servicio.entity';
import { Zona } from '../entities/zona.entity';
import { CatalogosController } from './catalogos.controller';
import { CatalogosService } from './catalogos.service';

// Los guards son globales (AuthModule): ya no hace falta importar AuthModule aquí.
@Module({
  imports: [TypeOrmModule.forFeature([CategoriaServicio, Zona])],
  controllers: [CatalogosController],
  providers: [CatalogosService],
  exports: [CatalogosService],
})
export class CatalogosModule {}
