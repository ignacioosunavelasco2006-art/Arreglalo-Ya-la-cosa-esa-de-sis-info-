
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import {
  AdministracionService,
  ClasificacionTrabajador,
  HistorialClasificacion,
} from '../../core/administracion.service';
import { TrabajadoresService } from '../../core/trabajadores.service';
import { mensajeDeError } from '../../core/errores';

interface TrabajadorLista {
  id_usuario: number;
  nombres: string;
  apellidos: string;
}

@Component({
  selector: 'app-clasificacion-trabajadores',
  template: `
    <h1 class="h3 mb-2">Clasificación de trabajadores</h1>
    <p class="text-muted">
      Consulta incidentes, reincidencias y el historial de evaluaciones.
      Se consideran los últimos 90 días.
    </p>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    <div class="row g-3">
      <div class="col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">Trabajadores</h2>
              <button
                class="btn btn-outline-primary btn-sm"
                (click)="cargarTrabajadores()"
                [disabled]="cargandoLista()">
                Actualizar
              </button>
            </div>

            @if (cargandoLista()) {
              <p class="text-muted">Cargando trabajadores...</p>
            } @else if (trabajadores().length === 0) {
              <div class="alert alert-info">
                No se encontraron trabajadores con perfil aprobado.
              </div>
            } @else {
              <div class="list-group">
                @for (t of trabajadores(); track t.id_usuario) {
                  <button
                    type="button"
                    class="list-group-item list-group-item-action"
                    [class.active]="seleccionado()?.id_usuario === t.id_usuario"
                    (click)="seleccionar(t)">
                    <strong>{{ t.nombres }} {{ t.apellidos }}</strong>
                    <div class="small">Trabajador #{{ t.id_usuario }}</div>
                  </button>
                }
              </div>
            }
          </div>
        </div>
      </div>

      <div class="col-lg-7">
        <div class="card shadow-sm">
          <div class="card-body">
            @if (!seleccionado()) {
              <div class="text-muted text-center py-5">
                Selecciona un trabajador para consultar su clasificación.
              </div>
            } @else {
              <h2 class="h5">
                {{ seleccionado()?.nombres }} {{ seleccionado()?.apellidos }}
              </h2>

              @if (cargandoDetalle()) {
                <p class="text-muted">Consultando clasificación...</p>
              } @else if (clasificacion(); as c) {
                <div class="border rounded p-3 mb-3">
                  <div class="d-flex justify-content-between align-items-center">
                    <strong>Clasificación actual</strong>
                    <span class="badge"
                      [class.bg-success]="c.clasificacion === 'normal'"
                      [class.bg-warning]="c.clasificacion === 'observacion'"
                      [class.bg-info]="c.clasificacion === 'reincidente'"
                      [class.bg-danger]="c.clasificacion === 'critico'">
                      {{ c.clasificacion }}
                    </span>
                  </div>

                  <div class="row text-center mt-3">
                    <div class="col-6">
                      <div class="h3 mb-0">{{ c.puntaje }}</div>
                      <small class="text-muted">Puntaje</small>
                    </div>
                    <div class="col-6">
                      <div class="h3 mb-0">{{ c.umbral }}</div>
                      <small class="text-muted">Umbral configurado</small>
                    </div>
                  </div>

                  <hr>

                  <div class="row">
                    <div class="col-6 mb-2">Atrasos: <strong>{{ c.atrasos }}</strong></div>
                    <div class="col-6 mb-2">Cancelaciones: <strong>{{ c.cancelaciones }}</strong></div>
                    <div class="col-6 mb-2">Reclamos: <strong>{{ c.reclamos }}</strong></div>
                    <div class="col-6 mb-2">
                      Reincidente:
                      <strong>{{ c.es_reincidente ? 'Sí' : 'No' }}</strong>
                    </div>
                  </div>

                  <small class="text-muted">
                    Incidentes contabilizados: {{ c.cantidad_incidentes }}
                    en {{ c.periodo_dias }} días.
                  </small>
                </div>

                <button
                  class="btn btn-primary mb-3"
                  (click)="registrarEvaluacion()"
                  [disabled]="guardando()">
                  {{ guardando() ? 'Guardando...' : 'Registrar evaluación en historial' }}
                </button>
              }

              <h3 class="h6 mt-2">Historial de evaluaciones</h3>

              @if (cargandoHistorial()) {
                <p class="text-muted">Cargando historial...</p>
              } @else if (historial().length === 0) {
                <div class="alert alert-info">
                  Este trabajador todavía no tiene evaluaciones guardadas.
                </div>
              } @else {
                <div class="table-responsive">
                  <table class="table table-sm table-striped">
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Clasificación</th>
                        <th>Puntaje</th>
                        <th>Reincidente</th>
                      </tr>
                    </thead>
                    <tbody>
                      @for (h of historial(); track h.id_historial) {
                        <tr>
                          <td>{{ fecha(h.fecha_evaluacion) }}</td>
                          <td>{{ h.clasificacion }}</td>
                          <td>{{ h.puntaje }}</td>
                          <td>{{ h.es_reincidente ? 'Sí' : 'No' }}</td>
                        </tr>
                      }
                    </tbody>
                  </table>
                </div>
              }
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class ClasificacionTrabajadores {
  private trabajadoresApi = inject(TrabajadoresService);
  private administracionApi = inject(AdministracionService);

  trabajadores = signal<TrabajadorLista[]>([]);
  seleccionado = signal<TrabajadorLista | null>(null);
  clasificacion = signal<ClasificacionTrabajador | null>(null);
  historial = signal<HistorialClasificacion[]>([]);

  cargandoLista = signal(false);
  cargandoDetalle = signal(false);
  cargandoHistorial = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);

  constructor() {
    this.cargarTrabajadores();
  }

  cargarTrabajadores() {
    this.cargandoLista.set(true);
    this.error.set(null);

    this.trabajadoresApi.listarParaClasificacion().subscribe({
      next: (respuesta) => {
        this.trabajadores.set(respuesta.resultados ?? []);
        this.cargandoLista.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargandoLista.set(false);
      },
    });
  }

  seleccionar(trabajador: TrabajadorLista) {
    this.seleccionado.set(trabajador);
    this.clasificacion.set(null);
    this.historial.set([]);
    this.cargarDetalle(trabajador.id_usuario);
  }

  cargarDetalle(id: number) {
    this.cargandoDetalle.set(true);
    this.cargandoHistorial.set(true);
    this.error.set(null);

    this.administracionApi.obtenerClasificacion(id).subscribe({
      next: (datos) => {
        this.clasificacion.set(datos);
        this.cargandoDetalle.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargandoDetalle.set(false);
      },
    });

    this.cargarHistorial(id);
  }

  cargarHistorial(id: number) {
    this.administracionApi.obtenerHistorialClasificacion(id).subscribe({
      next: (datos) => {
        this.historial.set(datos);
        this.cargandoHistorial.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargandoHistorial.set(false);
      },
    });
  }

  registrarEvaluacion() {
    const trabajador = this.seleccionado();
    if (!trabajador || this.guardando()) return;

    this.guardando.set(true);
    this.error.set(null);

    this.administracionApi.registrarEvaluacion(trabajador.id_usuario).subscribe({
      next: (datos) => {
        this.clasificacion.set(datos);
        this.cargarHistorial(trabajador.id_usuario);
        this.guardando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  fecha(valor: string | Date): string {
    return new Date(valor).toLocaleString('es-BO');
  }
}
