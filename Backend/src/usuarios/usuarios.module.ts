import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { Usuario } from '../entities/usuario.entity';
import { DatosBancarios } from '../entities/datos-bancarios.entity';
import { UsuariosController } from './usuarios.controller';
import { UsuariosService } from './usuarios.service';

// Rol y UsuarioRol se usan con el EntityManager (DataSource), no hace falta registrarlos aquí.
// UsuariosService se exporta para que TrabajadoresModule y PagosModule consulten datos bancarios.
@Module({
  imports: [TypeOrmModule.forFeature([Usuario, DatosBancarios])],
  controllers: [UsuariosController],
  providers: [UsuariosService],
  exports: [UsuariosService],
})
export class UsuariosModule {}
