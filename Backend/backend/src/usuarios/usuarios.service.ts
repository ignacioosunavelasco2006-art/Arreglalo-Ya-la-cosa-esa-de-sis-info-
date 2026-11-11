

import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from '../entities/usuario.entity';
import { CrearUsuarioDto } from './dto/crear-usuario.dto';

@Injectable()
export class UsuariosService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {}

  // Registrar un usuario
  async crear(dto: CrearUsuarioDto) {
    const existe = await this.usuarioRepository.findOne({
      where: { correo: dto.correo },
    });

    if (existe) {
      throw new ConflictException('El correo ya está registrado');
    }

    const hash = await bcrypt.hash(dto.contrasena, 10);

    const nuevoUsuario = this.usuarioRepository.create({
      nombres: dto.nombres,
      apellidos: dto.apellidos,
      correo: dto.correo,
      contrasena_hash: hash,
      telefono: dto.telefono,
    });

    const usuarioGuardado =
      await this.usuarioRepository.save(nuevoUsuario);

    // No devolver la contraseña ni su hash
    const { contrasena_hash, ...resultado } = usuarioGuardado;

    return resultado;
  }

  // Consultar todos los usuarios
  async obtenerTodos() {
    return this.usuarioRepository.find({
      select: {
        id_usuario: true,
        nombres: true,
        apellidos: true,
        correo: true,
        telefono: true,
        estado: true,
        fecha_registro: true,
      },
    });
  }

  // Consultar usuario por ID
  async obtenerPorId(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: id },
      select: {
        id_usuario: true,
        nombres: true,
        apellidos: true,
        correo: true,
        telefono: true,
        estado: true,
        fecha_registro: true,
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return usuario;
  }
}
