
import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { Categoria, Zona } from '../../core/modelos';

@Component({
  selector: 'app-catalogos-admin',
  imports: [FormsModule],
  template: `
    <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-4">
      <div>
        <h1 class="h3 mb-1">Administración de categorías y zonas</h1>
        <p class="text-muted mb-0">Gestiona los servicios y las zonas disponibles.</p>
      </div>
      <button class="btn btn-outline-secondary" (click)="cargar()">Actualizar listas</button>
    </div>

    @if (error()) {
      <div class="alert alert-danger">{{ error() }}</div>
    }
    @if (mensaje()) {
      <div class="alert alert-success">{{ mensaje() }}</div>
    }

    <div class="btn-group mb-4" role="group" aria-label="Sección">
      <button class="btn"
        [class.btn-primary]="pestana() === 'categorias'"
        [class.btn-outline-primary]="pestana() !== 'categorias'"
        (click)="pestana.set('categorias')">
        Categorías
      </button>
      <button class="btn"
        [class.btn-primary]="pestana() === 'zonas'"
        [class.btn-outline-primary]="pestana() !== 'zonas'"
        (click)="pestana.set('zonas')">
        Zonas
      </button>
    </div>

    @if (cargando()) {
      <p class="text-muted">Cargando información...</p>
    } @else if (pestana() === 'categorias') {
      <section class="card">
        <div class="card-body">
          <h2 class="h5 mb-3">Categorías de servicio</h2>

          <form class="row g-2 mb-4" (ngSubmit)="guardarCategoria()">
            <div class="col-12 col-md">
              <label for="nombreCategoria" class="form-label">
                {{ categoriaEditando() ? 'Editar categoría' : 'Nueva categoría' }}
              </label>
              <input
                id="nombreCategoria"
                class="form-control"
                name="nombreCategoria"
                [(ngModel)]="nombreCategoria"
                minlength="2"
                maxlength="60"
                required
                placeholder="Ej. Plomería"
              />
            </div>
            <div class="col-12 col-md-auto d-flex align-items-end gap-2">
              <button class="btn btn-primary" type="submit" [disabled]="guardando()">
                {{ guardando() ? 'Guardando...' : categoriaEditando() ? 'Guardar cambios' : 'Agregar categoría' }}
              </button>
              @if (categoriaEditando()) {
                <button class="btn btn-outline-secondary" type="button" (click)="cancelarEdicion()">
                  Cancelar
                </button>
              }
            </div>
          </form>

          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Categoría</th>
                  <th>Estado</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (c of categorias(); track c.id_categoria) {
                  <tr>
                    <td>{{ c.nombre }}</td>
                    <td>
                      @if (c.activa) {
                        <span class="badge text-bg-success">Activa</span>
                      } @else {
                        <span class="badge text-bg-secondary">Inactiva</span>
                      }
                    </td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary me-2"
                        (click)="editarCategoria(c)">
                        Editar
                      </button>
                      @if (c.activa) {
                        <button class="btn btn-sm btn-outline-danger"
                          (click)="cambiarEstadoCategoria(c, false)">
                          Desactivar
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-outline-success"
                          (click)="cambiarEstadoCategoria(c, true)">
                          Activar
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="3" class="text-center text-muted">No hay categorías registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    } @else {
      <section class="card">
        <div class="card-body">
          <h2 class="h5 mb-3">Zonas de cobertura</h2>

          <form class="row g-2 mb-4" (ngSubmit)="guardarZona()">
            <div class="col-12 col-md">
              <label for="nombreZona" class="form-label">
                {{ zonaEditando() ? 'Editar zona' : 'Nueva zona' }}
              </label>
              <input
                id="nombreZona"
                class="form-control"
                name="nombreZona"
                [(ngModel)]="nombreZona"
                minlength="2"
                maxlength="100"
                required
                placeholder="Ej. Cala Cala"
              />
            </div>
            <div class="col-12 col-md-auto d-flex align-items-end gap-2">
              <button class="btn btn-primary" type="submit" [disabled]="guardando()">
                {{ guardando() ? 'Guardando...' : zonaEditando() ? 'Guardar cambios' : 'Agregar zona' }}
              </button>
              @if (zonaEditando()) {
                <button class="btn btn-outline-secondary" type="button" (click)="cancelarEdicion()">
                  Cancelar
                </button>
              }
            </div>
          </form>

          <div class="table-responsive">
            <table class="table table-hover align-middle">
              <thead>
                <tr>
                  <th>Zona</th>
                  <th>Trabajadores asignados</th>
                  <th>Estado</th>
                  <th class="text-end">Acciones</th>
                </tr>
              </thead>
              <tbody>
                @for (z of zonas(); track z.id_zona) {
                  <tr>
                    <td>{{ z.nombre }}</td>
                    <td>{{ z.trabajadores_asignados }}</td>
                    <td>
                      @if (z.activa) {
                        <span class="badge text-bg-success">Activa</span>
                      } @else {
                        <span class="badge text-bg-secondary">Inactiva</span>
                      }
                    </td>
                    <td class="text-end">
                      <button class="btn btn-sm btn-outline-primary me-2"
                        (click)="editarZona(z)">
                        Editar
                      </button>
                      @if (z.activa) {
                        <button class="btn btn-sm btn-outline-danger"
                          (click)="desactivarZona(z)">
                          Desactivar
                        </button>
                      } @else {
                        <button class="btn btn-sm btn-outline-success"
                          (click)="cambiarEstadoZona(z, true)">
                          Activar
                        </button>
                      }
                    </td>
                  </tr>
                } @empty {
                  <tr><td colspan="4" class="text-center text-muted">No hay zonas registradas.</td></tr>
                }
              </tbody>
            </table>
          </div>
        </div>
      </section>
    }
  `,
})
export class CatalogosAdmin {
  private api = inject(CatalogosService);

