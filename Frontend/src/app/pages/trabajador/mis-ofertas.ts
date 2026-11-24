import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { mensajeDeError } from '../../core/errores';
import { OfertaPropia, Trabajo } from '../../core/modelos';
import { SolicitudesService } from '../../core/solicitudes.service';
import { TrabajosService } from '../../core/trabajos.service';
import { EstadoBadge } from '../../shared/estado-badge';
import { VisitasTrabajador } from './visitas-trabajador';

@Component({
  selector: 'app-mis-ofertas',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge, VisitasTrabajador],
  template: `
    <h1 class="h3 mb-3">Mis ofertas</h1>

    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (ofertas().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">
        Aún no enviaste ofertas.
        <a routerLink="/oportunidades">Ver solicitudes disponibles</a>
      </div></div>
    } @else {
      <div class="row g-3">
        @for (o of ofertas(); track o.id_oferta) {
          <div class="col-12 col-lg-6">
            <div class="card h-100" [class.border-success]="o.estado === 'aceptada'">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <a [routerLink]="['/oportunidades', o.id_solicitud]" class="fw-bold">Solicitud #{{ o.id_solicitud }}</a>
                  <app-estado tipo="oferta" [valor]="o.estado" />
                </div>

                <div class="h5 mb-1">{{ o.precio_estimado | currency: 'BOB' : 'Bs ' : '1.2-2' }}</div>
                @if (o.comentario) { <p class="small mb-1">{{ o.comentario }}</p> }
                <div class="small text-muted mb-2">
                  Enviada el {{ o.fecha_envio | date: 'dd/MM/yyyy HH:mm' }}
                  @if (o.requiere_visita) { · <span class="badge text-bg-warning">Requiere visita previa</span> }
                </div>

                @if (o.estado === 'aceptada' && trabajoDe(o); as t) {
                  <a class="btn btn-success btn-sm" [routerLink]="['/trabajos', t.id_trabajo]">Ver el trabajo #{{ t.id_trabajo }}</a>
                }

                @if (o.estado === 'pendiente') {
                  @if (o.requiere_visita) {
                    <app-visitas-trabajador [idOferta]="o.id_oferta" />
                  }

                  @if (editando() === o.id_oferta) {
                    <form class="d-flex flex-wrap gap-2 mt-2" [formGroup]="formPrecio" (ngSubmit)="guardarPrecio(o)" novalidate>
                      <input type="number" min="1" step="0.01" class="form-control form-control-sm w-auto"
                             formControlName="precio" aria-label="Nuevo precio"
                             [class.is-invalid]="formPrecio.controls.precio.touched && formPrecio.controls.precio.invalid" />
                      <button class="btn btn-primary btn-sm" type="submit" [disabled]="procesando()">Guardar</button>
                      <button class="btn btn-outline-secondary btn-sm" type="button" (click)="editando.set(null)">Cancelar</button>
                    </form>
                  } @else {
                    <button class="btn btn-outline-primary btn-sm mt-2" type="button" (click)="editar(o)">Cambiar precio</button>
                  }
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class MisOfertas {
  private fb = inject(FormBuilder);
  private api = inject(SolicitudesService);
  private trabajosApi = inject(TrabajosService);

  ofertas = signal<OfertaPropia[]>([]);
  private trabajos = signal<Trabajo[]>([]);
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  editando = signal<number | null>(null);

  formPrecio = this.fb.nonNullable.group({
    precio: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  constructor() {
    this.cargar();
  }

  // Enlaza una oferta aceptada con el trabajo que nació de ella
  trabajoDe(oferta: OfertaPropia): Trabajo | undefined {
    return this.trabajos().find((t) => t.id_oferta === oferta.id_oferta);
  }

  editar(oferta: OfertaPropia) {
    this.formPrecio.reset({ precio: oferta.precio_estimado });
    this.editando.set(oferta.id_oferta);
  }

  guardarPrecio(oferta: OfertaPropia) {
    if (this.formPrecio.invalid) {
      this.formPrecio.markAllAsTouched();
      return;
    }
    this.procesando.set(true);
    this.error.set(null);
    this.api.actualizarOferta(oferta.id_oferta, { precio_estimado: this.formPrecio.getRawValue().precio! }).subscribe({
      next: () => {
        this.procesando.set(false);
        this.editando.set(null);
        this.cargar();
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.procesando.set(false);
      },
    });
  }

  private cargar() {
    forkJoin({ ofertas: this.api.misOfertas(), trabajos: this.trabajosApi.misTrabajos() }).subscribe({
      next: ({ ofertas, trabajos }) => {
        this.ofertas.set(ofertas);
        this.trabajos.set(trabajos);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
