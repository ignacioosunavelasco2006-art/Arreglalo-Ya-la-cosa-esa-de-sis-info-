import { BadRequestException, Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';

import { SistemaService } from '../sistema/sistema.service';

const DIA_MS = 24 * 60 * 60 * 1000;
const redondear = (n: number) => Math.round(n * 100) / 100;

export const TIPOS_REPORTE = [
  'trabajos',
  'ingresos',
  'calificaciones',
  'reclamos',
  'cancelaciones',
  'flujo-economico',
] as const;
export type TipoReporte = (typeof TIPOS_REPORTE)[number];

// Todos los reportes devuelven { periodo, resumen, detalle }.
// "detalle" es un arreglo de filas: es lo que se exporta a CSV.
@Injectable()
export class ReportesService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
  ) {}

  // ---------------------------------------------------------------
  // Trabajos por estado
  // ---------------------------------------------------------------
  async trabajos(desde?: string, hasta?: string) {
    const { ini, fin, periodo } = this.rango(desde, hasta);

    const detalle: { estado: string; cantidad: number; valor_total: number }[] =
      await this.dataSource.query(
        `SELECT t.estado,
                COUNT(*)::int AS cantidad,
                COALESCE(SUM(v.precio_total), 0)::float AS valor_total
           FROM trabajos t
           JOIN vista_trabajos_precio_total v ON v.id_trabajo = t.id_trabajo
          WHERE t.fecha_creacion >= $1 AND t.fecha_creacion < $2
          GROUP BY t.estado
          ORDER BY t.estado`,
        [ini, fin],
      );

    return {
      periodo,
      resumen: {
        total_trabajos: detalle.reduce((a, f) => a + f.cantidad, 0),
        valor_total: redondear(detalle.reduce((a, f) => a + f.valor_total, 0)),
      },
      detalle,
    };
  }

  // ---------------------------------------------------------------
  // Ingresos de la plataforma = comisiones cobradas al liquidar (RN-03)
  // ---------------------------------------------------------------
  async ingresos(desde?: string, hasta?: string) {
    const { ini, fin, periodo } = this.rango(desde, hasta);

    const detalle: {
      dia: string;
      liquidaciones: number;
      comision: number;
      pagado_a_trabajadores: number;
    }[] = await this.dataSource.query(
      `SELECT to_char(date_trunc('day', fecha_pago), 'YYYY-MM-DD') AS dia,
              COUNT(*)::int AS liquidaciones,
              COALESCE(SUM(comision), 0)::float AS comision,
              COALESCE(SUM(monto), 0)::float AS pagado_a_trabajadores
         FROM pagos
        WHERE tipo = 'liquidacion' AND estado = 'confirmado'
          AND fecha_pago >= $1 AND fecha_pago < $2
        GROUP BY 1
        ORDER BY 1`,
      [ini, fin],
    );

    return {
      periodo,
      resumen: {
        liquidaciones: detalle.reduce((a, f) => a + f.liquidaciones, 0),
        comisiones_totales: redondear(detalle.reduce((a, f) => a + f.comision, 0)),
        pagado_a_trabajadores: redondear(
          detalle.reduce((a, f) => a + f.pagado_a_trabajadores, 0),
        ),
      },
      detalle,
    };
  }

  // ---------------------------------------------------------------
  // Calificaciones: promedio por trabajador + distribución de puntajes
  // ---------------------------------------------------------------
  async calificaciones(desde?: string, hasta?: string) {
    const { ini, fin, periodo } = this.rango(desde, hasta);

    const detalle: { id_trabajador: number; total: number; promedio: number }[] =
      await this.dataSource.query(
        `SELECT id_trabajador,
                COUNT(*)::int AS total,
                ROUND(AVG(puntaje), 2)::float AS promedio
           FROM calificaciones
          WHERE fecha >= $1 AND fecha < $2
          GROUP BY id_trabajador
          ORDER BY promedio DESC, total DESC`,
        [ini, fin],
      );

    const distribucion: { puntaje: number; cantidad: number }[] =
      await this.dataSource.query(
        `SELECT puntaje::int AS puntaje, COUNT(*)::int AS cantidad
           FROM calificaciones
          WHERE fecha >= $1 AND fecha < $2
          GROUP BY puntaje
          ORDER BY puntaje`,
        [ini, fin],
      );

    const total = distribucion.reduce((a, f) => a + f.cantidad, 0);
    const suma = distribucion.reduce((a, f) => a + f.cantidad * f.puntaje, 0);

    return {
      periodo,
      resumen: {
        total_calificaciones: total,
        promedio_general: total ? redondear(suma / total) : null,
        distribucion,
      },
      detalle,
    };
  }

  // ---------------------------------------------------------------
  // Reclamos por estado
  // ---------------------------------------------------------------
  async reclamos(desde?: string, hasta?: string) {
    const { ini, fin, periodo } = this.rango(desde, hasta);

    const detalle: { estado: string; cantidad: number; escalados: number }[] =
      await this.dataSource.query(
        `SELECT estado,
                COUNT(*)::int AS cantidad,
                COUNT(*) FILTER (WHERE escalado_super)::int AS escalados
           FROM reclamos
          WHERE fecha_reclamo >= $1 AND fecha_reclamo < $2
          GROUP BY estado
          ORDER BY estado`,
        [ini, fin],
      );

    return {
      periodo,
      resumen: {
        total_reclamos: detalle.reduce((a, f) => a + f.cantidad, 0),
        escalados: detalle.reduce((a, f) => a + f.escalados, 0),
      },
      detalle,
    };
  }

  // ---------------------------------------------------------------
  // Cancelaciones por quién cancela y resultado
  // ---------------------------------------------------------------
  async cancelaciones(desde?: string, hasta?: string) {
    const { ini, fin, periodo } = this.rango(desde, hasta);

    const detalle: { cancelado_por: string; estado: string; cantidad: number }[] =
      await this.dataSource.query(
        `SELECT cancelado_por, estado, COUNT(*)::int AS cantidad
           FROM cancelaciones
          WHERE fecha_solicitud >= $1 AND fecha_solicitud < $2
          GROUP BY cancelado_por, estado
          ORDER BY cancelado_por, estado`,
        [ini, fin],
      );

    return {
      periodo,
      resumen: {
        total_cancelaciones: detalle.reduce((a, f) => a + f.cantidad, 0),
        por_cliente: detalle
          .filter((f) => f.cancelado_por === 'cliente')
          .reduce((a, f) => a + f.cantidad, 0),
        por_trabajador: detalle
          .filter((f) => f.cancelado_por === 'trabajador')
          .reduce((a, f) => a + f.cantidad, 0),
      },
      detalle,
    };
  }

  // ---------------------------------------------------------------
  // Flujo económico (CU-31 pasos 3 y 4): lo cobrado, lo retenido, lo pendiente
  // de pagar a trabajadores, devoluciones, efectivo y la proyección a 30 días.
  // ---------------------------------------------------------------
  async flujoEconomico(desde?: string, hasta?: string) {
    const { ini, fin, periodo } = this.rango(desde, hasta);

    // RF-34: los porcentajes salen de parametros_sistema.
    // ⚠ Usa las claves que tengas en tu SQL ('comision', 'anticipo').
    const comision = await this.sistema.obtenerPorcentaje('comision', 0.05);
    const anticipo = await this.sistema.obtenerPorcentaje('anticipo', 0.25);

    // 1) Movimientos confirmados dentro del periodo
    const [mov] = await this.dataSource.query(
      `SELECT
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'anticipo' AND estado = 'confirmado'), 0)::float
           AS anticipos_cobrados,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'saldo' AND estado = 'confirmado' AND medio <> 'efectivo'), 0)::float
           AS saldos_digitales_cobrados,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'saldo' AND estado = 'confirmado' AND medio = 'efectivo'), 0)::float
           AS efectivo_confirmado,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'saldo' AND estado = 'en_disputa'), 0)::float
           AS efectivo_en_disputa,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'liquidacion' AND estado = 'confirmado'), 0)::float
           AS pagado_a_trabajadores,
         COALESCE(SUM(comision) FILTER (WHERE tipo = 'liquidacion' AND estado = 'confirmado'), 0)::float
           AS comisiones,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'devolucion' AND estado = 'confirmado'), 0)::float
           AS devoluciones_procesadas,
         COALESCE(SUM(monto) FILTER (WHERE tipo = 'devolucion' AND estado = 'pendiente'), 0)::float
           AS devoluciones_pendientes
         FROM pagos
        WHERE fecha_pago >= $1 AND fecha_pago < $2`,
      [ini, fin],
    );

    // 2) Foto de hoy: anticipos retenidos (trabajos que aún no terminan)
    const [ret] = await this.dataSource.query(
      `SELECT COALESCE(SUM(p.monto), 0)::float AS retenido
         FROM pagos p
         JOIN trabajos t ON t.id_trabajo = p.id_trabajo
        WHERE p.tipo = 'anticipo' AND p.estado = 'confirmado'
          AND t.estado IN ('programado', 'en_camino', 'en_proceso', 'en_reclamo')`,
    );

    // 3) Foto de hoy: lo que la plataforma aún debe pagar a trabajadores
    //    (saldo digital confirmado, todavía sin liquidación). Efectivo no se liquida (RN-19).
    const [pend] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS trabajos,
              COALESCE(SUM(ROUND(v.precio_total * (1 - $1::numeric), 2)), 0)::float AS monto
         FROM trabajos t
         JOIN vista_trabajos_precio_total v ON v.id_trabajo = t.id_trabajo
        WHERE t.estado = 'terminado'
          AND t.metodo_pago <> 'efectivo'
          AND EXISTS (SELECT 1 FROM pagos p WHERE p.id_trabajo = t.id_trabajo
                       AND p.tipo = 'saldo' AND p.estado = 'confirmado')
          AND NOT EXISTS (SELECT 1 FROM pagos p WHERE p.id_trabajo = t.id_trabajo
                           AND p.tipo = 'liquidacion')`,
      [comision],
    );

    // 4) Proyección de los próximos 30 días con los trabajos programados
    const [prox] = await this.dataSource.query(
      `SELECT COUNT(*)::int AS trabajos,
              COALESCE(SUM(v.precio_total), 0)::float AS valor_total,
              COALESCE(SUM(v.precio_total) FILTER (WHERE t.metodo_pago <> 'efectivo'), 0)::float AS valor_digital,
              COALESCE(SUM(v.precio_total) FILTER (WHERE t.metodo_pago = 'efectivo'), 0)::float AS valor_efectivo,
              COALESCE(SUM(v.precio_total) FILTER (WHERE t.estado = 'pendiente_anticipo'), 0)::float AS valor_sin_anticipo
         FROM trabajos t
         JOIN vista_trabajos_precio_total v ON v.id_trabajo = t.id_trabajo
        WHERE t.estado IN ('pendiente_anticipo', 'programado', 'en_camino', 'en_proceso')
          AND t.fecha_inicio_prog >= NOW()
          AND t.fecha_inicio_prog < NOW() + INTERVAL '30 days'`,
    );

    const proyeccion = {
      trabajos_programados: prox.trabajos as number,
      valor_total_trabajos: redondear(prox.valor_total),
      anticipos_por_cobrar: redondear(prox.valor_sin_anticipo * anticipo),
      saldos_por_cobrar: redondear(prox.valor_total * (1 - anticipo)),
      comisiones_esperadas: redondear(prox.valor_digital * comision),
      pagos_esperados_a_trabajadores: redondear(prox.valor_digital * (1 - comision)),
      efectivo_esperado: redondear(prox.valor_efectivo),
      nota: 'Estimación: solo cuenta trabajos con fecha programada en los próximos 30 días.',
    };

    const cobradoClientes = mov.anticipos_cobrados + mov.saldos_digitales_cobrados;

    const resumen = {
      cobrado_a_clientes: redondear(cobradoClientes),
      anticipos_cobrados: redondear(mov.anticipos_cobrados),
      saldos_digitales_cobrados: redondear(mov.saldos_digitales_cobrados),
      anticipos_retenidos_hoy: redondear(ret.retenido),
      pendiente_de_pagar_a_trabajadores: redondear(pend.monto),
      trabajos_pendientes_de_liquidar: pend.trabajos as number,
      pagado_a_trabajadores: redondear(mov.pagado_a_trabajadores),
      comisiones: redondear(mov.comisiones),
      devoluciones_procesadas: redondear(mov.devoluciones_procesadas),
      devoluciones_pendientes: redondear(mov.devoluciones_pendientes),
      efectivo_confirmado: redondear(mov.efectivo_confirmado),
      efectivo_en_disputa: redondear(mov.efectivo_en_disputa),
      proyeccion_30_dias: proyeccion,
    };

    // Filas planas para exportar a CSV
    const detalle = [
      { concepto: 'Cobrado a clientes', monto: resumen.cobrado_a_clientes },
      { concepto: '  Anticipos cobrados', monto: resumen.anticipos_cobrados },
      { concepto: '  Saldos digitales cobrados', monto: resumen.saldos_digitales_cobrados },
      { concepto: 'Anticipos retenidos (hoy)', monto: resumen.anticipos_retenidos_hoy },
      { concepto: 'Pendiente de pagar a trabajadores (hoy)', monto: resumen.pendiente_de_pagar_a_trabajadores },
      { concepto: 'Pagado a trabajadores', monto: resumen.pagado_a_trabajadores },
      { concepto: 'Comisiones de la plataforma', monto: resumen.comisiones },
      { concepto: 'Devoluciones procesadas', monto: resumen.devoluciones_procesadas },
      { concepto: 'Devoluciones pendientes', monto: resumen.devoluciones_pendientes },
      { concepto: 'Efectivo confirmado', monto: resumen.efectivo_confirmado },
      { concepto: 'Efectivo en disputa', monto: resumen.efectivo_en_disputa },
      { concepto: 'PROYECCIÓN 30d: anticipos por cobrar', monto: proyeccion.anticipos_por_cobrar },
      { concepto: 'PROYECCIÓN 30d: saldos por cobrar', monto: proyeccion.saldos_por_cobrar },
      { concepto: 'PROYECCIÓN 30d: comisiones esperadas', monto: proyeccion.comisiones_esperadas },
      { concepto: 'PROYECCIÓN 30d: pagos a trabajadores', monto: proyeccion.pagos_esperados_a_trabajadores },
      { concepto: 'PROYECCIÓN 30d: efectivo esperado', monto: proyeccion.efectivo_esperado },
    ];

    return { periodo, resumen, detalle };
  }

  // ---------------------------------------------------------------
  // Exportación (CU-31 paso 5)
  // ---------------------------------------------------------------
  async exportarCsv(tipo: string, desde?: string, hasta?: string): Promise<string> {
    if (!(TIPOS_REPORTE as readonly string[]).includes(tipo)) {
      throw new BadRequestException(`tipo debe ser: ${TIPOS_REPORTE.join(', ')}`);
    }

    const mapa: Record<TipoReporte, () => Promise<{ detalle: object[] }>> = {
      trabajos: () => this.trabajos(desde, hasta),
      ingresos: () => this.ingresos(desde, hasta),
      calificaciones: () => this.calificaciones(desde, hasta),
      reclamos: () => this.reclamos(desde, hasta),
      cancelaciones: () => this.cancelaciones(desde, hasta),
      'flujo-economico': () => this.flujoEconomico(desde, hasta),
    };

    const { detalle } = await mapa[tipo as TipoReporte]();
    return this.aCsv(detalle as Record<string, unknown>[]);
  }

  // ---------------------------------------------------------------
  // Auxiliares
  // ---------------------------------------------------------------

  // "hasta" con solo fecha (2026-11-30) incluye el día completo.
  private rango(desde?: string, hasta?: string) {
    const fin = hasta ? new Date(hasta) : new Date();
    if (isNaN(fin.getTime())) throw new BadRequestException('hasta no es una fecha válida');
    if (hasta && /^\d{4}-\d{2}-\d{2}$/.test(hasta)) fin.setUTCDate(fin.getUTCDate() + 1);

    const ini = desde ? new Date(desde) : new Date(fin.getTime() - 30 * DIA_MS);
    if (isNaN(ini.getTime())) throw new BadRequestException('desde no es una fecha válida');
    if (ini >= fin) throw new BadRequestException('"desde" debe ser anterior a "hasta"');

    return { ini, fin, periodo: { desde: ini.toISOString(), hasta: fin.toISOString() } };
  }

  // BOM al inicio para que Excel respete las tildes
  private aCsv(filas: Record<string, unknown>[]): string {
    if (filas.length === 0) return '\uFEFF';
    const columnas = Object.keys(filas[0]);
    const celda = (valor: unknown) => {
      const texto = valor === null || valor === undefined ? '' : String(valor);
      return /[",\r\n]/.test(texto) ? `"${texto.replace(/"/g, '""')}"` : texto;
    };
    const lineas = [
      columnas.join(','),
      ...filas.map((fila) => columnas.map((c) => celda(fila[c])).join(',')),
    ];
    return '\uFEFF' + lineas.join('\r\n');
  }
}