  pestana = signal<'categorias' | 'zonas'>('categorias');
  categorias = signal<Categoria[]>([]);
  zonas = signal<(Zona & { trabajadores_asignados: number })[]>([]);

  cargando = signal(false);
  guardando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  categoriaEditando = signal<number | null>(null);
  zonaEditando = signal<number | null>(null);

  nombreCategoria = '';
  nombreZona = '';

  constructor() {
    this.cargar();
  }

  cargar() {
    this.cargando.set(true);
    this.error.set(null);

    Promise.all([
      this.api.categoriasTodas().toPromise(),
      this.api.zonasTodas().toPromise(),
    ]).then(([categorias, zonas]) => {
      this.categorias.set(categorias ?? []);
      this.zonas.set(zonas ?? []);
      this.cargando.set(false);
    }).catch((e: unknown) => {
      this.error.set(mensajeDeError(e));
      this.cargando.set(false);
    });
  }

  editarCategoria(c: Categoria) {
    this.categoriaEditando.set(c.id_categoria);
    this.nombreCategoria = c.nombre;
    this.error.set(null);
    this.mensaje.set(null);
  }

  cancelarEdicion() {
    this.categoriaEditando.set(null);
    this.zonaEditando.set(null);
    this.nombreCategoria = '';
    this.nombreZona = '';
  }

  guardarCategoria() {
    const nombre = this.nombreCategoria.trim();
    if (nombre.length < 2) return;

    this.guardando.set(true);
    this.error.set(null);

    const id = this.categoriaEditando();
    const peticion = id
      ? this.api.actualizarCategoria(id, { nombre })
      : this.api.crearCategoria(nombre);

    peticion.subscribe({
      next: () => {
        this.mensaje.set(id ? 'Categoría actualizada.' : 'Categoría creada.');
        this.cancelarEdicion();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => this.fallo(e),
    });
  }

  cambiarEstadoCategoria(c: Categoria, activa: boolean) {
    const accion = activa ? 'activar' : 'desactivar';
    if (!confirm(`¿Seguro que deseas ${accion} la categoría "${c.nombre}"?`)) return;

    this.api.actualizarCategoria(c.id_categoria, { activa }).subscribe({
      next: () => {
        this.mensaje.set(`Categoría ${activa ? 'activada' : 'desactivada'}.`);
        this.cargar();
      },
      error: (e) => this.fallo(e),
    });
  }

  editarZona(z: Zona) {
    this.zonaEditando.set(z.id_zona);
    this.nombreZona = z.nombre;
    this.error.set(null);
    this.mensaje.set(null);
  }

  guardarZona() {
    const nombre = this.nombreZona.trim();
    if (nombre.length < 2) return;

    this.guardando.set(true);
    this.error.set(null);

    const id = this.zonaEditando();
    const peticion = id
      ? this.api.actualizarZona(id, { nombre })
      : this.api.crearZona(nombre);

    peticion.subscribe({
      next: () => {
        this.mensaje.set(id ? 'Zona actualizada.' : 'Zona creada.');
        this.cancelarEdicion();
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => this.fallo(e),
    });
  }

  cambiarEstadoZona(z: Zona, activa: boolean) {
    if (!confirm(`¿Seguro que deseas activar la zona "${z.nombre}"?`)) return;

    this.api.actualizarZona(z.id_zona, { activa }).subscribe({
      next: () => {
        this.mensaje.set('Zona activada.');
        this.cargar();
      },
      error: (e) => this.fallo(e),
    });
  }

  desactivarZona(z: Zona) {
    if (!confirm(`¿Deseas desactivar la zona "${z.nombre}"?`)) return;

    this.api.desactivarZona(z.id_zona).subscribe({
      next: () => {
        this.mensaje.set('Zona desactivada.');
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        const cuerpo = e.error;

        if (e.status === 409 && cuerpo?.requiere_confirmacion) {
          const detalle = cuerpo.message ?? 'Esta zona tiene asignaciones o solicitudes abiertas.';
          if (confirm(`${detalle}\n\n¿Deseas continuar y desactivarla de todos modos?`)) {
            this.api.desactivarZona(z.id_zona, true).subscribe({
              next: () => {
                this.mensaje.set('Zona desactivada con confirmación.');
                this.cargar();
              },
              error: (err) => this.fallo(err),
            });
          }
          return;
        }

        this.fallo(e);
      },
    });
  }

  private fallo(e: unknown) {
    this.error.set(mensajeDeError(e));
    this.guardando.set(false);
  }
}
