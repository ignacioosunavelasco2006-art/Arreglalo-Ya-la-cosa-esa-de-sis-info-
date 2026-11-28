import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { AdminService, TipoReporte } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { Reporte } from '../../core/modelos';
import { descargarBlob } from '../../shared/descargar';

const TIPOS: { valor: TipoReporte; texto: string; ayuda: string }[] = [
  { valor: 'flujo-economico', texto: 'Flujo económico', ayuda: 'Lo cobrado, retenido y pendiente de pagar, y la proyección de los próximos 30 días.' },
  { valor: 'trabajos', texto: 'Trabajos', ayuda: 'Cantidad y valor de los trabajos creados en el período, por estado.' },
  { valor: 'ingresos', texto: 'Ingresos', ayuda: 'Comisiones de la plataforma y costos de inspección recuperados.' },
  { valor: 'calificaciones', texto: 'Calificaciones', ayuda: 'Promedio por trabajador y distribución de puntajes.' },
  { valor: 'reclamos', texto: 'Reclamos', ayuda: 'Reclamos del período por estado.' },
  { valor: 'cancelaciones', texto: 'Cancelaciones', ayuda: 'Quién cancela y con qué resultado.' },
];

const ES_DINERO = /(monto|valor|comision|cobrad|pagad|anticip|saldo|efectivo|devoluc|pendiente_de|retenid|ingreso|costo|pagos_esperados)/;

const fecha = (d: Date) => d.toISOString().slice(0, 10);

interface Fila {
  etiqueta: string;
  valor: string;
}

// RF-31 / CU-31: reportes del supervisor, con exportación a CSV.
@Component({
  selector: 'app-reportes',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Reportes</h1>

    <div class="card mb-3"><div class="card-body">
      <form [formGroup]="form" (ngSubmit)="generar()" class="row g-2 align-items-end">
        <div class="col-sm-4">
          <label class="form-label small mb-1" for="tipo">Reporte</label>
          <select id="tipo" class="form-select form-select-sm" formControlName="tipo">
            @for (t of tipos; track t.valor) { <option [value]="t.valor">{{ t.texto }}</option> }
          </select>
        </div>
        <div class="col-sm-3">
          <label class="form-label small mb-1" for="desde">Desde</label>
          <input id="desde" type="date" class="form-control form-control-sm" formControlName="desde" />
        </div>
        <div class="col-sm-3">
          <label class="form-label small mb-1" for="hasta">Hasta</label>
          <input id="hasta" type="date" class="form-control form-control-sm" formControlName="hasta" />
        </div>
        <div class="col-sm-2"><button class="btn btn-primary btn-sm w-100" type="submit" [disabled]="cargando()">Generar</button></div>
      </form>
      <div class="form-text">{{ ayuda() }}</div>
    </div></div>

    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    @if (cargando()) {
      <div class="text-muted">Generando...</div>
    } @else if (reporte()) {
      <div class="d-flex justify-content-between align-items-center mb-2">
        <h2 class="h5 mb-0">{{ tituloActual() }}</h2>
        <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="exportando()" (click)="exportar()">
          Exportar a CSV
        </button>
      </div>

      @if (filasResumen().length > 0) {
        <div class="card mb-3"><div class="card-body py-2">
          <dl class="row mb-0 small">
            @for (f of filasResumen(); track f.etiqueta) {
              <dt class="col-sm-6 col-lg-5">{{ f.etiqueta }}</dt>
              <dd class="col-sm-6 col-lg-7 mb-1 fw-bold">{{ f.valor }}</dd>
            }
          </dl>
        </div></div>
      }

      @if (columnas().length > 0) {
        <div class="table-responsive">
          <table class="table table-sm table-striped bg-white">
            <thead><tr>@for (c of columnas(); track c) { <th>{{ bonito(c) }}</th> }</tr></thead>
            <tbody>
              @for (fila of reporte()!.detalle; track $index) {
                <tr>@for (c of columnas(); track c) { <td>{{ celda(fila[c]) }}</td> }</tr>
              }
            </tbody>
          </table>
        </div>
      } @else {
        <div class="card"><div class="card-body text-center text-muted">Sin datos en el período.</div></div>
      }
    }
  `,
})
export class Reportes {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);

  tipos = TIPOS;
  reporte = signal<Reporte | null>(null);
  tipoGenerado = signal<TipoReporte>('flujo-economico');
  cargando = signal(false);
  exportando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    tipo: ['flujo-economico' as TipoReporte],
    desde: [fecha(new Date(Date.now() - 30 * 86_400_000))],
    hasta: [fecha(new Date())],
  });

  ayuda = computed(() => TIPOS.find((t) => t.valor === this.form.controls.tipo.value)?.ayuda ?? '');
  tituloActual = computed(() => TIPOS.find((t) => t.valor === this.tipoGenerado())?.texto ?? '');
  columnas = computed(() => Object.keys(this.reporte()?.detalle[0] ?? {}));
  filasResumen = computed(() => this.aFilas(this.reporte()?.resumen ?? {}, ''));

  constructor() {
    this.generar();
  }

  generar() {
    const { tipo, desde, hasta } = this.form.getRawValue();
    this.cargando.set(true);
    this.error.set(null);
    this.api.reporte(tipo, desde, hasta).subscribe({
      next: (r) => {
        this.reporte.set(r);
        this.tipoGenerado.set(tipo);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  exportar() {
    const { desde, hasta } = this.form.getRawValue();
    const tipo = this.tipoGenerado();
    this.exportando.set(true);
    this.api.exportarCsv(tipo, desde, hasta).subscribe({
      next: (blob) => {
        descargarBlob(blob, `reporte-${tipo}-${desde}_a_${hasta}.csv`);
        this.exportando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.exportando.set(false);
      },
    });
  }

  // "comisiones_esperadas" -> "Comisiones esperadas"
  bonito(clave: string) {
    const texto = clave.replace(/_/g, ' ');
    return texto.charAt(0).toUpperCase() + texto.slice(1);
  }

  celda(valor: unknown) {
    return valor === null || valor === undefined ? '—' : String(valor);
  }

  // Convierte el resumen (que puede tener objetos anidados) en filas "etiqueta: valor"
  private aFilas(obj: Record<string, unknown>, prefijo: string): Fila[] {
    const filas: Fila[] = [];
    for (const [clave, valor] of Object.entries(obj)) {
      const etiqueta = prefijo ? `${prefijo} › ${this.bonito(clave)}` : this.bonito(clave);
      if (valor && typeof valor === 'object' && !Array.isArray(valor)) {
        filas.push(...this.aFilas(valor as Record<string, unknown>, etiqueta));
      } else if (Array.isArray(valor)) {
        if (valor.length > 0) {
          const texto = valor
            .map((x) =>
              x && typeof x === 'object'
                ? Object.entries(x).map(([k, v]) => `${k}: ${v}`).join(', ')
                : String(x),
            )
            .join('  |  ');
          filas.push({ etiqueta, valor: texto });
        }
      } else if (typeof valor === 'number') {
        const dinero = ES_DINERO.test(clave);
        filas.push({
          etiqueta,
          valor: dinero ? `Bs ${valor.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : String(valor),
        });
      } else {
        filas.push({ etiqueta, valor: valor === null || valor === undefined ? '—' : String(valor) });
      }
    }
    return filas;
  }
}
