import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { mensajeDeError } from '../../core/errores';
import { Inspeccion } from '../../core/modelos';
import { InspectorService } from '../../core/inspector.service';

// CU-10: el inspector visita al trabajador y registra el resultado y el costo del transporte.
@Component({
  selector: 'app-inspecciones',
  imports: [DatePipe, CurrencyPipe, ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Mis inspecciones</h1>

    @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (inspecciones().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">No tienes inspecciones asignadas.</div></div>
    } @else {
      <div class="row g-3">
        @for (i of inspecciones(); track i.id_inspeccion) {
          <div class="col-12 col-lg-6">
            <div class="card h-100" [class.border-success]="i.estado === 'realizada'">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-1">
                  <h2 class="h6 mb-0">{{ i.trabajador_nombre }}</h2>
                  <span [class]="'badge text-bg-' + (i.estado === 'realizada' ? 'success' : 'warning')">{{ i.estado }}</span>
                </div>
                <ul class="list-unstyled small text-muted mb-2">
                  <li>Teléfono: {{ i.trabajador_telefono }}</li>
                  <li>Carnet: {{ i.carnet_identidad }}</li>
                  <li><strong>Visita: {{ i.fecha_programada | date: 'dd/MM/yyyy HH:mm' }}</strong></li>
                </ul>

                @if (i.estado === 'realizada') {
                  <div class="small">Resultado: {{ i.resultado }}</div>
                  <div class="small">Costo de transporte: {{ i.costo_transporte | currency: 'BOB' : 'Bs ' : '1.2-2' }}</div>
                } @else if (abierta() === i.id_inspeccion) {
                  <form [formGroup]="form" (ngSubmit)="registrar(i)" novalidate>
                    <div class="mb-2">
                      <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" id="r-ok" value="realizada" formControlName="estado" />
                        <label class="form-check-label" for="r-ok">Visita realizada</label>
                      </div>
                      <div class="form-check form-check-inline">
                        <input class="form-check-input" type="radio" id="r-no" value="reprogramada" formControlName="estado" />
                        <label class="form-check-label" for="r-no">Trabajador ausente (reprogramar)</label>
                      </div>
                    </div>

                    @if (form.controls.estado.value === 'realizada') {
                      <textarea rows="3" class="form-control form-control-sm mb-2" formControlName="resultado" maxlength="500"
                                placeholder="Resultado de la visita: ¿es legítimo? ¿cuenta con herramientas y local?"></textarea>
                      <input type="number" min="0" step="0.01" class="form-control form-control-sm mb-2" style="max-width: 14rem"
                             formControlName="costo" placeholder="Costo de transporte (Bs)" />
                      <div class="form-text mb-2">Este costo lo paga el trabajador (regla de negocio).</div>
                    } @else {
                      <label class="form-label small mb-1" for="nf">Nueva fecha</label>
                      <input id="nf" type="datetime-local" class="form-control form-control-sm mb-2" formControlName="fecha" />
                    }

                    <div class="d-flex gap-2">
                      <button class="btn btn-primary btn-sm" type="submit" [disabled]="procesando()">Guardar</button>
                      <button class="btn btn-outline-secondary btn-sm" type="button" (click)="abierta.set(null)">Cancelar</button>
                    </div>
                  </form>
                } @else {
                  <button class="btn btn-primary btn-sm" type="button" (click)="abrir(i)">Registrar visita</button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Inspecciones {
  private fb = inject(FormBuilder);
  private api = inject(InspectorService);

  inspecciones = signal<Inspeccion[]>([]);
  abierta = signal<number | null>(null);
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    estado: ['realizada' as 'realizada' | 'reprogramada'],
    resultado: [''],
    costo: [null as number | null],
    fecha: [''],
  });

  constructor() {
    this.cargar();
  }

  abrir(i: Inspeccion) {
    this.form.reset({ estado: 'realizada', resultado: '', costo: null, fecha: '' });
    this.error.set(null);
    this.abierta.set(i.id_inspeccion);
  }

  registrar(i: Inspeccion) {
    const v = this.form.getRawValue();
    if (v.estado === 'realizada' && (!v.resultado.trim() || v.costo === null)) {
      this.error.set('Registra el resultado y el costo de transporte.');
      return;
    }
    if (v.estado === 'reprogramada' && !v.fecha) {
      this.error.set('Indica la nueva fecha.');
      return;
    }

    this.procesando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    this.api
      .registrarResultado(i.id_inspeccion, {
        estado: v.estado,
        ...(v.estado === 'realizada'
          ? { resultado: v.resultado.trim(), costo_transporte: v.costo! }
          : { fecha_programada: new Date(v.fecha).toISOString() }),
      })
      .subscribe({
        next: () => {
          this.mensaje.set(v.estado === 'realizada' ? 'Visita registrada: se avisó al supervisor y al trabajador.' : 'Inspección reprogramada.');
          this.procesando.set(false);
          this.abierta.set(null);
          this.cargar();
        },
        error: (e) => {
          this.error.set(mensajeDeError(e));
          this.procesando.set(false);
        },
      });
  }

  private cargar() {
    this.api.mias().subscribe({
      next: (lista) => {
        this.inspecciones.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
