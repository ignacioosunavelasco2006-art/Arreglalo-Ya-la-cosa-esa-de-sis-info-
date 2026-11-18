import { Injectable, NotFoundException } from '@nestjs/common';
import { CrearParametroDto } from './dto/crear-parametro.dto';
import { ActualizarParametroDto } from './dto/actualizar-parametro.dto';
import { CrearNotificacionDto } from './dto/crear-notificacion.dto';
import { ActualizarNotificacionDto } from './dto/actualizar-notificacion.dto';
import { RegistrarAuditoriaDto } from './dto/registrar-auditoria.dto';

@Injectable()
export class SistemaService {
  private parametros: any[] = [
    { id: 1, clave: 'COMISION_PLATAFORMA', valor: '5', descripcion: 'Comisión digital (%)' },
    { id: 2, clave: 'ANTICIPO_SERVICIO', valor: '25', descripcion: 'Anticipo obligatorio (%)' },
    { id: 3, clave: 'VIGENCIA_SOLICITUD_DIAS', valor: '30', descripcion: 'Días de vigencia' },
    { id: 4, clave: 'PLAZO_RECLAMO_DIAS', valor: '7', descripcion: 'Días para reclamar tras cierre' },
  ];
  private notificaciones: any[] = [];
  private auditorias: any[] = [];

  listarParametros() {
    return this.parametros;
  }

  crearParametro(dto: CrearParametroDto) {
    const nuevo = { id: this.parametros.length + 1, ...dto, actualizadoEn: new Date() };
    this.parametros.push(nuevo);
    return nuevo;
  }

  actualizarParametro(id: number, dto: ActualizarParametroDto) {
    const param = this.parametros.find((p) => p.id === id);
    if (!param) throw new NotFoundException('Parámetro no encontrado');
    param.valor = dto.valor;
    if (dto.descripcion) param.descripcion = dto.descripcion;
    param.actualizadoEn = new Date();
    return param;
  }

  listarNotificacionesPorUsuario(usuarioId: number) {
    return this.notificaciones.filter((n) => n.usuarioId === usuarioId);
  }

  crearNotificacion(dto: CrearNotificacionDto) {
    const nueva = {
      id: this.notificaciones.length + 1,
      ...dto,
      leida: false,
      creadaEn: new Date(),
    };
    this.notificaciones.push(nueva);
    return nueva;
  }

  marcarNotificacionLeida(id: number, dto: ActualizarNotificacionDto) {
    const notif = this.notificaciones.find((n) => n.id === id);
    if (!notif) throw new NotFoundException('Notificación no encontrada');
    notif.leida = dto.leida;
    return notif;
  }

  listarAuditorias() {
    return this.auditorias;
  }

  registrarAuditoria(dto: RegistrarAuditoriaDto) {
    const registro = {
      id: this.auditorias.length + 1,
      ...dto,
      fecha: new Date(),
    };
    this.auditorias.push(registro);
    return registro;
  }
}
