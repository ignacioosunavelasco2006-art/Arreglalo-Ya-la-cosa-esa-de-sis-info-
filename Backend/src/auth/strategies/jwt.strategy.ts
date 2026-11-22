import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { InjectRepository } from '@nestjs/typeorm';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { Repository } from 'typeorm';
import { Usuario } from '../../entities/usuario.entity';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    configService: ConfigService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
  ) {
    const secret = configService.get<string>('JWT_SECRET');
    if (!secret) {
      throw new Error('Falta JWT_SECRET en el archivo .env');
    }

    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  // Se ejecuta en cada petición protegida
  async validate(payload: JwtPayload) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: payload.sub },
      relations: { usuarioRoles: { rol: true } },
    });

    if (!usuario || usuario.estado === 'eliminada') {
      throw new UnauthorizedException('La cuenta no está disponible.');
    }

    return {
      id_usuario: usuario.id_usuario,
      correo: usuario.correo,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      estado: usuario.estado,
      roles: usuario.usuarioRoles.map((ur) => ur.rol.nombre),
    };
  }
}