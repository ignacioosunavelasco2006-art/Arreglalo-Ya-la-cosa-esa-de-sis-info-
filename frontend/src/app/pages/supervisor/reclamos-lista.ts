import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { Reclamo } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';
import { SupervisionService } from '../../core/supervision.service';
import { EstadoBadge } from '../../shared/estado-badge';

@Component({
  selector: 'app-reclamos-lista',
  imports: [RouterLink, DatePipe, FormsModule, EstadoBadge],
  template: `
    <a routerLink="/inicio" class="small">&larr; Volver al inicio</a>
    <h1 class="h3 mb-3">Reclamos</h1>

    <div class="mb-3" style="max-width: 16rem">
      <select class="form-select form-select-sm" aria-label="Filtrar por estado"
              [ngModel]="filtro()" (ngModelChange)="cambiarFiltro($event)">
        <option value="">Todos</option>
        <option value="abierto">Abiertos</option>
        <option value="en_revision">En revisión</option>
        <option value="resuelto">Resueltos</option>
        <option value="improcedente">Desestimados</option>
      </select>
    </div>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (reclamos().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">No hay reclamos.</div></div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle bg-white">
          <thead><tr><th>N.º</th><th>Cliente</th><th>Trabajo</th><th>Estado</th><th>Presentado</th><th></th></tr></thead>
          <tbody>
            @for (r of reclamos(); track r.id_reclamo) {
              <tr>
                <td>#{{ r.id_reclamo }}</td>
                <td>{{ nombre(r.id_cliente) }}</td>
                <td>#{{ r.id_trabajo }}</td>
                <td>
                  <app-estado tipo="reclamo" [valor]="r.estado" />
                  @if (r.escalado_super) { <span class="badge text-bg-danger ms-1">Escalado</span> }
                </td>
                <td>{{ r.fecha_reclamo | date: 'dd/MM/yyyy' }}</td>
                <td class="text-end">
                  <a class="btn btn-sm btn-primary" [routerLink]="['/supervisor/reclamos', r.id_reclamo]">Ver caso</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class ReclamosLista {
  private api = inject(SupervisionService);
  private admin = inject(AdminService);

  filtro = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);
  reclamos = signal<Reclamo[]>([]);
  private nombres = signal(new Map<number, string>());

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Cliente #${id}`;
  }

  cambiarFiltro(valor: string) {
    this.filtro.set(valor);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({ reclamos: this.api.reclamos(this.filtro() || undefined), usuarios: this.admin.usuarios() }).subscribe({
      next: ({ reclamos, usuarios }) => {
        this.reclamos.set(reclamos);
        this.nombres.set(mapaNombres(usuarios));
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
