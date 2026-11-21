import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SistemaController } from './sistema.controller';
import { SistemaService } from './sistema.service';

import { ParametroSistema } from '../entities/parametro-sistema.entity';
import { Notificacion } from '../entities/notificacion.entity';
import { BitacoraAuditoria } from '../entities/bitacora-auditoria.entity';

// @Global: cualquier módulo puede inyectar SistemaService (notificar, auditar,
// leer parámetros) sin tener que importar SistemaModule.
@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([ParametroSistema, Notificacion, BitacoraAuditoria]),
  ],
  controllers: [SistemaController],
  providers: [SistemaService],
  exports: [SistemaService],
})
export class SistemaModule {}