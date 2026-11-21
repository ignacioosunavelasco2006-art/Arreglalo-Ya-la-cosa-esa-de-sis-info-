import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';
import { Usuario } from '../entities/usuario.entity';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async iniciarSesion(dto: IniciarSesionDto) {
    // addSelect porque contrasena_hash tiene select:false
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasena_hash')
      .leftJoinAndSelect('usuario.usuarioRoles', 'usuarioRol')
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .where('LOWER(usuario.correo) = LOWER(:correo)', {
        correo: dto.correo.trim(),
      })
      .getOne();

    // Mensaje genérico: no revela si el correo existe o no
    if (!usuario) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    const contrasenaValida = await bcrypt.compare(
      dto.contrasena,
      usuario.contrasena_hash,
    );
    if (!contrasenaValida) {
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    if (usuario.estado === 'eliminada') {
  throw new UnauthorizedException('La cuenta no existe o fue eliminada.');
}

    const roles = usuario.usuarioRoles.map((ur) => ur.rol.nombre);

    const payload: JwtPayload = {
      sub: usuario.id_usuario,
      correo: usuario.correo,
      roles,
    };

    return {
      mensaje: 'Inicio de sesión correcto.',
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      expires_in: this.configService.get<string>('JWT_EXPIRES_IN', '8h'),
      usuario: {
        id_usuario: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono,
        roles,
      },
    };
  }
}