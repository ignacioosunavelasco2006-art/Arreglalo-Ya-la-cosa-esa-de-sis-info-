import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { Categoria, SolicitudDisponible, Zona } from '../../core/modelos';
import { SolicitudesService } from '../../core/solicitudes.service';

// RF-05 / RF-12: el trabajador solo ve solicitudes de SUS categorías y zonas, y solo si su perfil fue aprobado.
@Component({
  selector: 'app-oportunidades',
  imports: [RouterLink, DatePipe, CurrencyPipe, FormsModule],
  template: `
    <h1 class="h3 mb-3">Solicitudes disponibles</h1>

    <div class="row g-2 mb-3" style="max-width: 36rem">
      <div class="col-6">
        <select class="form-select form-select-sm" aria-label="Filtrar por servicio"
                [ngModel]="categoria()" (ngModelChange)="cambiarFiltro('categoria', $event)">
          <option [ngValue]="0">Todos mis servicios</option>
          @for (c of categorias(); track c.id_categoria) {
            <option [ngValue]="c.id_categoria">{{ c.nombre }}</option>
          }
        </select>
      </div>
      <div class="col-6">
        <select class="form-select form-select-sm" aria-label="Filtrar por zona"
                [ngModel]="zona()" (ngModelChange)="cambiarFiltro('zona', $event)">
          <option [ngValue]="0">Todas mis zonas</option>
          @for (z of zonas(); track z.id_zona) {
            <option [ngValue]="z.id_zona">{{ z.nombre }}</option>
          }
        </select>
      </div>
    </div>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-warning">
        {{ error() }}
        <a routerLink="/mi-perfil" class="alert-link">Ir a mi perfil</a>
      </div>
    } @else if (solicitudes().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">
        No hay solicitudes abiertas para tus servicios y zonas por ahora. Te avisaremos cuando llegue una.
      </div></div>
    } @else {
      <div class="row g-3">
        @for (s of solicitudes(); track s.id_solicitud) {
          <div class="col-12 col-md-6">
            <div class="card h-100">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <h2 class="h6 mb-0">{{ nombreCategoria(s.id_categoria) }}</h2>
                  @if (s.ya_oferte) { <span class="badge text-bg-success">Ya ofertaste</span> }
                </div>
                <p class="small mb-2">{{ s.descripcion }}</p>
                <ul class="list-unstyled small text-muted mb-3">
                  <li>Zona: {{ nombreZona(s.id_zona) }}</li>
                  <li>Fecha deseada: {{ s.fecha_deseada | date: 'dd/MM/yyyy HH:mm' }}</li>
                  @if (s.presupuesto_aproximado) {
                    <li>Presupuesto del cliente: {{ s.presupuesto_aproximado | currency: 'BOB' : 'Bs ' : '1.2-2' }}</li>
                  }
                  <li>Vence: {{ s.fecha_vencimiento | date: 'dd/MM/yyyy' }}</li>
                </ul>
                <a class="btn btn-sm btn-outline-primary" [routerLink]="['/oportunidades', s.id_solicitud]">
                  {{ s.ya_oferte ? 'Ver' : 'Ver y ofertar' }}
                </a>
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Oportunidades {
  private api = inject(SolicitudesService);
  private catalogos = inject(CatalogosService);

  categoria = signal(0);
  zona = signal(0);
  cargando = signal(true);
  error = signal<string | null>(null);
  solicitudes = signal<SolicitudDisponible[]>([]);

  categorias = signal<Categoria[]>([]);
  zonas = signal<Zona[]>([]);
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

  cambiarFiltro(cual: 'categoria' | 'zona', valor: number) {
    (cual === 'categoria' ? this.categoria : this.zona).set(valor);
    this.cargar();
  }

  private cargar() {
    this.cargando.set(true);
    this.error.set(null);
    forkJoin({
      lista: this.api.disponibles({ id_categoria: this.categoria(), id_zona: this.zona() }),
      catalogo: this.catalogos.todo(),
    }).subscribe({
      next: ({ lista, catalogo }) => {
        this.solicitudes.set(lista);
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
