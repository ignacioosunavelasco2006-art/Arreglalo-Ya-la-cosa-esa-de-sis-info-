import { DecimalPipe } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/errores';
import { RendimientoRespuesta } from '../core/modelos';
import { TrabajadoresService } from '../core/trabajadores.service';

// Panel de rendimiento.
// - Trabajador: ve solo sus indicadores (GET /trabajadores/mi-perfil/rendimiento).
// - Supervisor: ve a todos los trabajadores (GET /trabajadores/rendimiento).
// Los filtros de fecha son opcionales; sin fechas se muestra todo el historial.
@Component({
  selector: 'app-rendimiento',
  imports: [DecimalPipe, RouterLink],
  template: `
    <h1 class="h3 mb-2">
      {{ esTrabajador() ? 'Mi rendimiento' : 'Rendimiento de trabajadores' }}
    </h1>
    <p class="text-muted">
      Trabajos terminados, cancelaciones, ingresos y calificación promedio.
      Filtra por fechas para comparar periodos.
    </p>

    <!-- FILTROS -->
    <div class="card shadow-sm mb-3">
      <div class="card-body">
        <div class="row g-2 align-items-end">
          <div class="col-sm-4 col-md-3">
            <label class="form-label small mb-1" for="desde">Desde</label>
            <input id="desde" type="date" class="form-control" [value]="desde()"
                   [max]="hasta() || null" (change)="desde.set(valor($event))" />
          </div>
          <div class="col-sm-4 col-md-3">
            <label class="form-label small mb-1" for="hasta">Hasta</label>
            <input id="hasta" type="date" class="form-control" [value]="hasta()"
                   [min]="desde() || null" (change)="hasta.set(valor($event))" />
          </div>
          <div class="col-sm-4 col-md-6 d-flex gap-2">
            <button type="button" class="btn btn-primary" (click)="cargar()" [disabled]="cargando()">
              Filtrar
            </button>
            <button type="button" class="btn btn-outline-secondary" (click)="limpiar()"
                    [disabled]="cargando() || (!desde() && !hasta())">
              Quitar filtros
            </button>
          </div>
        </div>
      </div>
    </div>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    @if (cargando()) {
      <p class="text-muted">Calculando indicadores...</p>
    } @else if (datos(); as d) {

      <p class="small text-muted">
        Periodo:
        @if (d.filtros.desde || d.filtros.hasta) {
          {{ d.filtros.desde || 'inicio' }} al {{ d.filtros.hasta || 'hoy' }}
        } @else {
          todo el historial
        }
      </p>

      <!-- INDICADORES GENERALES -->
      <div class="row g-3 mb-3">
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="small text-muted">Trabajos realizados</div>
              <div class="fs-3 fw-bold">{{ d.totales.trabajos_realizados }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="small text-muted">Cancelaciones</div>
              <div class="fs-3 fw-bold">{{ d.totales.cancelaciones }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="small text-muted">Ingresos</div>
              <div class="fs-3 fw-bold">Bs {{ d.totales.ingresos | number: '1.2-2' }}</div>
            </div>
          </div>
        </div>
        <div class="col-6 col-lg-3">
          <div class="card shadow-sm h-100">
            <div class="card-body">
              <div class="small text-muted">Calificación promedio</div>
              <div class="fs-3 fw-bold">
                @if (d.totales.calificacion_promedio !== null) {
                  {{ d.totales.calificacion_promedio | number: '1.2-2' }} / 5
                } @else {
                  <span class="fs-6 text-muted fw-normal">Sin calificaciones</span>
                }
              </div>
            </div>
          </div>
        </div>
      </div>

      <!-- DETALLE POR TRABAJADOR -->
      @if (d.trabajadores.length === 0) {
        <div class="alert alert-info">No hay trabajadores para mostrar.</div>
      } @else {
        <div class="card shadow-sm">
          <div class="table-responsive">
            <table class="table table-hover align-middle mb-0">
              <thead class="table-light">
                <tr>
                  <th>Trabajador</th>
                  <th class="text-end">Trabajos realizados</th>
                  <th class="text-end">Cancelaciones</th>
                  <th class="text-end">Ingresos (Bs)</th>
                  <th class="text-end">Calificación</th>
                </tr>
              </thead>
              <tbody>
                @for (t of d.trabajadores; track t.id_usuario) {
                  <tr>
                    <td>
                      <a [routerLink]="['/trabajadores', t.id_usuario]">
                        {{ t.nombres }} {{ t.apellidos }}
                      </a>
                    </td>
                    <td class="text-end">{{ t.trabajos_realizados }}</td>
                    <td class="text-end">
                      {{ t.cancelaciones }}
                      @if (t.canceladas_por_trabajador > 0) {
                        <span class="small text-muted d-block">
                          {{ t.canceladas_por_trabajador }} por el trabajador
                        </span>
                      }
                    </td>
                    <td class="text-end">{{ t.ingresos | number: '1.2-2' }}</td>
                    <td class="text-end">
                      @if (t.calificacion_promedio !== null) {
                        {{ t.calificacion_promedio | number: '1.2-2' }}
                        <span class="small text-muted">({{ t.total_calificaciones }})</span>
                      } @else {
                        <span class="text-muted">Sin calificar</span>
                      }
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      }
    }
  `,
})
export class Rendimiento {
  private api = inject(TrabajadoresService);
  private auth = inject(AuthService);

  // El trabajador consulta su propio panel; el supervisor, el de todos
  esTrabajador = computed(() => this.auth.rolActivo() === 'trabajador');

  desde = signal('');
  hasta = signal('');

  datos = signal<RendimientoRespuesta | null>(null);
  cargando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  valor(evento: Event): string {
    return (evento.target as HTMLInputElement).value;
  }

  cargar() {
    const desde = this.desde();
    const hasta = this.hasta();

    // Misma regla que el backend (que además la valida): el rango no puede estar invertido
    if (desde && hasta && desde > hasta) {
      this.error.set('La fecha "desde" no puede ser posterior a "hasta".');
      return;
    }

    this.error.set(null);
    this.cargando.set(true);

    const peticion = this.esTrabajador()
      ? this.api.miRendimiento(desde, hasta)
      : this.api.rendimiento(desde, hasta);

    peticion.subscribe({
      next: (respuesta) => {
        this.datos.set(respuesta);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  limpiar() {
    this.desde.set('');
    this.hasta.set('');
    this.cargar();
  }
}