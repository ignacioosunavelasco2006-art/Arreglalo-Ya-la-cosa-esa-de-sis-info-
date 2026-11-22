import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, In, Repository } from 'typeorm';

import { Pago } from '../entities/pagos.entity';
import { Cancelacion } from '../entities/cacelacion.entity';
import { Devolucion } from '../entities/devolucion.entities';
import { IncidenteTrabajador } from '../entities/incidente-trabajador.entity';
import { Trabajo } from '../entities/trabajo.entity';
import { TrabajoHistorialEstado } from '../entities/trabajo-historial-estado.entity';
import { VistaTrabajosPrecioTotal } from '../entities/vista-trabajos-precio-total.entity';

import { SistemaService } from '../sistema/sistema.service';
import { AdministracionService } from '../administracion/administracion.service';
import { manejarErrorBd, redondear } from '../common/Utilidades';

import { RegistrarAnticipoDto } from './dto/registrar-anticipo.dto';
import { RegistrarSaldoDto } from './dto/registrar-saldo.dto';
import { ConfirmarEfectivoDto } from './dto/confirmar-efectivo.dto';
import { CancelarTrabajoDto } from './dto/cancelar-trabajo.dto';
import { SolicitarDevolucionDto } from './dto/solicitar-devolucion.dto';
import { ResolverDevolucionDto } from './dto/resolver-devolucion.dto';

const HORA_MS = 60 * 60 * 1000;
const DIA_MS = 24 * HORA_MS;

export interface UsuarioContexto {
  id_usuario: number;
  roles: string[];
}

@Injectable()
export class PagosService {
  private readonly logger = new Logger(PagosService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    private readonly administracion: AdministracionService,
    @InjectRepository(Pago)
    private readonly pagoRepository: Repository<Pago>,
    @InjectRepository(Cancelacion)
    private readonly cancelacionRepository: Repository<Cancelacion>,
    @InjectRepository(Devolucion)
    private readonly devolucionRepository: Repository<Devolucion>,
  ) {}

  // ===============================================================
  // PARÁMETROS (RF-34): ya no están fijos en el código
  // ⚠ Claves esperadas en parametros_sistema: anticipo, comision,
  //   horas_cancelacion, dias_devolucion. Si no existen se usan los del informe.
  // ===============================================================

  private porcentajeAnticipo() {
    return this.sistema.obtenerPorcentaje('anticipo', 0.25); // RN-02
  }
  private porcentajeComision() {
    return this.sistema.obtenerPorcentaje('comision', 0.05); // RN-03
  }
  private horasMinCancelacion() {
    return this.sistema.obtenerNumero('horas_cancelacion', 2); // RN-16
  }
  private diasDevolucion() {
    return this.sistema.obtenerNumero('dias_devolucion', 3); // RN-08
  }

  // ===============================================================
  // HELPERS
  // ===============================================================

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

  private esSupervisor(u: UsuarioContexto) {
    return u.roles.includes('supervisor') || u.roles.includes('super_supervisor');
  }

  // Solo las partes del trabajo y la supervisión ven sus pagos
  private verificarAcceso(trabajo: Trabajo, u: UsuarioContexto) {
    const esParte = u.id_usuario === trabajo.id_cliente || u.id_usuario === trabajo.id_trabajador;
    if (!esParte && !this.esSupervisor(u)) {
      throw new ForbiddenException('No participas en este trabajo');
    }
  }

  // Cambia el estado del trabajo y lo registra en el historial (RNF-07)
  private async cambiarEstado(m: EntityManager, trabajo: Trabajo, estado_nuevo: string, id_usuario: number | null) {
    await m.update(Trabajo, { id_trabajo: trabajo.id_trabajo }, { estado: estado_nuevo });
    await m.insert(TrabajoHistorialEstado, {
      id_trabajo: trabajo.id_trabajo,
      estado_anterior: trabajo.estado,
      estado_nuevo,
      id_usuario,
    });
  }

  // Precio con incrementos aceptados
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

