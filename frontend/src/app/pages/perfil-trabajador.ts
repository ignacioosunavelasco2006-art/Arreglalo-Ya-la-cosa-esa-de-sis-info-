import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { mensajeDeError } from '../core/errores';
import { PerfilPublico } from '../core/modelos';
import { TrabajadoresService } from '../core/trabajadores.service';

// RF-06 / CU-06: perfil público del trabajador (sin carnet ni documentos).
@Component({
  selector: 'app-perfil-trabajador',
  imports: [DatePipe, CurrencyPipe],
  template: `
    <button class="btn btn-link btn-sm p-0 mb-2" type="button" (click)="volver()">&larr; Volver</button>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else if (perfil(); as p) {
      <div class="card shadow-sm mb-4">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between align-items-start gap-2">
            <div>
              <h1 class="h3 mb-1">{{ p.nombres }} {{ p.apellidos }}</h1>
              <div class="mb-2">
                @if (p.etiqueta === 'nuevo') {
                  <span class="badge text-bg-info">Nuevo</span>
                } @else {
                  <span class="fw-bold">★ {{ p.calificacion_promedio }}</span>
                  <span class="text-muted">({{ p.total_calificaciones }} calificaciones)</span>
                }
              </div>
            </div>
            <span [class]="'badge text-bg-' + (p.disponible ? 'success' : 'secondary')">
              {{ p.disponible ? 'Disponible' : 'No disponible' }}
            </span>
          </div>

          @if (p.descripcion) { <p>{{ p.descripcion }}</p> }

          <ul class="list-unstyled small text-muted mb-0">
            <li>{{ p.anios_experiencia }} año(s) de experiencia</li>
            <li>{{ p.trabajos_completados }} trabajo(s) completado(s)</li>
          </ul>
        </div>
      </div>

      <div class="row g-4">
        <div class="col-12 col-md-6">
          <h2 class="h5">Servicios que ofrece</h2>
          <ul class="list-group">
            @for (c of p.categorias; track c.id_categoria) {
              <li class="list-group-item d-flex justify-content-between">
                {{ c.nombre }}
                @if (c.precio_estimado) {
                  <span class="text-muted small">desde {{ c.precio_estimado | currency: 'BOB' : 'Bs ' : '1.2-2' }}</span>
                }
              </li>
            } @empty {
              <li class="list-group-item text-muted">Sin servicios registrados.</li>
            }
          </ul>

          <h2 class="h5 mt-4">Zonas de cobertura</h2>
          <ul class="list-group">
            @for (z of p.zonas; track z.id_zona) {
              <li class="list-group-item">{{ z.nombre }}</li>
            } @empty {
              <li class="list-group-item text-muted">Sin zonas registradas.</li>
            }
          </ul>
        </div>

        <div class="col-12 col-md-6">
          <h2 class="h5">Comentarios de clientes</h2>
          @for (c of p.comentarios; track $index) {
            <div class="card mb-2"><div class="card-body py-2">
              <div class="d-flex justify-content-between">
                <strong>{{ '★'.repeat(c.puntaje) }}<span class="text-muted">{{ '★'.repeat(5 - c.puntaje) }}</span></strong>
                <span class="small text-muted">{{ c.fecha | date: 'dd/MM/yyyy' }}</span>
              </div>
              <p class="mb-1 small">{{ c.comentario }}</p>
              @if (c.respuesta_trabajador) {
                <div class="small border-start ps-2 text-muted">
                  <strong>Respuesta del trabajador:</strong> {{ c.respuesta_trabajador }}
                </div>
              }
            </div></div>
          } @empty {
            <div class="text-muted">Todavía no tiene comentarios.</div>
          }
        </div>
      </div>
    }
  `,
})
export class PerfilTrabajador {
  private ruta = inject(ActivatedRoute);
  private api = inject(TrabajadoresService);

  perfil = signal<PerfilPublico | null>(null);
  cargando = signal(true);
  error = signal<string | null>(null);

  constructor() {
    const id = Number(this.ruta.snapshot.paramMap.get('id'));
    this.api.perfil(id).subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  volver() {
    history.back();
  }
}
