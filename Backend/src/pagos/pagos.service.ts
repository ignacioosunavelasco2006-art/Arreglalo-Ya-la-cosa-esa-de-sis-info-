import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';
 
import { Pago } from '../entities/pago.entity';
import { Cancelacion } from '../entities/cancelacion.entity';
import { Devolucion } from '../entities/devolucion.entity';
import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';
 
import { RegistrarAnticipoDto } from './dto/registrar-anticipo.dto';
import { RegistrarSaldoDto } from './dto/registrar-saldo.dto';
import { LiquidarDto } from './dto/liquidar.dto';
import { ConfirmarEfectivoDto } from './dto/confirmar-efectivo.dto';
import { CancelarTrabajoDto } from './dto/cancelar-trabajo.dto';
import { SolicitarDevolucionDto } from './dto/solicitar-devolucion.dto';
import { ResolverDevolucionDto } from './dto/resolver-devolucion.dto';
import { esEnteroPositivo, manejarErrorBd, redondear } from '../common/utilidades';
 
const PORCENTAJE_ANTICIPO = 0.25; // RF-22
const PORCENTAJE_COMISION = 0.05; // RN-03
const HORAS_MIN_CANCELACION = 2; // RN-16
const DIAS_DEVOLUCION = 3; // RN-08
const HORA_MS = 60 * 60 * 1000;
 
