import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../core/errores';
import { ReclamoContraMi } from '../../core/modelos';
import { ReclamosService } from '../../core/reclamos.service';
import { EstadoBadge } from '../../shared/estado-badge';

// El trabajador ve los reclamos presentados sobre sus trabajos (sin datos del cliente).
@Component({
  selector: 'app-reclamos-trabajador',
  imports: [DatePipe, RouterLink, EstadoBadge],
  template: `'
    <a routerLink="/inicio" class="small">&larr; Volver al inicio</a>
    <h1 class="h3 mb-3">Reclamos sobre mis trabajos</h1>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (reclamos().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">No tienes reclamos. ¡Buen trabajo!</div></div>
    } @else {
      @for (r of reclamos(); track r.id_reclamo) {
        <div class="card mb-3"><div class="card-body">
          <div class="d-flex justify-content-between align-items-start">
            <div>
              <strong>Reclamo #{{ r.id_reclamo }}</strong>
              <a class="small ms-2" [routerLink]="['/trabajos', r.id_trabajo]">Trabajo #{{ r.id_trabajo }}</a>
            </div>
            <app-estado tipo="reclamo" [valor]="r.estado" />
          </div>
          <p class="mt-2 mb-1">{{ r.descripcion }}</p>
          <div class="small text-muted">Presentado el {{ r.fecha_reclamo | date: 'dd/MM/yyyy' }}</div>
          @if (r.resolucion) {
            <div class="alert alert-light border small mt-2 mb-0"><strong>Resolución:</strong> {{ r.resolucion }}</div>
          }
        </div></div>
      }
    }
  `,
})
export class ReclamosTrabajador {
  private api = inject(ReclamosService);

  reclamos = signal<ReclamoContraMi[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  constructor() {
    this.api.contraMi().subscribe({
      next: (lista) => {
        this.reclamos.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
