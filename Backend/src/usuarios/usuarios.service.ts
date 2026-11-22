import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';

import { Usuario } from '../entities/usuario.entity';
import { Rol } from '../entities/rol.entity';
import { UsuarioRol } from '../entities/usuario-rol.entity';
import { DatosBancarios } from '../entities/datos-bancarios.entity';

import { SistemaService } from '../sistema/sistema.service';
import { cifrar, descifrar } from '../common/cifrado';
import { manejarErrorBd } from '../common/Utilidades';

import { CrearUsuarioDto } from './dto/crear-usuario.dto';
import { CrearStaffDto } from './dto/crear-staff.dto';
import { ActualizarUsuarioDto } from './dto/actualizar-usuario.dto';
import { GuardarDatosBancariosDto } from './dto/datos-bancarios.dto';

const ROLES_INTERNOS = ['supervisor', 'super_supervisor', 'inspector'];
const ESTADOS_TRABAJO_VIVO = ['pendiente_anticipo', 'programado', 'en_camino', 'en_proceso'];

const CAMPOS_PUBLICOS = {
  id_usuario: true,
  nombres: true,
  apellidos: true,
  correo: true,
  telefono: true,
  estado: true,
  fecha_registro: true,
} as const;

@Injectable()
export class UsuariosService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    @InjectRepository(Usuario)
    private readonly usuarioRepository: Repository<Usuario>,
    @InjectRepository(DatosBancarios)
    private readonly bancariosRepository: Repository<DatosBancarios>,
  ) {}

  // ---------------------------------------------------------------
  // REGISTRO (RF-02, CU-02)
  // ---------------------------------------------------------------

  // Registro público: cliente o trabajador. Nunca un rol interno.
  async crear(dto: CrearUsuarioDto) {
    const rol = dto.tipo_cuenta ?? 'cliente';
    const usuario = await this.crearConRol(dto, rol);
    await this.sistema.auditar(usuario.id_usuario, 'usuario_registrado', 'usuarios', usuario.id_usuario, `rol ${rol}`);
    return usuario;
  }

  // RF-34: solo el super supervisor crea supervisores e inspectores.
  async crearStaff(dto: CrearStaffDto, idSuperSupervisor: number) {
    const usuario = await this.crearConRol(dto, dto.rol);
    await this.sistema.auditar(
      idSuperSupervisor,
      'staff_creado',
      'usuarios',
      usuario.id_usuario,
      `rol ${dto.rol}`,
    );
    return usuario;
  }

  private async crearConRol(
    dto: { nombres: string; apellidos: string; correo: string; contrasena: string; telefono: string },
    nombreRol: string,
  ) {
    const correo = dto.correo.trim().toLowerCase();

    // Comparación sin importar mayúsculas (los registros antiguos pueden tenerlas)
    const existe = await this.usuarioRepository
      .createQueryBuilder('u')
      .where('LOWER(u.correo) = :correo', { correo })
      .getExists();
    if (existe) throw new ConflictException('El correo ya está registrado. Inicia sesión.');

    const hash = await bcrypt.hash(dto.contrasena, 10);

    try {
      const guardado = await this.dataSource.transaction(async (m) => {
        const rol = await m.findOne(Rol, { where: { nombre: nombreRol } });
        if (!rol) {
          throw new InternalServerErrorException(
            `Falta el rol "${nombreRol}" en la tabla roles`,
          );
        }

        const usuario = await m.save(
          m.create(Usuario, {
            nombres: dto.nombres.trim(),
            apellidos: dto.apellidos.trim(),
            correo,
            contrasena_hash: hash,
            telefono: dto.telefono.trim(),
          }),
        );

        await m.save(
          m.create(UsuarioRol, { id_usuario: usuario.id_usuario, id_rol: rol.id_rol }),
        );
        return usuario;
      });

      const { contrasena_hash, ...resultado } = guardado;
      return { ...resultado, roles: [nombreRol] };
    } catch (error) {
      manejarErrorBd(error, 'El correo ya está registrado. Inicia sesión.');
    }
  }

  // CU-02 paso 4: "activa otra función desde su perfil" con la misma cuenta.
  // Si activa trabajador, queda pendiente de aprobación: el perfil se crea en
  // TrabajadoresModule con estado_verificacion = 'pendiente' (RF-09).
  async activarFuncion(idUsuario: number, nombreRol: 'cliente' | 'trabajador') {
    const usuario = await this.usuarioRepository.findOneBy({ id_usuario: idUsuario });
    if (!usuario || usuario.estado === 'eliminada') {
      throw new NotFoundException('Usuario no encontrado');
    }

    const roles = await this.obtenerRolesDe(idUsuario);
    if (roles.some((r) => ROLES_INTERNOS.includes(r))) {
      throw new BadRequestException('Las cuentas internas no pueden cambiar de función');
    }
    if (roles.includes(nombreRol)) {
      throw new ConflictException(`Ya tienes la función de ${nombreRol}`);
    }

    await this.asignarRol(this.dataSource.manager, idUsuario, nombreRol);
    await this.sistema.auditar(idUsuario, 'funcion_activada', 'usuarios', idUsuario, nombreRol);

    return {
      mensaje:
        nombreRol === 'trabajador'
          ? 'Función de trabajador activada. Completa tu perfil: quedará pendiente de aprobación.'
          : 'Función de cliente activada.',
      roles: [...roles, nombreRol],
      nota: 'Vuelve a iniciar sesión para que el cambio aparezca en tu token.',
    };
  }

  private async asignarRol(manager: EntityManager, idUsuario: number, nombreRol: string) {
    const rol = await manager.findOne(Rol, { where: { nombre: nombreRol } });
    if (!rol) {
      throw new InternalServerErrorException(`Falta el rol "${nombreRol}" en la tabla roles`);
    }
    await manager.save(manager.create(UsuarioRol, { id_usuario: idUsuario, id_rol: rol.id_rol }));
  }

  private async obtenerRolesDe(idUsuario: number): Promise<string[]> {
    const filas: { nombre: string }[] = await this.dataSource.query(
      `SELECT r.nombre FROM usuario_roles ur JOIN roles r ON r.id_rol = ur.id_rol
        WHERE ur.id_usuario = $1`,
      [idUsuario],
    );
    return filas.map((f) => f.nombre);
  }

  listarRoles() {
    return this.dataSource.getRepository(Rol).find({ order: { id_rol: 'ASC' } });
  }

  // ---------------------------------------------------------------
  // CONSULTA Y ACTUALIZACIÓN
  // ---------------------------------------------------------------

  async obtenerTodos(rol?: string) {
    const usuarios = await this.usuarioRepository.find({
      select: CAMPOS_PUBLICOS,
      order: { id_usuario: 'ASC' },
    });

    const asignaciones: { id_usuario: number; nombre: string }[] = await this.dataSource.query(
      `SELECT ur.id_usuario, r.nombre FROM usuario_roles ur JOIN roles r ON r.id_rol = ur.id_rol`,
    );
    const porUsuario = new Map<number, string[]>();
    for (const a of asignaciones) {
      porUsuario.set(a.id_usuario, [...(porUsuario.get(a.id_usuario) ?? []), a.nombre]);
    }

    const conRoles = usuarios.map((u) => ({ ...u, roles: porUsuario.get(u.id_usuario) ?? [] }));
    return rol ? conRoles.filter((u) => u.roles.includes(rol)) : conRoles;
  }

  async obtenerPorId(id: number) {
    const usuario = await this.usuarioRepository.findOne({
      where: { id_usuario: id },
      select: CAMPOS_PUBLICOS,
    });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    return { ...usuario, roles: await this.obtenerRolesDe(id) };
  }

  async actualizar(id: number, dto: ActualizarUsuarioDto) {
    const usuario = await this.usuarioRepository.findOneBy({ id_usuario: id });
    if (!usuario || usuario.estado === 'eliminada') {
      throw new NotFoundException('Usuario no encontrado');
    }

    if (dto.correo !== undefined) {
      const correo = dto.correo.trim().toLowerCase();
      const otro = await this.usuarioRepository
        .createQueryBuilder('u')
        .where('LOWER(u.correo) = :correo', { correo })
        .andWhere('u.id_usuario <> :id', { id })
        .getExists();
      if (otro) throw new ConflictException('Ese correo ya está en uso');
      usuario.correo = correo;
    }
    if (dto.nombres !== undefined) usuario.nombres = dto.nombres.trim();
    if (dto.apellidos !== undefined) usuario.apellidos = dto.apellidos.trim();
    if (dto.telefono !== undefined) usuario.telefono = dto.telefono.trim();

    try {
      await this.usuarioRepository.save(usuario);
    } catch (error) {
      manejarErrorBd(error, 'Ese correo ya está en uso');
    }
    await this.sistema.auditar(id, 'usuario_actualizado', 'usuarios', id);
    return this.obtenerPorId(id);
  }

  // ---------------------------------------------------------------
  // ELIMINACIÓN LÓGICA
  // ---------------------------------------------------------------

  // actor = quien ejecuta la acción (el propio usuario o un supervisor)
  async desactivar(idObjetivo: number, actor: { id_usuario: number; roles: string[] }) {
    const usuario = await this.usuarioRepository.findOneBy({ id_usuario: idObjetivo });
    if (!usuario) throw new NotFoundException('Usuario no encontrado');
    if (usuario.estado === 'eliminada') {
      throw new BadRequestException('La cuenta ya está eliminada');
    }

    const rolesObjetivo = await this.obtenerRolesDe(idObjetivo);
    const esPropio = actor.id_usuario === idObjetivo;
    const actorEsSuper = actor.roles.includes('super_supervisor');
    const actorEsSupervisor = actor.roles.includes('supervisor') || actorEsSuper;

    if (!esPropio && !actorEsSupervisor) {
      throw new ForbiddenException('No puedes desactivar esta cuenta');
    }
    // CU-34: crear o desactivar supervisores es del super supervisor
    if (rolesObjetivo.some((r) => ROLES_INTERNOS.includes(r)) && !actorEsSuper) {
      throw new ForbiddenException('Solo el super supervisor puede desactivar cuentas internas');
    }

    const [{ n }] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS n FROM trabajos
        WHERE (id_cliente = $1 OR id_trabajador = $1) AND estado = ANY($2)`,
      [idObjetivo, ESTADOS_TRABAJO_VIVO],
    );
    if (n > 0) {
      throw new BadRequestException(
        'La cuenta tiene trabajos en curso: deben cumplirse o cancelarse antes',
      );
    }

    usuario.estado = 'eliminada';
    await this.usuarioRepository.save(usuario);
    await this.sistema.auditar(actor.id_usuario, 'usuario_desactivado', 'usuarios', idObjetivo);
    return { mensaje: 'Cuenta desactivada' };
  }

  // ---------------------------------------------------------------
  // DATOS BANCARIOS (RF-03, CU-03)
  // ---------------------------------------------------------------

  async guardarDatosBancarios(idUsuario: number, dto: GuardarDatosBancariosDto) {
    const existente = await this.bancariosRepository.findOneBy({ id_usuario: idUsuario });

    const datos = existente ?? this.bancariosRepository.create({ id_usuario: idUsuario });
    datos.banco = dto.banco.trim();
    datos.titular = dto.titular.trim();
    datos.numero_cuenta = cifrar(dto.numero_cuenta); // se guarda cifrado
    datos.ultimos_digitos = dto.numero_cuenta.slice(-4);
    datos.fecha_actualizacion = new Date();

    const guardado = await this.bancariosRepository.save(datos);
    await this.sistema.auditar(idUsuario, 'datos_bancarios_guardados', 'datos_bancarios', guardado.id_dato);
    return this.enmascarar(guardado);
  }

  // Nunca devuelve el número completo por la API.
  async obtenerDatosBancarios(idUsuario: number) {
    const datos = await this.bancariosRepository.findOneBy({ id_usuario: idUsuario });
    if (!datos) throw new NotFoundException('Aún no registraste tus datos bancarios');
    return this.enmascarar(datos);
  }

  // Uso interno (liquidaciones y devoluciones). No exponer por controller.
  async obtenerParaPago(idUsuario: number) {
    const datos = await this.bancariosRepository.findOneBy({ id_usuario: idUsuario });
    if (!datos) return null;
    return {
      banco: datos.banco,
      titular: datos.titular,
      numero_cuenta: descifrar(datos.numero_cuenta),
    };
  }

  // RF-03: "si es trabajador y no completa los datos, no puede ser aprobado ni recibir pagos"
  async tieneDatosBancarios(idUsuario: number): Promise<boolean> {
    return this.bancariosRepository.existsBy({ id_usuario: idUsuario });
  }

  private enmascarar(d: DatosBancarios) {
    return {
      banco: d.banco,
      titular: d.titular,
      numero_cuenta: `****${d.ultimos_digitos}`,
      fecha_actualizacion: d.fecha_actualizacion,
    };
  }
}