@Injectable()
export class PagosService {
  constructor(
    private readonly dataSource: DataSource,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Cancelacion)
    private readonly cancelacionRepository: Repository<Cancelacion>,
    @InjectRepository(Devolucion)
    private readonly devolucionRepository: Repository<Devolucion>,
  ) {}
 
  // ---------- Helpers ----------
 
  private formatearPago(p: Pago) {
    return { ...p, monto: Number(p.monto), comision: Number(p.comision) };
  }
 
  private formatearDevolucion(d: Devolucion) {
    return { ...d, monto: Number(d.monto) };
  }
 
  private async obtenerTrabajo(m: EntityManager, id_trabajo: number) {
    const trabajo = await m.findOne(Trabajo, { where: { id_trabajo } });
    if (!trabajo) throw new NotFoundException('Trabajo no encontrado');
    return trabajo;
  }
 
  // Cambia el estado del trabajo y lo registra en el historial (RNF-07)
  private async cambiarEstado(
    m: EntityManager,
    trabajo: Trabajo,
    estado_nuevo: string,
    id_usuario: number | null,
  ) {
    await m.update(Trabajo, { id_trabajo: trabajo.id_trabajo }, { estado: estado_nuevo });
    await m.insert(TrabajoHistorialEstado, {
      id_trabajo: trabajo.id_trabajo,
      estado_anterior: trabajo.estado,
      estado_nuevo,
      id_usuario,
    });
  }
 
  // Precio con incrementos aceptados. Si deciden usar precio_final, cambiar solo aquí.
  private async precioTotal(m: EntityManager, id_trabajo: number) {
    const vista = await m.findOne(VistaTrabajosPrecioTotal, { where: { id_trabajo } });
    if (!vista) throw new NotFoundException('Precio del trabajo no encontrado');
    return Number(vista.precio_total);
  }
 
  private async sumaPagosConfirmados(m: EntityManager, id_trabajo: number, tipos: string[]) {
    const r = await m
      .createQueryBuilder(Pago, 'p')
      .select('COALESCE(SUM(p.monto), 0)', 'total')
      .where('p.id_trabajo = :id_trabajo', { id_trabajo })
      .andWhere('p.tipo IN (:...tipos)', { tipos })
      .andWhere("p.estado = 'confirmado'")
      .getRawOne();
    return Number(r.total);
  }
 
  private async crearDevolucion(
    m: EntityManager,
    trabajo: Trabajo,
    monto: number,
    motivo: string,
    id_reclamo?: number,
  ) {
    const pagado = await this.sumaPagosConfirmados(m, trabajo.id_trabajo, ['anticipo', 'saldo']);
    const r = await m
      .createQueryBuilder(Devolucion, 'd')
      .select('COALESCE(SUM(d.monto), 0)', 'total')
      .where('d.id_trabajo = :id', { id: trabajo.id_trabajo })
      .andWhere("d.estado IN ('solicitada','aprobada','procesada')")
      .getRawOne();
    const disponible = pagado - Number(r.total);
 
    if (monto > disponible) {
      throw new BadRequestException(
        `El monto supera lo disponible para devolver (${disponible})`,
      );
    }
 
    const devolucion = await m.save(
      m.create(Devolucion, {
        id_trabajo: trabajo.id_trabajo,
        id_cliente: trabajo.id_cliente,
        id_reclamo: id_reclamo ?? null,
        monto,
        motivo,
      }),
    );
    return this.formatearDevolucion(devolucion);
  }
 
  // ---------- Anticipo (RF-22) ----------
 
  async registrarAnticipo(dto: RegistrarAnticipoDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_trabajo e id_cliente son obligatorios');
    }
    if (!['plataforma', 'qr'].includes(dto.medio)) {
      throw new BadRequestException('El anticipo se paga por plataforma o qr');
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);
 
        if (trabajo.id_cliente !== dto.id_cliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        if (trabajo.estado !== 'pendiente_anticipo') {
          throw new BadRequestException('El trabajo no está pendiente de anticipo');
        }
 
        const yaPagado = await m.findOne(Pago, {
          where: { id_trabajo: trabajo.id_trabajo, tipo: 'anticipo', estado: 'confirmado' },
        });
        if (yaPagado) throw new ConflictException('El anticipo ya fue pagado');
 
        const pago = await m.save(
          m.create(Pago, {
            id_trabajo: trabajo.id_trabajo,
            tipo: 'anticipo',
            medio: dto.medio,
            monto: redondear(Number(trabajo.precio_final) * PORCENTAJE_ANTICIPO),
            comision: 0,
            estado: 'confirmado',
            referencia_pasarela: dto.referencia_pasarela ?? null,
          }),
        );
 
        await this.cambiarEstado(m, trabajo, 'programado', dto.id_cliente);
        return this.formatearPago(pago);
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // ---------- Saldo (75% restante) ----------
 
  async registrarSaldo(dto: RegistrarSaldoDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_trabajo e id_cliente son obligatorios');
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);
 
        if (trabajo.id_cliente !== dto.id_cliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        if (trabajo.estado !== 'terminado') {
          throw new BadRequestException('Solo se paga el saldo de trabajos terminados');
        }
 
        const existente = await m.findOne(Pago, {
          where: {
            id_trabajo: trabajo.id_trabajo,
            tipo: 'saldo',
            estado: In(['pendiente', 'confirmado', 'en_disputa']),
          },
        });
        if (existente) throw new ConflictException('El saldo ya fue registrado');
 
        const total = await this.precioTotal(m, trabajo.id_trabajo);
        const anticipo = await this.sumaPagosConfirmados(m, trabajo.id_trabajo, ['anticipo']);
        const saldo = redondear(total - anticipo);
        if (saldo <= 0) throw new BadRequestException('No hay saldo pendiente');
 
        const esEfectivo = trabajo.metodo_pago === 'efectivo';
 
        const pago = await m.save(
          m.create(Pago, {
            id_trabajo: trabajo.id_trabajo,
            tipo: 'saldo',
            medio: trabajo.metodo_pago,
            monto: saldo,
            comision: 0,
            // En efectivo queda pendiente hasta que el trabajador confirme (RF-24)
            estado: esEfectivo ? 'pendiente' : 'confirmado',
            referencia_pasarela: dto.referencia_pasarela ?? null,
          }),
        );
        return this.formatearPago(pago);
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // El trabajador confirma si recibió el efectivo (RF-24)
  async confirmarEfectivo(id_pago: number, dto: ConfirmarEfectivoDto) {
    if (!esEnteroPositivo(dto.id_trabajador) || typeof dto.recibido !== 'boolean') {
      throw new BadRequestException('id_trabajador y recibido son obligatorios');
    }
 
    const pago = await this.pagoRepository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
 
    if (pago.medio !== 'efectivo' || pago.estado !== 'pendiente') {
      throw new BadRequestException('El pago no está pendiente de confirmación en efectivo');
    }
 
    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, pago.id_trabajo);
    if (trabajo.id_trabajador !== dto.id_trabajador) {
      throw new ForbiddenException('Solo el trabajador del trabajo puede confirmar');
    }
 
    pago.estado = dto.recibido ? 'confirmado' : 'en_disputa';
    const guardado = await this.pagoRepository.save(pago);
    return this.formatearPago(guardado);
  }
 
  // ---------- Liquidación al trabajador (RF-25, RN-03, RN-19) ----------
 
  async liquidar(dto: LiquidarDto) {
    if (!esEnteroPositivo(dto.id_trabajo)) {
      throw new BadRequestException('id_trabajo es obligatorio');
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);
 
        if (trabajo.estado !== 'terminado') {
          throw new BadRequestException('Solo se liquidan trabajos terminados');
        }
 
        const saldo = await m.findOne(Pago, {
          where: { id_trabajo: trabajo.id_trabajo, tipo: 'saldo', estado: 'confirmado' },
        });
        if (!saldo) throw new BadRequestException('El saldo aún no está confirmado');
 
        const yaLiquidado = await m.findOne(Pago, {
          where: { id_trabajo: trabajo.id_trabajo, tipo: 'liquidacion' },
        });
        if (yaLiquidado) throw new ConflictException('El trabajo ya fue liquidado');
 
        if (trabajo.metodo_pago === 'efectivo') {
          throw new BadRequestException(
            'Los pagos en efectivo no se liquidan por la plataforma',
          );
        }
 
        const total = await this.precioTotal(m, trabajo.id_trabajo);
        const comision = redondear(total * PORCENTAJE_COMISION);
        const monto = redondear(total - comision);
 
        const pago = await m.save(
          m.create(Pago, {
            id_trabajo: trabajo.id_trabajo,
            tipo: 'liquidacion',
            medio: trabajo.metodo_pago,
            monto,
            comision,
            estado: 'confirmado',
          }),
        );
        return this.formatearPago(pago);
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // ---------- Cancelación (RF-26, RN-16) ----------
 
  async cancelar(dto: CancelarTrabajoDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_usuario)) {
      throw new BadRequestException('id_trabajo e id_usuario son obligatorios');
    }
 
    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, dto.id_trabajo);
 
    let quien: 'cliente' | 'trabajador';
    if (dto.id_usuario === trabajo.id_cliente) quien = 'cliente';
    else if (dto.id_usuario === trabajo.id_trabajador) quien = 'trabajador';
    else throw new ForbiddenException('El usuario no participa en este trabajo');
 
    if (!['pendiente_anticipo', 'programado', 'en_camino'].includes(trabajo.estado)) {
      throw new BadRequestException('El trabajo ya no se puede cancelar');
    }
 
    // El cliente solo puede cancelar hasta 2 horas antes
    if (quien === 'cliente' && trabajo.fecha_inicio_prog) {
      const limite =
        new Date(trabajo.fecha_inicio_prog).getTime() - HORAS_MIN_CANCELACION * HORA_MS;
      if (Date.now() > limite) {
        await this.cancelacionRepository.save(
          this.cancelacionRepository.create({
            id_trabajo: trabajo.id_trabajo,
            id_usuario: dto.id_usuario,
            cancelado_por: quien,
            motivo: dto.motivo ?? null,
            estado: 'rechazada',
          }),
        );
        throw new BadRequestException(
          `Solo puedes cancelar hasta ${HORAS_MIN_CANCELACION} horas antes del servicio`,
        );
      }
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const cancelacion = await m.save(
          m.create(Cancelacion, {
            id_trabajo: trabajo.id_trabajo,
            id_usuario: dto.id_usuario,
            cancelado_por: quien,
            motivo: dto.motivo ?? null,
            estado: 'aprobada',
          }),
        );
 
        await this.cambiarEstado(m, trabajo, 'cancelado', dto.id_usuario);
 
        // Si cancela el trabajador, queda un incidente (lo usa el módulo 10)
        if (quien === 'trabajador') {
          await m.save(
            m.create(IncidenteTrabajador, {
              id_trabajador: trabajo.id_trabajador,
              id_trabajo: trabajo.id_trabajo,
              tipo: 'cancelacion',
            }),
          );
        }
 
        // Si ya había anticipo pagado, se solicita su devolución
        let devolucion: object | null = null;
        const anticipo = await this.sumaPagosConfirmados(m, trabajo.id_trabajo, ['anticipo']);
        if (anticipo > 0) {
          devolucion = await this.crearDevolucion(
            m,
            trabajo,
            anticipo,
            'Devolución de anticipo por cancelación del trabajo',
          );
        }
 
        return { cancelacion, devolucion };
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // ---------- Devoluciones (RN-08) ----------
 
  async solicitarDevolucion(dto: SolicitarDevolucionDto) {
    if (!esEnteroPositivo(dto.id_trabajo) || !esEnteroPositivo(dto.id_cliente)) {
      throw new BadRequestException('id_trabajo e id_cliente son obligatorios');
    }
    if (typeof dto.monto !== 'number' || dto.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a 0');
    }
    if (!dto.motivo || dto.motivo.trim() === '' || dto.motivo.length > 500) {
      throw new BadRequestException('El motivo es obligatorio (máx. 500 caracteres)');
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);
        if (trabajo.id_cliente !== dto.id_cliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        return this.crearDevolucion(m, trabajo, dto.monto, dto.motivo, dto.id_reclamo);
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // El supervisor aprueba o rechaza. Al aprobar se crea el pago de devolución con plazo de 3 días.
  async resolverDevolucion(id_devolucion: number, dto: ResolverDevolucionDto) {
    if (!esEnteroPositivo(dto.id_supervisor) || typeof dto.aprobada !== 'boolean') {
      throw new BadRequestException('id_supervisor y aprobada son obligatorios');
    }
    if (!dto.aprobada && (!dto.motivo_rechazo || dto.motivo_rechazo.trim() === '')) {
      throw new BadRequestException('Debes indicar el motivo del rechazo');
    }
 
    try {
      return await this.dataSource.transaction(async (m) => {
        const devolucion = await m.findOne(Devolucion, { where: { id_devolucion } });
        if (!devolucion) throw new NotFoundException('Devolución no encontrada');
        if (devolucion.estado !== 'solicitada') {
          throw new BadRequestException('La devolución ya fue resuelta');
        }
 
        devolucion.id_aprobado_por = dto.id_supervisor;
 
        if (!dto.aprobada) {
          devolucion.estado = 'rechazada';
          devolucion.motivo_rechazo = dto.motivo_rechazo!;
        } else {
          const trabajo = await this.obtenerTrabajo(m, devolucion.id_trabajo);
          const pago = await m.save(
            m.create(Pago, {
              id_trabajo: devolucion.id_trabajo,
              tipo: 'devolucion',
              medio: trabajo.metodo_pago,
              monto: Number(devolucion.monto),
              comision: 0,
              estado: 'pendiente',
              fecha_limite: new Date(Date.now() + DIAS_DEVOLUCION * 24 * HORA_MS),
            }),
          );
          devolucion.estado = 'aprobada';
          devolucion.fecha_aprobacion = new Date();
          devolucion.id_pago = pago.id_pago;
        }
 
        return this.formatearDevolucion(await m.save(devolucion));
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // Se marca cuando el dinero ya fue devuelto
  async procesarDevolucion(id_devolucion: number) {
    try {
      return await this.dataSource.transaction(async (m) => {
        const devolucion = await m.findOne(Devolucion, { where: { id_devolucion } });
        if (!devolucion) throw new NotFoundException('Devolución no encontrada');
        if (devolucion.estado !== 'aprobada' || !devolucion.id_pago) {
          throw new BadRequestException('La devolución no está aprobada');
        }
 
        await m.update(
          Pago,
          { id_pago: devolucion.id_pago },
          { estado: 'confirmado', fecha_pago: new Date() },
        );
 
        devolucion.estado = 'procesada';
        devolucion.fecha_procesamiento = new Date();
        return this.formatearDevolucion(await m.save(devolucion));
      });
    } catch (e) {
      manejarErrorBd(e);
    }
  }
 
  // ---------- Consultas ----------
 
  async obtenerPagosDeTrabajo(id_trabajo: number) {
    const pagos = await this.pagoRepository.find({
      where: { id_trabajo },
      order: { fecha_pago: 'ASC' },
    });
    return pagos.map((p) => this.formatearPago(p));
  }
 
  async obtenerPorId(id_pago: number) {
    const pago = await this.pagoRepository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    return this.formatearPago(pago);
  }
 
  async listarDevoluciones(estado?: string) {
    const devoluciones = await this.devolucionRepository.find({
      where: estado ? { estado } : {},
      order: { fecha_solicitud: 'DESC' },
    });
    return devoluciones.map((d) => this.formatearDevolucion(d));
  }
}
 