  // Crea una devolución. Si "aprobacion" viene definida, nace ya aprobada: se genera el
  // pago de devolución y el plazo de 3 días (RN-08) corre desde este momento.
  private async crearDevolucion(
    m: EntityManager,
    trabajo: Trabajo,
    monto: number,
    motivo: string,
    opciones: { id_reclamo?: number; aprobadaPor?: number | null; automatica?: boolean } = {},
  ) {
    const pagado = await this.sumaPagosConfirmados(m, trabajo.id_trabajo, ['anticipo', 'saldo']);
    const r = await m
      .createQueryBuilder(Devolucion, 'd')
      .select('COALESCE(SUM(d.monto), 0)', 'total')
      .where('d.id_trabajo = :id', { id: trabajo.id_trabajo })
      .andWhere("d.estado IN ('solicitada','aprobada','procesada')")
      .getRawOne();
    const disponible = redondear(pagado - Number(r.total));

    if (monto > disponible) {
      throw new BadRequestException(`El monto supera lo disponible para devolver (${disponible})`);
    }

    const devolucion = await m.save(
      m.create(Devolucion, {
        id_trabajo: trabajo.id_trabajo,
        id_cliente: trabajo.id_cliente,
        id_reclamo: opciones.id_reclamo ?? null,
        monto,
        motivo,
      }),
    );

    if (opciones.automatica || opciones.aprobadaPor) {
      const dias = await this.diasDevolucion();
      const pago = await m.save(
        m.create(Pago, {
          id_trabajo: trabajo.id_trabajo,
          tipo: 'devolucion',
          medio: trabajo.metodo_pago,
          monto,
          comision: 0,
          estado: 'pendiente',
          fecha_limite: new Date(Date.now() + dias * DIA_MS),
        }),
      );
      devolucion.estado = 'aprobada';
      devolucion.fecha_aprobacion = new Date();
      devolucion.id_aprobado_por = opciones.aprobadaPor ?? null;
      devolucion.id_pago = pago.id_pago;
      await m.save(devolucion);
    }
    return this.formatearDevolucion(devolucion);
  }

  // ===============================================================
  // ANTICIPO (RF-22, RN-02)
  // ===============================================================

  async registrarAnticipo(idCliente: number, dto: RegistrarAnticipoDto) {
    const porcentaje = await this.porcentajeAnticipo();

    try {
      const { pago, trabajo } = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);

        if (trabajo.id_cliente !== idCliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        if (trabajo.estado !== 'pendiente_anticipo') {
          throw new BadRequestException('El trabajo no está pendiente de anticipo');
        }

        const yaPagado = await m.findOne(Pago, {
          where: { id_trabajo: trabajo.id_trabajo, tipo: 'anticipo', estado: 'confirmado' },
        });
        if (yaPagado) throw new ConflictException('El anticipo ya fue pagado');

        // El monto lo calcula el servidor, nunca el cliente
        const pago = await m.save(
          m.create(Pago, {
            id_trabajo: trabajo.id_trabajo,
            tipo: 'anticipo',
            medio: dto.medio,
            monto: redondear(Number(trabajo.precio_final) * porcentaje),
            comision: 0,
            estado: 'confirmado',
            referencia_pasarela: dto.referencia_pasarela ?? null,
          }),
        );

        await this.cambiarEstado(m, trabajo, 'programado', idCliente);
        return { pago, trabajo };
      });

      await this.sistema.notificar(trabajo.id_trabajador, 'trabajo_programado', `El cliente pagó el anticipo: tu trabajo #${trabajo.id_trabajo} quedó programado.`);
      await this.sistema.notificar(idCliente, 'pago_anticipo', `Anticipo de Bs ${Number(pago.monto).toFixed(2)} registrado para el trabajo #${trabajo.id_trabajo}.`);
      await this.sistema.auditar(idCliente, 'anticipo_pagado', 'pagos', pago.id_pago, `trabajo ${trabajo.id_trabajo}`);
      return this.formatearPago(pago);
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // ===============================================================
  // SALDO (75 % restante)
  // ===============================================================

