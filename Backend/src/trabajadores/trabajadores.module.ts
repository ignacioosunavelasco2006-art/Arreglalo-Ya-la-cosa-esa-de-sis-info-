import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { TrabajadoresController } from './trabajadores.controller';
import { TrabajadoresService } from './trabajadores.service';
import { UsuariosModule } from '../usuarios/usuarios.module';

import { Usuario } from '../entities/usuario.entity';
import { PerfilTrabajador } from '../entities/perfil-trabajador.entity';
import { DocumentoTrabajador } from '../entities/documento-trabajador.entity';
import { TrabajadorCategoria } from '../entities/trabajador-categoria.entity';
import { TrabajadorZona } from '../entities/trabajador-zona.entity';
import { DisponibilidadTrabajador } from '../entities/disponibilidad-trabajador.entity';
import { Inspeccion } from '../entities/inspeccion.entity';

@Module({
  imports: [
    UsuariosModule, // para consultar si el trabajador tiene datos bancarios (RF-03)
    TypeOrmModule.forFeature([
      Usuario,
      PerfilTrabajador,
      DocumentoTrabajador,
      TrabajadorCategoria,
      TrabajadorZona,
      DisponibilidadTrabajador,
      Inspeccion,
    ]),
  ],
  controllers: [TrabajadoresController],
  providers: [TrabajadoresService],
  exports: [TrabajadoresService],
})
export class TrabajadoresModule {}
