
import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SistemaController } from './sistema.controller';
import { SistemaService } from './sistema.service';
import { CorreoService } from './correo.service';

import { ParametroSistema } from '../entities/parametro-sistema.entity';
import { Notificacion } from '../entities/notificacion.entity';
import { BitacoraAuditoria } from '../entities/bitacora-auditoria.entity';
import { Usuario } from '../entities/usuario.entity';

@Global()
@Module({
  imports: [
    TypeOrmModule.forFeature([
      ParametroSistema,
      Notificacion,
      BitacoraAuditoria,
      Usuario,
    ]),
  ],
  controllers: [SistemaController],
  providers: [SistemaService, CorreoService],
  exports: [SistemaService],
})
export class SistemaModule {}