  // Crea el pago de saldo dentro de una transacción (lo usan el endpoint y el cierre automático)
  private async crearSaldo(m: EntityManager, trabajo: Trabajo, referencia: string | null) {
    if (trabajo.estado !== 'terminado') {
      throw new BadRequestException('Solo se paga el saldo de trabajos terminados');
    }

    const existente = await m.findOne(Pago, {
      where: { id_trabajo: trabajo.id_trabajo, tipo: 'saldo', estado: In(['pendiente', 'confirmado', 'en_disputa']) },
    });
    if (existente) throw new ConflictException('El saldo ya fue registrado');

    const total = await this.precioTotal(m, trabajo.id_trabajo);
    const anticipo = await this.sumaPagosConfirmados(m, trabajo.id_trabajo, ['anticipo']);
    const saldo = redondear(total - anticipo);
    if (saldo <= 0) throw new BadRequestException('No hay saldo pendiente');

    const esEfectivo = trabajo.metodo_pago === 'efectivo';
    return m.save(
      m.create(Pago, {
        id_trabajo: trabajo.id_trabajo,
        tipo: 'saldo',
        medio: trabajo.metodo_pago,
        monto: saldo,
        comision: 0,
        // En efectivo queda pendiente hasta que el trabajador confirme (RF-24)
        estado: esEfectivo ? 'pendiente' : 'confirmado',
        referencia_pasarela: referencia,
      }),
    );
  }

  // Pago manual del saldo (reintento si el cierre automático falló)
  async registrarSaldo(idCliente: number, dto: RegistrarSaldoDto) {
    try {
      const pago = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);
        if (trabajo.id_cliente !== idCliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        return this.crearSaldo(m, trabajo, dto.referencia_pasarela ?? null);
      });
      await this.sistema.auditar(idCliente, 'saldo_registrado', 'pagos', pago.id_pago);
      return this.formatearPago(pago);
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // RF-24 / CU-24: el trabajador confirma si recibió el efectivo
  async confirmarEfectivo(id_pago: number, idTrabajador: number, dto: ConfirmarEfectivoDto) {
    const pago = await this.pagoRepository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado');

    if (pago.medio !== 'efectivo' || pago.estado !== 'pendiente') {
      throw new BadRequestException('El pago no está pendiente de confirmación en efectivo');
    }

    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, pago.id_trabajo);
    if (trabajo.id_trabajador !== idTrabajador) {
      throw new ForbiddenException('Solo el trabajador del trabajo puede confirmar');
    }

    pago.estado = dto.recibido ? 'confirmado' : 'en_disputa';
    const guardado = await this.pagoRepository.save(pago);

