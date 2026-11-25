import { Component, inject, signal } from '@angular/core';
import { forkJoin } from 'rxjs';

import { CatalogosService } from '../core/catalogos.service';
import { mensajeDeError } from '../core/errores';
import { Categoria, Zona } from '../core/modelos';

// Primer ejemplo de "pedir datos al backend y mostrarlos".
// Patrón que se repite en casi todas las pantallas:
//   1) señales para: cargando, error y los datos
//   2) al crearse el componente, llamar al servicio y llenar las señales
//   3) en el HTML, @if / @for según el estado
@Component({
  selector: 'app-catalogos',
  template: `
    <h1 class="h3 mb-3">Servicios y zonas disponibles</h1>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    } @else {
      <div class="row g-4">
        <div class="col-12 col-md-6">
          <h2 class="h5">Categorías de servicio</h2>
          <ul class="list-group">
            @for (c of categorias(); track c.id_categoria) {
              <li class="list-group-item">{{ c.nombre }}</li>
            } @empty {
              <li class="list-group-item text-muted">Aún no hay categorías.</li>
            }
          </ul>
        </div>

        <div class="col-12 col-md-6">
          <h2 class="h5">Zonas / OTB</h2>
          <ul class="list-group">
            @for (z of zonas(); track z.id_zona) {
              <li class="list-group-item">{{ z.nombre }}</li>
            } @empty {
              <li class="list-group-item text-muted">Aún no hay zonas.</li>
            }
          </ul>
        </div>
      </div>
    }
  `,
})
export class Catalogos {
  private api = inject(CatalogosService);

  cargando = signal(true);
  error = signal<string | null>(null);
  categorias = signal<Categoria[]>([]);
  zonas = signal<Zona[]>([]);

  constructor() {
    // forkJoin espera a que terminen las dos peticiones
    forkJoin({ categorias: this.api.categorias(), zonas: this.api.zonas() }).subscribe({
      next: ({ categorias, zonas }) => {
        this.categorias.set(categorias);
        this.zonas.set(zonas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
