import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { DataSource } from 'typeorm';

import { SistemaService } from '../sistema/sistema.service';
import { AdministracionService } from '../administracion/administracion.service';

const formatoFecha = (f: Date | string) => new Date(f).toISOString().slice(0, 16).replace('T', ' ');

// Tareas automáticas que el informe pide (sección 11.1, punto 5 y RF-35).
// Ya existen en otros módulos:
//   - SolicitudesService.cerrarVencidas()           -> cierre a los 30 días (RF-15)
//   - AdministracionService.procesarSuspensiones()  -> fin de suspensiones y eliminación a 60 días (RF-07)
// Aquí van los recordatorios, las alertas y la detección de atrasos.
@Injectable()
export class TareasService {
  private readonly logger = new Logger(TareasService.name);

  constructor(
    private readonly dataSource: DataSource,
    private readonly sistema: SistemaService,
    private readonly administracion: AdministracionService,
  ) {}

  // Ejecuta una tarea sin que un error en una detenga a las demás
  private async segura(nombre: string, tarea: () => Promise<void>) {
    try {
      await tarea();
    } catch (error) {
      this.logger.error(`Falló la tarea "${nombre}": ${error}`);
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async ejecutarHoraria() {
    await this.segura('recordatorio de citas', () => this.recordarCitas());
    await this.segura('recordatorio de calificar', () => this.recordarCalificar());
    await this.segura('incrementos pendientes', () => this.recordarIncrementosPendientes());
    await this.segura('finalizaciones pendientes', () => this.recordarFinalizacionesPendientes());
    await this.segura('devoluciones por vencer', () => this.alertarDevolucionesPorVencer());
    await this.segura('atrasos automáticos', () => this.detectarAtrasos());
  }

  // RF-35 "recordatorios de citas": 24 horas antes, a cliente y trabajador
  private async recordarCitas() {
    const citas: any[] = await this.dataSource.query(
      `SELECT id_trabajo, id_cliente, id_trabajador, fecha_inicio_prog
         FROM trabajos
        WHERE estado = 'programado' AND fecha_inicio_prog > NOW()
          AND fecha_inicio_prog <= NOW() + INTERVAL '24 hours'`,
    );
    for (const c of citas) {
      const texto = `Recordatorio: el trabajo #${c.id_trabajo} está programado para el ${formatoFecha(c.fecha_inicio_prog)}.`;
      await this.sistema.notificarUnaVez(c.id_cliente, 'recordatorio_cita', texto);
      await this.sistema.notificarUnaVez(c.id_trabajador, 'recordatorio_cita', texto);
    }
  }

  // CU-27 flujo alterno: "si el cliente no califica, se le recuerda"
  private async recordarCalificar() {
    const pendientes: any[] = await this.dataSource.query(
      `SELECT t.id_trabajo, t.id_cliente
         FROM trabajos t
        WHERE t.estado = 'terminado'
          AND t.fecha_cierre < NOW() - INTERVAL '24 hours'
          AND t.fecha_cierre > NOW() - INTERVAL '7 days'
          AND NOT EXISTS (SELECT 1 FROM calificaciones c WHERE c.id_trabajo = t.id_trabajo)`,
    );
    for (const p of pendientes) {
      await this.sistema.notificarUnaVez(
        p.id_cliente,
        'recordatorio_calificar',
        `Aún no calificaste el trabajo #${p.id_trabajo}. Tu opinión ayuda a otros clientes.`,
      );
    }
  }

  // CU-18 flujo alterno: "sin respuesta, se reenvía un recordatorio"
  private async recordarIncrementosPendientes() {
    const pendientes: any[] = await this.dataSource.query(
      `SELECT i.id_incremento, t.id_trabajo, t.id_cliente
         FROM incrementos_precio i JOIN trabajos t ON t.id_trabajo = i.id_trabajo
        WHERE i.estado = 'pendiente' AND i.fecha_solicitud < NOW() - INTERVAL '24 hours'`,
    );
    for (const p of pendientes) {
      await this.sistema.notificarUnaVez(
        p.id_cliente,
        'recordatorio_incremento',
        `Tienes un incremento de precio (#${p.id_incremento}) sin responder en el trabajo #${p.id_trabajo}.`,
      );
    }
  }

  private async recordarFinalizacionesPendientes() {
    const pendientes: any[] = await this.dataSource.query(
      `SELECT f.id_finalizacion, t.id_trabajo, t.id_cliente
         FROM solicitudes_finalizacion f JOIN trabajos t ON t.id_trabajo = f.id_trabajo
        WHERE f.estado = 'pendiente' AND f.fecha_solicitud < NOW() - INTERVAL '24 hours'`,
    );
    for (const p of pendientes) {
      await this.sistema.notificarUnaVez(
        p.id_cliente,
        'recordatorio_finalizacion',
        `El trabajador espera tu confirmación de finalización del trabajo #${p.id_trabajo} (solicitud #${p.id_finalizacion}).`,
      );
    }
  }

  // RN-08: "el sistema tiene 3 días para devolver el dinero". Avisa a supervisión con 24 h de margen.
  private async alertarDevolucionesPorVencer() {
    const devoluciones: any[] = await this.dataSource.query(
      `SELECT id_pago, id_trabajo, fecha_limite
         FROM pagos
        WHERE tipo = 'devolucion' AND estado = 'pendiente'
          AND fecha_limite IS NOT NULL
          AND fecha_limite <= NOW() + INTERVAL '24 hours'`,
    );
    for (const d of devoluciones) {
      const vencida = new Date(d.fecha_limite).getTime() < Date.now();
      await this.sistema.notificarRolUnaVez(
        'supervisor',
        vencida ? 'devolucion_vencida' : 'devolucion_por_vencer',
        vencida
          ? `¡VENCIDA! La devolución del pago #${d.id_pago} (trabajo #${d.id_trabajo}) superó su plazo de ${formatoFecha(d.fecha_limite)}.`
          : `La devolución del pago #${d.id_pago} (trabajo #${d.id_trabajo}) vence el ${formatoFecha(d.fecha_limite)}. Procésala.`,
      );
    }
  }

  // RF-08 "atrasos": el informe no define cómo se detecta un atraso, así que esta detección
  // es OPT-IN. Actívala creando el parámetro  atrasos_automaticos = 1  en parametros_sistema.
  // Criterio: el trabajo sigue "programado" pasados N minutos de su hora de inicio
  // (parámetro minutos_tolerancia_atraso, por defecto 30), es decir, el trabajador nunca
  // marcó "en camino" ni "en proceso".
  private async detectarAtrasos() {
    const activo = await this.sistema.obtenerNumero('atrasos_automaticos', 0);
    if (activo !== 1) return;

    const tolerancia = Math.round(await this.sistema.obtenerNumero('minutos_tolerancia_atraso', 30));
    const atrasados: { id_trabajo: number; id_trabajador: number }[] = await this.dataSource.query(
      `SELECT t.id_trabajo, t.id_trabajador
         FROM trabajos t
        WHERE t.estado = 'programado'
          AND t.fecha_inicio_prog IS NOT NULL
          AND t.fecha_inicio_prog < NOW() - ($1 || ' minutes')::interval
          AND NOT EXISTS (SELECT 1 FROM incidentes_trabajador i
                           WHERE i.id_trabajo = t.id_trabajo AND i.tipo = 'atraso')`,
      [String(tolerancia)],
    );

    for (const a of atrasados) {
      await this.administracion.registrarIncidente(
        { id_trabajador: a.id_trabajador, id_trabajo: a.id_trabajo, tipo: 'atraso' },
        null,
      );
      await this.sistema.notificar(
        a.id_trabajador,
        'incidente_atraso',
        `Se registró un atraso en el trabajo #${a.id_trabajo}. Los atrasos repetidos pueden suspender tu cuenta.`,
      );
    }
  }
}
