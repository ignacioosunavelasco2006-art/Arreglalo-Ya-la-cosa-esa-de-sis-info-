import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { PerfilEnCola } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';
import { SupervisionService } from '../../core/supervision.service';
import { EstadoBadge } from '../../shared/estado-badge';

// RF-09 / CU-09: cola de revisión de trabajadores. Por defecto: pendientes y observados.
@Component({
  selector: 'app-trabajadores-cola',
  imports: [RouterLink, DatePipe, FormsModule, EstadoBadge],
  template: `
    <h1 class="h3 mb-3">Revisión de trabajadores</h1>

    <div class="mb-3" style="max-width: 18rem">
      <select class="form-select form-select-sm" aria-label="Filtrar por estado"
              [ngModel]="filtro()" (ngModelChange)="cambiarFiltro($event)">
        <option value="">Pendientes y con observaciones</option>
        <option value="pendiente">Solo pendientes</option>
        <option value="observado">Solo con observaciones</option>
        <option value="aprobado">Aprobados</option>
        <option value="rechazado">Rechazados</option>
      </select>
    </div>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (perfiles().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">No hay perfiles en esta lista.</div></div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle bg-white">
          <thead><tr><th>Trabajador</th><th>Carnet</th><th>Experiencia</th><th>Estado</th><th>Creado</th><th></th></tr></thead>
          <tbody>
            @for (p of perfiles(); track p.id_usuario) {
              <tr>
                <td>{{ nombre(p.id_usuario) }}</td>
                <td>{{ p.carnet_identidad }}</td>
                <td>{{ p.anios_experiencia }} año(s)</td>
                <td><app-estado tipo="verificacion" [valor]="p.estado_verificacion" /></td>
                <td>{{ p.fecha_creacion | date: 'dd/MM/yyyy' }}</td>
                <td class="text-end">
                  <a class="btn btn-sm btn-primary" [routerLink]="['/supervisor/trabajadores', p.id_usuario]">Revisar</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class TrabajadoresCola {
  private api = inject(SupervisionService);
  private admin = inject(AdminService);

  filtro = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);
  perfiles = signal<PerfilEnCola[]>([]);
  private nombres = signal(new Map<number, string>());

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Trabajador #${id}`;
  }

  cambiarFiltro(valor: string) {
    this.filtro.set(valor);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      perfiles: this.api.cola(this.filtro() || undefined),
      usuarios: this.admin.usuarios('trabajador'),
    }).subscribe({
      next: ({ perfiles, usuarios }) => {
        this.perfiles.set(perfiles);
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
