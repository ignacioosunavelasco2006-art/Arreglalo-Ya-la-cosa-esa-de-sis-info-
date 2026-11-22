import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcrypt';
import { Repository } from 'typeorm';

import { Usuario } from '../entities/usuario.entity';
import { SistemaService } from '../sistema/sistema.service';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { JwtPayload } from './interfaces/jwt-payload.interface';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly sistema: SistemaService,
  ) {}

  async iniciarSesion(dto: IniciarSesionDto) {
    const correo = dto.correo.trim();

    // addSelect porque contrasena_hash tiene select:false
    const usuario = await this.usuarioRepository
      .createQueryBuilder('usuario')
      .addSelect('usuario.contrasena_hash')
      .leftJoinAndSelect('usuario.usuarioRoles', 'usuarioRol')
      .leftJoinAndSelect('usuarioRol.rol', 'rol')
      .where('LOWER(usuario.correo) = LOWER(:correo)', { correo })
      .getOne();

    // Mensaje genérico: no revela si el correo existe o no
    const contrasenaValida = usuario
      ? await bcrypt.compare(dto.contrasena, usuario.contrasena_hash)
      : false;

    if (!usuario || !contrasenaValida) {
      // Los intentos fallidos también quedan en la bitácora (detecta fuerza bruta)
      await this.sistema.auditar(usuario?.id_usuario ?? null, 'login_fallido', 'usuarios', usuario?.id_usuario ?? null, correo);
      throw new UnauthorizedException('Credenciales incorrectas.');
    }

    // RN-18 / CU-01: la cuenta suspendida SÍ entra, con funciones limitadas.
    // Solo la cuenta eliminada queda fuera.
    if (usuario.estado === 'eliminada') {
      throw new UnauthorizedException('La cuenta no existe o fue eliminada.');
    }

    const roles = usuario.usuarioRoles.map((ur) => ur.rol.nombre);

    const payload: JwtPayload = {
      sub: usuario.id_usuario,
      correo: usuario.correo,
      roles,
    };

    // CU-01 postcondición: "sesión iniciada y registrada en la bitácora"
    await this.sistema.auditar(usuario.id_usuario, 'inicio_sesion', 'usuarios', usuario.id_usuario);

    return {
      mensaje: 'Inicio de sesión correcto.',
      access_token: await this.jwtService.signAsync(payload),
      token_type: 'Bearer',
      expires_in: this.configService.get<string>('JWT_EXPIRES_IN', '8h'),
      aviso:
        usuario.estado === 'suspendida'
          ? 'Tu cuenta está suspendida: no puedes ofertar, aceptar trabajos ni recibir solicitudes hasta que termine la suspensión.'
          : undefined,
      usuario: {
        id_usuario: usuario.id_usuario,
        nombres: usuario.nombres,
        apellidos: usuario.apellidos,
        correo: usuario.correo,
        telefono: usuario.telefono,
        estado: usuario.estado,
        roles,
      },
    };
  }
}
