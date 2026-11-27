import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { mensajeDeError } from '../../core/errores';
import { Devolucion, Reclamo } from '../../core/modelos';
import { ReclamosService } from '../../core/reclamos.service';
import { EstadoBadge } from '../../shared/estado-badge';

@Component({
  selector: 'app-mis-reclamos',
  imports: [RouterLink, DatePipe, CurrencyPipe, EstadoBadge],
  template: `
  <div class="page-heading">
    <a routerLink="/inicio" class="small">&larr; Volver al inicio</a>
    <h1 class="h3 mb-3">Mis reclamos y devoluciones</h1>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else {
      <h2 class="h5">Reclamos</h2>
      @for (r of reclamos(); track r.id_reclamo) {
        <div class="card mb-2"><div class="card-body py-2 d-flex justify-content-between align-items-center">
          <div>
            <strong>Reclamo #{{ r.id_reclamo }}</strong>
            <span class="small text-muted ms-2">Trabajo #{{ r.id_trabajo }} · {{ r.fecha_reclamo | date: 'dd/MM/yyyy' }}</span>
            <div class="small">{{ r.descripcion }}</div>
          </div>
          <div class="text-end">
            <app-estado tipo="reclamo" [valor]="r.estado" />
            <div><a class="small" [routerLink]="['/reclamos', r.id_reclamo]">Ver</a></div>
          </div>
        </div></div>
      } @empty {
        <div class="card mb-3"><div class="card-body text-center text-muted">
          No presentaste reclamos. Si un trabajo terminado tuvo problemas, puedes reclamar desde su pantalla.
        </div></div>
      }

      <h2 class="h5 mt-4">Devoluciones</h2>
      @for (d of devoluciones(); track d.id_devolucion) {
        <div class="card mb-2"><div class="card-body py-2">
          <div class="d-flex justify-content-between">
            <strong>{{ d.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>
            <span [class]="'badge text-bg-' + color(d.estado)">{{ texto(d.estado) }}</span>
          </div>
          <div class="small">{{ d.motivo }}</div>
          <div class="small text-muted">
            Trabajo #{{ d.id_trabajo }} · {{ d.fecha_solicitud | date: 'dd/MM/yyyy' }}
            @if (d.motivo_rechazo) { · Rechazada: {{ d.motivo_rechazo }} }
          </div>
        </div></div>
      } @empty {
        <div class="card"><div class="card-body text-center text-muted">No tienes devoluciones.</div></div>
      }
    }
  </div>
  `,
})
export class MisReclamos {
  private api = inject(ReclamosService);

  reclamos = signal<Reclamo[]>([]);
  devoluciones = signal<Devolucion[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  constructor() {
    forkJoin({ reclamos: this.api.mios(), devoluciones: this.api.misDevoluciones() }).subscribe({
      next: ({ reclamos, devoluciones }) => {
        this.reclamos.set(reclamos);
        this.devoluciones.set(devoluciones);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  color(estado: string) {
    const colores: Record<string, string> = { solicitada: 'warning', aprobada: 'info', procesada: 'success', rechazada: 'secondary' };
    return colores[estado] ?? 'secondary';
  }

  texto(estado: string) {
    const textos: Record<string, string> = {
      solicitada: 'En revisión',
      aprobada: 'Aprobada: se devolverá en 3 días',
      procesada: 'Devuelta',
      rechazada: 'Rechazada',
    };
    return textos[estado] ?? estado;
  }
}
