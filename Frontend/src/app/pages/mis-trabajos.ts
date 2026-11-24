import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/errores';
import { ESTADOS_TRABAJO } from '../core/estados';
import { Trabajo } from '../core/modelos';
import { TrabajosService } from '../core/trabajos.service';
import { EstadoBadge } from '../shared/estado-badge';

// RF-21: historial de trabajos del usuario (como cliente y/o como trabajador), con filtro por estado.
@Component({
  selector: 'app-mis-trabajos',
  imports: [RouterLink, DatePipe, CurrencyPipe, FormsModule, EstadoBadge],
  template: `
    <h1 class="h3 mb-3">Mis trabajos</h1>

    <div class="mb-3" style="max-width: 16rem">
      <select class="form-select form-select-sm" aria-label="Filtrar por estado"
              [ngModel]="filtro()" (ngModelChange)="cambiarFiltro($event)">
        <option value="">Todos los estados</option>
        @for (e of estados; track e.valor) {
          <option [value]="e.valor">{{ e.texto }}</option>
        }
      </select>
    </div>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (trabajos().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">
        No tienes trabajos{{ filtro() ? ' con ese estado' : ' todavía' }}.
      </div></div>
    } @else {
      <div class="table-responsive">
        <table class="table table-hover align-middle bg-white">
          <thead>
            <tr>
              <th>N.º</th><th>Rol</th><th>Estado</th><th>Precio final</th>
              <th>Programado</th><th></th>
            </tr>
          </thead>
          <tbody>
            @for (t of trabajos(); track t.id_trabajo) {
              <tr>
                <td>#{{ t.id_trabajo }}</td>
                <td>{{ rolEn(t) }}</td>
                <td><app-estado tipo="trabajo" [valor]="t.estado" /></td>
                <td>{{ t.precio_final | currency: 'BOB' : 'Bs ' : '1.2-2' }}</td>
                <td>{{ t.fecha_inicio_prog ? (t.fecha_inicio_prog | date: 'dd/MM/yyyy HH:mm') : '—' }}</td>
                <td class="text-end">
                  <a class="btn btn-sm btn-outline-primary" [routerLink]="['/trabajos', t.id_trabajo]">Ver</a>
                </td>
              </tr>
            }
          </tbody>
        </table>
      </div>
    }
  `,
})
export class MisTrabajos {
  private api = inject(TrabajosService);
  private auth = inject(AuthService);

  estados = ESTADOS_TRABAJO;
  filtro = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);
  trabajos = signal<Trabajo[]>([]);

  constructor() {
    this.cargar();
  }

  // Una misma persona puede ser cliente en unos trabajos y trabajador en otros
  rolEn(t: Trabajo): string {
    return t.id_cliente === this.auth.usuario()?.id_usuario ? 'Cliente' : 'Trabajador';
  }

  cambiarFiltro(valor: string) {
    this.filtro.set(valor);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    this.api.misTrabajos(this.filtro() || undefined).subscribe({
      next: (lista) => {
        this.trabajos.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
