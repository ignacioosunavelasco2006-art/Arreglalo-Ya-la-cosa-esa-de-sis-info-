
import { Component, inject, signal } from '@angular/core';
import { HttpErrorResponse } from '@angular/common/http';

import { TrabajadoresService } from '../../core/trabajadores.service';
import {
  PerfilRevision,
  PerfilRevisionDetalle,
} from '../../core/modelos';
import { mensajeDeError } from '../../core/errores';

type EstadoRevision = 'aprobado' | 'observado' | 'rechazado';

@Component({
  selector: 'app-revision-trabajadores',
  template: `
    <h1 class="h3 mb-2">Revisión de trabajadores</h1>
    <p class="text-muted">
      Revisa los perfiles y documentos antes de habilitar a los trabajadores.
    </p>

    @if (mensaje()) {
      <div class="alert alert-success">{{ mensaje() }}</div>
    }

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }

    <div class="row g-3">

      <!-- LISTA DE TRABAJADORES -->
      <div class="col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <div class="d-flex justify-content-between align-items-center mb-3">
              <h2 class="h5 mb-0">Pendientes de revisión</h2>
              <button
                class="btn btn-outline-primary btn-sm"
                (click)="cargar()"
                [disabled]="cargando()">
                Actualizar
              </button>
            </div>

            @if (cargando()) {
              <p class="text-muted">Cargando trabajadores...</p>
            } @else if (perfiles().length === 0) {
              <div class="alert alert-info">
                No hay trabajadores pendientes de revisión.
              </div>
            } @else {
              @for (p of perfiles(); track p.id_usuario) {
                <button
                  type="button"
                  class="list-group-item list-group-item-action w-100 text-start mb-2 rounded border"
                  [class.active]="seleccionado()?.id_usuario === p.id_usuario"
                  (click)="abrir(p)">

                  <strong>Trabajador #{{ p.id_usuario }}</strong>

                  <div class="small mt-1">
                    Estado:
                    {{ p.estado_verificacion }}
                  </div>

                  <div class="small opacity-75">
                    {{ p.anios_experiencia }} años de experiencia
                  </div>
                </button>
              }
            }
          </div>
        </div>
      </div>

      <!-- DETALLE DEL TRABAJADOR -->
      <div class="col-lg-7">
        <div class="card shadow-sm">
          <div class="card-body">

            @if (cargandoDetalle()) {
              <p class="text-muted">Cargando perfil...</p>
            } @else if (detalle(); as p) {

              <h2 class="h5 mb-3">
                Detalle del trabajador #{{ p.id_usuario }}
              </h2>

              <hr>

              <h3 class="h6">Información del perfil</h3>

              <p><strong>Carnet:</strong> {{ p.carnet_identidad }}</p>
              <p><strong>Experiencia:</strong> {{ p.anios_experiencia }} años</p>
              <p><strong>Descripción:</strong> {{ p.descripcion || 'Sin descripción' }}</p>
              <p>
                <strong>Estado:</strong>
                <span class="badge bg-secondary">
                  {{ p.estado_verificacion }}
                </span>
              </p>

              <hr>

              <h3 class="h6">Servicios</h3>
              @if (p.categorias.length) {
                <ul>
                  @for (c of p.categorias; track c.id_categoria) {
                    <li>{{ c.nombre }} - {{ c.precio_estimado ?? 'Sin precio' }}</li>
                  }
                </ul>
              } @else {
                <p class="text-muted">No registró servicios.</p>
              }

              <hr>

              <h3 class="h6">Zonas de cobertura</h3>
              @if (p.zonas.length) {
                <ul>
                  @for (z of p.zonas; track z.id_zona) {
                    <li>{{ z.nombre }}</li>
                  }
                </ul>
              } @else {
                <p class="text-muted">No registró zonas.</p>
              }

              <hr>

              <h3 class="h6">Documentos</h3>
              @if (p.documentos.length) {
                @for (d of p.documentos; track d.id_documento) {
                  <div class="border rounded p-2 mb-2">
                    <strong>{{ d.tipo }}</strong>
                    <div class="small text-muted">
                      Archivo: {{ d.ruta_archivo }}
                    </div>
                  </div>
                }
              } @else {
                <p class="text-danger">No presentó documentos.</p>
              }

              <hr>

              <h3 class="h6">Datos bancarios</h3>
              @if (p.tiene_datos_bancarios) {
                <span class="badge bg-success">Registrados</span>
              } @else {
                <span class="badge bg-danger">Pendientes</span>
              }

              <hr>

              <h3 class="h6">Decisión del supervisor</h3>

              <label class="form-label" for="motivo">
                Motivo (obligatorio para observar o rechazar)
              </label>

              <textarea
                #motivo
                id="motivo"
                class="form-control mb-3"
                rows="3"
                maxlength="300"
                placeholder="Escribe las observaciones...">
              </textarea>

              <div class="d-flex flex-wrap gap-2">
                <button
                  class="btn btn-success"
                  [disabled]="guardando()"
                  (click)="resolver('aprobado')">
                  Aprobar
                </button>

                <button
                  class="btn btn-warning"
                  [disabled]="guardando()"
                  (click)="resolver('observado', motivo.value)">
                  Observar
                </button>

                <button
                  class="btn btn-danger"
                  [disabled]="guardando()"
                  (click)="resolver('rechazado', motivo.value)">
                  Rechazar
                </button>
              </div>

              @if (guardando()) {
                <p class="text-muted mt-3">Guardando decisión...</p>
              }

            } @else {
              <div class="text-muted text-center py-5">
                Selecciona un trabajador para revisar su perfil.
              </div>
            }

          </div>
        </div>
      </div>

    </div>
  `,
})
export class RevisionTrabajadores {
  private api = inject(TrabajadoresService);

  perfiles = signal<PerfilRevision[]>([]);
  detalle = signal<PerfilRevisionDetalle | null>(null);

  seleccionado = signal<PerfilRevision | null>(null);

  cargando = signal(false);
  cargandoDetalle = signal(false);
  guardando = signal(false);

  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);

    this.api.colaRevision().subscribe({
      next: (datos) => {
        this.perfiles.set(datos);
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  abrir(p: PerfilRevision) {
    this.seleccionado.set(p);
    this.detalle.set(null);
    this.cargandoDetalle.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    this.api.detalleRevision(p.id_usuario).subscribe({
      next: (datos) => {
        this.detalle.set(datos);
        this.cargandoDetalle.set(false);
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.cargandoDetalle.set(false);
      },
    });
  }

  resolver(estado: EstadoRevision, motivo = '') {
    const p = this.seleccionado();

    if (!p || this.guardando()) return;

    if (estado !== 'aprobado' && !motivo.trim()) {
      this.error.set('Debes escribir un motivo para observar o rechazar.');
      return;
    }

    if (estado === 'aprobado') {
      const d = this.detalle();

      if (
        d &&
        (!d.tiene_datos_bancarios ||
          !d.documentos.some(x => x.tipo === 'carnet') ||
          !d.documentos.some(x => x.tipo === 'antecedentes'))
      ) {
        this.error.set(
          'No se puede aprobar: debe registrar datos bancarios, carnet y antecedentes.',
        );
        return;
      }
    }

    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);

    this.api.revisar(p.id_usuario, estado, motivo.trim()).subscribe({
      next: () => {
        this.mensaje.set(`Perfil ${estado} correctamente.`);
        this.guardando.set(false);
        this.detalle.set(null);
        this.seleccionado.set(null);
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }
}