    if (dto.recibido) {
      await this.sistema.notificar(trabajo.id_cliente, 'efectivo_confirmado', `El trabajador confirmó que recibió el efectivo del trabajo #${trabajo.id_trabajo}.`);
    } else {
      // CU-24 flujo alterno: "abre un caso para el supervisor"
      await this.sistema.notificar(trabajo.id_cliente, 'efectivo_en_disputa', `El trabajador indicó que NO recibió el efectivo del trabajo #${trabajo.id_trabajo}. Un supervisor revisará el caso.`);
      await this.sistema.notificarRol('supervisor', 'efectivo_en_disputa', `Pago en efectivo #${id_pago} (trabajo #${trabajo.id_trabajo}) marcado como NO recibido: requiere revisión.`);
    }
    await this.sistema.auditar(idTrabajador, dto.recibido ? 'efectivo_confirmado' : 'efectivo_disputado', 'pagos', id_pago);
    return this.formatearPago(guardado);
  }

  // ===============================================================
  // LIQUIDACIÓN AL TRABAJADOR (RF-25, RN-03, RN-04, RN-19)
  // ===============================================================

  private async crearLiquidacion(m: EntityManager, trabajo: Trabajo) {
    if (trabajo.estado !== 'terminado') {
      throw new BadRequestException('Solo se liquidan trabajos terminados');
    }
    if (trabajo.metodo_pago === 'efectivo') {
      // RN-19: no se cobra comisión en efectivo y no se liquida por la plataforma
      throw new BadRequestException('Los pagos en efectivo no se liquidan por la plataforma');
    }

    const saldo = await m.findOne(Pago, {
      where: { id_trabajo: trabajo.id_trabajo, tipo: 'saldo', estado: 'confirmado' },
    });
    if (!saldo) throw new BadRequestException('El saldo aún no está confirmado');

    const yaLiquidado = await m.findOne(Pago, { where: { id_trabajo: trabajo.id_trabajo, tipo: 'liquidacion' } });
    if (yaLiquidado) throw new ConflictException('El trabajo ya fue liquidado');

    const porcentaje = await this.porcentajeComision();
    const total = await this.precioTotal(m, trabajo.id_trabajo);
    const comision = redondear(total * porcentaje);
    const monto = redondear(total - comision);

    return m.save(
      m.create(Pago, {
        id_trabajo: trabajo.id_trabajo,
        tipo: 'liquidacion',
        medio: trabajo.metodo_pago,
        monto,
        comision,
        estado: 'confirmado',
      }),
    );
  }

  // Reintento manual por un supervisor (CU-25 flujo alterno)
  async liquidar(idTrabajo: number, idSupervisor: number) {
    try {
      const pago = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, idTrabajo);
        return this.crearLiquidacion(m, trabajo);
      });
      await this.sistema.auditar(idSupervisor, 'liquidacion_manual', 'pagos', pago.id_pago);
      return this.formatearPago(pago);
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // RF-20 → RF-25: lo llama TrabajosService cuando el cliente acepta la finalización.
  // Cobra el saldo y libera el pago al trabajador (menos la comisión). Si algo falla,
  // el trabajo ya quedó terminado y se alerta a los supervisores para reintentar.
  async procesarCierre(idTrabajo: number) {
    try {
      const resultado = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, idTrabajo);

        let saldo = await m.findOne(Pago, {
          where: { id_trabajo: idTrabajo, tipo: 'saldo', estado: In(['pendiente', 'confirmado', 'en_disputa']) },
        });
        if (!saldo) saldo = await this.crearSaldo(m, trabajo, null);

        let liquidacion: Pago | null = null;
        if (trabajo.metodo_pago !== 'efectivo' && saldo.estado === 'confirmado') {
          liquidacion =
            (await m.findOne(Pago, { where: { id_trabajo: idTrabajo, tipo: 'liquidacion' } })) ??
            (await this.crearLiquidacion(m, trabajo));
        }
        return { trabajo, saldo, liquidacion };
      });

      const { trabajo, saldo, liquidacion } = resultado;
      if (liquidacion) {
        await this.sistema.notificar(
          trabajo.id_trabajador,
          'pago_liquidado',
          `Recibiste Bs ${Number(liquidacion.monto).toFixed(2)} por el trabajo #${idTrabajo} (comisión de la plataforma: Bs ${Number(liquidacion.comision).toFixed(2)}).`,
        );
        await this.sistema.notificar(
          trabajo.id_cliente,
          'pago_comprobante',
          `Pago final del trabajo #${idTrabajo} registrado. Ya puedes calificar el servicio; tienes 7 días para presentar un reclamo si hay problemas.`,
        );
        await this.sistema.auditar(null, 'liquidacion_automatica', 'pagos', liquidacion.id_pago, `trabajo ${idTrabajo}`);
      } else {
        // Efectivo: el trabajador debe confirmar la recepción (RF-24)
        await this.sistema.notificar(trabajo.id_trabajador, 'confirmar_efectivo', `El cliente debe entregarte Bs ${Number(saldo.monto).toFixed(2)} en efectivo por el trabajo #${idTrabajo}. Confirma en la app cuando lo recibas.`);
        await this.sistema.notificar(trabajo.id_cliente, 'pago_efectivo', `Entrega Bs ${Number(saldo.monto).toFixed(2)} en efectivo al trabajador del trabajo #${idTrabajo}.`);
      }
      return { saldo: this.formatearPago(saldo), liquidacion: liquidacion ? this.formatearPago(liquidacion) : null };
    } catch (error) {
      // CU-25: "falla de la transferencia, se reintenta y se alerta al supervisor"
      this.logger.error(`Falló el cierre de pago del trabajo ${idTrabajo}: ${error}`);
      await this.sistema.notificarRol('supervisor', 'pago_fallido', `No se pudo procesar el pago del trabajo #${idTrabajo}. Reintenta desde pagos/liquidacion.`);
      return null;
    }
  }

  // ===============================================================
  // CANCELACIÓN (RF-26, RN-16, RN-08)
  // ===============================================================

  async cancelar(idUsuario: number, dto: CancelarTrabajoDto) {
    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, dto.id_trabajo);

    let quien: 'cliente' | 'trabajador';
    if (idUsuario === trabajo.id_cliente) quien = 'cliente';
    else if (idUsuario === trabajo.id_trabajador) quien = 'trabajador';
    else throw new ForbiddenException('No participas en este trabajo');

    if (!['pendiente_anticipo', 'programado', 'en_camino'].includes(trabajo.estado)) {
      throw new BadRequestException('El trabajo ya no se puede cancelar');
    }

    // RN-16: el cliente solo puede cancelar hasta 2 horas antes (parámetro configurable)
    const horas = await this.horasMinCancelacion();
    if (quien === 'cliente' && trabajo.fecha_inicio_prog) {
      const limite = new Date(trabajo.fecha_inicio_prog).getTime() - horas * HORA_MS;
      if (Date.now() > limite) {
        await this.cancelacionRepository.save(
          this.cancelacionRepository.create({
            id_trabajo: trabajo.id_trabajo,
            id_usuario: idUsuario,
            cancelado_por: quien,
            motivo: dto.motivo ?? null,
            estado: 'rechazada',
          }),
        );
        throw new BadRequestException(`Solo puedes cancelar hasta ${horas} horas antes del servicio`);
      }
    }

    try {
      const resultado = await this.dataSource.transaction(async (m) => {
        const cancelacion = await m.save(
          m.create(Cancelacion, {
            id_trabajo: trabajo.id_trabajo,
            id_usuario: idUsuario,
            cancelado_por: quien,
            motivo: dto.motivo ?? null,
            estado: 'aprobada',
          }),
        );

        // Libera el calendario del trabajador (el estado 'cancelado' sale de la agenda)
        await this.cambiarEstado(m, trabajo, 'cancelado', idUsuario);

        // Si cancela el trabajador queda un incidente (RF-08)
        if (quien === 'trabajador') {
          await m.save(
            m.create(IncidenteTrabajador, {
              id_trabajador: trabajo.id_trabajador,
              id_trabajo: trabajo.id_trabajo,
              tipo: 'cancelacion',
            }),
          );
        }

        // P5: "Calcular devolución íntegra → Procesar devolución (máx. 3 días)".
        // Nace aprobada automáticamente: el plazo de RN-08 corre desde la cancelación.
        let devolucion: object | null = null;
        const anticipo = await this.sumaPagosConfirmados(m, trabajo.id_trabajo, ['anticipo']);
        if (anticipo > 0) {
          devolucion = await this.crearDevolucion(
            m,
            trabajo,
            anticipo,
            'Devolución de anticipo por cancelación del trabajo',
            { automatica: true },
          );
        }
        return { cancelacion, devolucion };
      });

      // Notificaciones a ambas partes (P5)
      const otro = quien === 'cliente' ? trabajo.id_trabajador : trabajo.id_cliente;
      await this.sistema.notificar(otro, 'trabajo_cancelado', `El trabajo #${trabajo.id_trabajo} fue cancelado por ${quien === 'cliente' ? 'el cliente' : 'el trabajador'}.`);
      if (resultado.devolucion) {
        await this.sistema.notificar(trabajo.id_cliente, 'devolucion_aprobada', `Se devolverá tu anticipo del trabajo #${trabajo.id_trabajo} en un máximo de ${await this.diasDevolucion()} días.`);
      }
      await this.sistema.auditar(idUsuario, 'trabajo_cancelado', 'trabajos', trabajo.id_trabajo, quien);

      // RF-08: si canceló el trabajador, se evalúa si corresponde suspenderlo
      if (quien === 'trabajador') {
        await this.administracion.evaluarIncidentes(trabajo.id_trabajador);
      }
      return resultado;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // ===============================================================
  // DEVOLUCIONES
  // ===============================================================

  // El cliente pide una devolución; queda "solicitada" hasta que un supervisor resuelva
  async solicitarDevolucion(idCliente: number, dto: SolicitarDevolucionDto) {
    try {
      const devolucion = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, dto.id_trabajo);
        if (trabajo.id_cliente !== idCliente) {
          throw new ForbiddenException('El trabajo no pertenece a este cliente');
        }
        return this.crearDevolucion(m, trabajo, dto.monto, dto.motivo);
      });
      await this.sistema.notificarRol('supervisor', 'devolucion_solicitada', `Nueva solicitud de devolución #${devolucion.id_devolucion} (trabajo #${dto.id_trabajo}).`);
      await this.sistema.auditar(idCliente, 'devolucion_solicitada', 'devoluciones', devolucion.id_devolucion);
      return devolucion;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // Lo usa ReclamosModule (RF-33): el supervisor decidió "devolver dinero".
  // Nace aprobada con el plazo de 3 días corriendo.
  async devolverPorReclamo(idTrabajo: number, monto: number, motivo: string, idReclamo: number, idSupervisor: number) {
    try {
      const devolucion = await this.dataSource.transaction(async (m) => {
        const trabajo = await this.obtenerTrabajo(m, idTrabajo);
        return this.crearDevolucion(m, trabajo, monto, motivo, { id_reclamo: idReclamo, aprobadaPor: idSupervisor });
      });
      await this.sistema.notificar(devolucion.id_cliente, 'devolucion_aprobada', `Se aprobó la devolución de Bs ${monto.toFixed(2)} por tu reclamo.`);
      await this.sistema.auditar(idSupervisor, 'devolucion_por_reclamo', 'devoluciones', devolucion.id_devolucion);
      return devolucion;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // El supervisor aprueba o rechaza una devolución solicitada
  async resolverDevolucion(id_devolucion: number, dto: ResolverDevolucionDto, idSupervisor: number) {
    if (!dto.aprobada && !dto.motivo_rechazo?.trim()) {
      throw new BadRequestException('Debes indicar el motivo del rechazo');
    }
    const dias = await this.diasDevolucion();

    try {
      const resultado = await this.dataSource.transaction(async (m) => {
        const devolucion = await m.findOne(Devolucion, { where: { id_devolucion } });
        if (!devolucion) throw new NotFoundException('Devolución no encontrada');
        if (devolucion.estado !== 'solicitada') {
          throw new BadRequestException('La devolución ya fue resuelta');
        }

        devolucion.id_aprobado_por = idSupervisor;

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
              fecha_limite: new Date(Date.now() + dias * DIA_MS),
            }),
          );
          devolucion.estado = 'aprobada';
          devolucion.fecha_aprobacion = new Date();
          devolucion.id_pago = pago.id_pago;
        }
        return this.formatearDevolucion(await m.save(devolucion));
      });

      await this.sistema.notificar(
        resultado.id_cliente,
        dto.aprobada ? 'devolucion_aprobada' : 'devolucion_rechazada',
        dto.aprobada
          ? `Tu devolución de Bs ${resultado.monto.toFixed(2)} fue aprobada y se procesará en un máximo de ${dias} días.`
          : `Tu solicitud de devolución fue rechazada: ${dto.motivo_rechazo}`,
      );
      await this.sistema.auditar(idSupervisor, dto.aprobada ? 'devolucion_aprobada' : 'devolucion_rechazada', 'devoluciones', id_devolucion);
      return resultado;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // Se marca cuando el dinero ya fue devuelto
  async procesarDevolucion(id_devolucion: number, idSupervisor: number) {
    try {
      const resultado = await this.dataSource.transaction(async (m) => {
        const devolucion = await m.findOne(Devolucion, { where: { id_devolucion } });
        if (!devolucion) throw new NotFoundException('Devolución no encontrada');
        if (devolucion.estado !== 'aprobada' || !devolucion.id_pago) {
          throw new BadRequestException('La devolución no está aprobada');
        }

        await m.update(Pago, { id_pago: devolucion.id_pago }, { estado: 'confirmado', fecha_pago: new Date() });

        devolucion.estado = 'procesada';
        devolucion.fecha_procesamiento = new Date();
        return this.formatearDevolucion(await m.save(devolucion));
      });

      await this.sistema.notificar(resultado.id_cliente, 'devolucion_procesada', `Tu devolución de Bs ${resultado.monto.toFixed(2)} fue procesada.`);
      await this.sistema.auditar(idSupervisor, 'devolucion_procesada', 'devoluciones', id_devolucion);
      return resultado;
    } catch (e) {
      manejarErrorBd(e);
    }
  }

  // ===============================================================
  // CONSULTAS (siempre con control de acceso)
  // ===============================================================

  async obtenerPagosDeTrabajo(id_trabajo: number, usuario: UsuarioContexto) {
    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, id_trabajo);
    this.verificarAcceso(trabajo, usuario);

    const pagos = await this.pagoRepository.find({ where: { id_trabajo }, order: { fecha_pago: 'ASC' } });
    return pagos.map((p) => this.formatearPago(p));
  }

  // Pagos de todos mis trabajos (cliente o trabajador)
  async misPagos(idUsuario: number) {
    const pagos: Pago[] = await this.dataSource.query(
      `SELECT p.* FROM pagos p JOIN trabajos t ON t.id_trabajo = p.id_trabajo
        WHERE t.id_cliente = $1 OR t.id_trabajador = $1
        ORDER BY p.fecha_pago DESC`,
      [idUsuario],
    );
    return pagos.map((p) => this.formatearPago(p));
  }

  async obtenerPorId(id_pago: number, usuario: UsuarioContexto) {
    const pago = await this.pagoRepository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, pago.id_trabajo);
    this.verificarAcceso(trabajo, usuario);
    return this.formatearPago(pago);
  }

  // CU-25 paso 4: "emite un comprobante a ambas partes"
  async comprobante(id_pago: number, usuario: UsuarioContexto) {
    const pago = await this.pagoRepository.findOne({ where: { id_pago } });
    if (!pago) throw new NotFoundException('Pago no encontrado');
    if (pago.estado !== 'confirmado') {
      throw new BadRequestException('Solo los pagos confirmados tienen comprobante');
    }
    const trabajo = await this.obtenerTrabajo(this.dataSource.manager, pago.id_trabajo);
    this.verificarAcceso(trabajo, usuario);

    const total = await this.precioTotal(this.dataSource.manager, trabajo.id_trabajo);
    return {
      numero_comprobante: `CP-${String(pago.id_pago).padStart(8, '0')}`,
      tipo: pago.tipo,
      medio: pago.medio,
      fecha: pago.fecha_pago,
      id_trabajo: trabajo.id_trabajo,
      id_cliente: trabajo.id_cliente,
      id_trabajador: trabajo.id_trabajador,
      monto: Number(pago.monto),
      comision_plataforma: Number(pago.comision),
      precio_total_trabajo: total,
      referencia_pasarela: pago.referencia_pasarela,
    };
  }

  async listarDevoluciones(estado?: string) {
    const devoluciones = await this.devolucionRepository.find({
      where: estado ? { estado } : {},
      order: { fecha_solicitud: 'DESC' },
    });
    return devoluciones.map((d) => this.formatearDevolucion(d));
  }

  async misDevoluciones(idCliente: number) {
    const devoluciones = await this.devolucionRepository.find({
      where: { id_cliente: idCliente },
      order: { fecha_solicitud: 'DESC' },
    });
    return devoluciones.map((d) => this.formatearDevolucion(d));
  }
}
