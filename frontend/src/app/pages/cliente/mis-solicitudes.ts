import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { ESTADOS_SOLICITUD } from '../../core/estados';
import { Categoria, Solicitud, Zona } from '../../core/modelos';
import { SolicitudesService } from '../../core/solicitudes.service';
import { EstadoBadge } from '../../shared/estado-badge';

@Component({
  selector: 'app-mis-solicitudes',
  imports: [RouterLink, DatePipe, CurrencyPipe, FormsModule, EstadoBadge],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-3">
      <h1 class="h3 mb-0">Mis solicitudes</h1>
      <a class="btn btn-primary" routerLink="/solicitudes/nueva">Publicar solicitud</a>
    </div>

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
    } @else if (solicitudes().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">
        No tienes solicitudes{{ filtro() ? ' con ese estado' : '' }}.
      </div></div>
    } @else {
      <div class="row g-3">
        @for (s of solicitudes(); track s.id_solicitud) {
          <div class="col-12 col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h2 class="h6 mb-0">{{ nombreCategoria(s.id_categoria) }}</h2>
                  <app-estado tipo="solicitud" [valor]="s.estado" />
                </div>
                <p class="small mb-2">{{ s.descripcion }}</p>
                <ul class="list-unstyled small text-muted mb-3">
                  <li>Zona: {{ nombreZona(s.id_zona) }}</li>
                  <li>Fecha deseada: {{ s.fecha_deseada | date: 'dd/MM/yyyy HH:mm' }}</li>
                  @if (s.presupuesto_aproximado) {
                    <li>Presupuesto: {{ s.presupuesto_aproximado | currency: 'BOB' : 'Bs ' : '1.2-2' }}</li>
                  }
                  @if (s.estado === 'abierta') {
                    <li>Vence: {{ s.fecha_vencimiento | date: 'dd/MM/yyyy' }}</li>
                  }
                </ul>
                <a class="btn btn-sm btn-outline-primary" [routerLink]="['/solicitudes', s.id_solicitud]">
                  Ver detalle y ofertas
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class MisSolicitudes {
  private api = inject(SolicitudesService);
  private catalogos = inject(CatalogosService);

  estados = ESTADOS_SOLICITUD;
  filtro = signal('');
  cargando = signal(true);
  error = signal<string | null>(null);
  solicitudes = signal<Solicitud[]>([]);

  private categorias = signal<Categoria[]>([]);
  private zonas = signal<Zona[]>([]);
  private nombresCategoria = computed(() => new Map(this.categorias().map((c) => [c.id_categoria, c.nombre])));
  private nombresZona = computed(() => new Map(this.zonas().map((z) => [z.id_zona, z.nombre])));

  constructor() {
    this.cargar();
  }

  nombreCategoria(id: number) {
    return this.nombresCategoria().get(id) ?? `Categoría #${id}`;
  }

  nombreZona(id: number) {
    return this.nombresZona().get(id) ?? `Zona #${id}`;
  }

  cambiarFiltro(valor: string) {
    this.filtro.set(valor);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      solicitudes: this.api.mias(this.filtro() || undefined),
      catalogo: this.catalogos.todo(),
    }).subscribe({
      next: ({ solicitudes, catalogo }) => {
        this.solicitudes.set(solicitudes);
        this.categorias.set(catalogo.categorias);
        this.zonas.set(catalogo.zonas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
