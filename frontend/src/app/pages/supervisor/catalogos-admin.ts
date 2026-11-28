import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { Categoria, ZonaAdmin } from '../../core/modelos';

type Tipo = 'categoria' | 'zona';

// RF-32 / CU-32: el supervisor crea, edita y desactiva categorías y zonas.
@Component({
  selector: 'app-catalogos-admin',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Categorías y zonas</h1>

    @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    <div class="row g-4">
      <!-- ===== Categorías ===== -->
      <div class="col-12 col-lg-6">
        <div class="card"><div class="card-body">
          <h2 class="h5">Categorías de servicio</h2>
          <ul class="list-group mb-3">
            @for (c of categorias(); track c.id_categoria) {
              <li class="list-group-item d-flex justify-content-between align-items-center gap-2" [class.text-muted]="!c.activa">
                @if (editando()?.tipo === 'categoria' && editando()?.id === c.id_categoria) {
                  <form class="d-flex gap-2 flex-grow-1" [formGroup]="formEdicion" (ngSubmit)="guardarNombre()">
                    <input class="form-control form-control-sm" formControlName="nombre" aria-label="Nuevo nombre" />
                    <button class="btn btn-primary btn-sm" type="submit">Guardar</button>
                    <button class="btn btn-outline-secondary btn-sm" type="button" (click)="editando.set(null)">X</button>
                  </form>
                } @else {
                  <span>{{ c.nombre }} @if (!c.activa) { <span class="badge text-bg-secondary">Inactiva</span> }</span>
                  <span class="text-nowrap">
                    <button class="btn btn-link btn-sm" type="button" (click)="editar('categoria', c.id_categoria, c.nombre)">Renombrar</button>
                    @if (c.activa) {
                      <button class="btn btn-outline-danger btn-sm" type="button" (click)="desactivarCategoria(c)">Desactivar</button>
                    } @else {
                      <button class="btn btn-outline-success btn-sm" type="button" (click)="activarCategoria(c)">Activar</button>
                    }
                  </span>
                }
              </li>
            }
          </ul>
          <form class="d-flex gap-2" [formGroup]="formCategoria" (ngSubmit)="crearCategoria()">
            <input class="form-control form-control-sm" formControlName="nombre" placeholder="Nueva categoría" maxlength="60" />
            <button class="btn btn-primary btn-sm" type="submit">Agregar</button>
          </form>
        </div></div>
      </div>

      <!-- ===== Zonas ===== -->
      <div class="col-12 col-lg-6">
        <div class="card"><div class="card-body">
          <h2 class="h5">Zonas / OTB</h2>
          <ul class="list-group mb-3">
            @for (z of zonas(); track z.id_zona) {
              <li class="list-group-item d-flex justify-content-between align-items-center gap-2" [class.text-muted]="!z.activa">
                @if (editando()?.tipo === 'zona' && editando()?.id === z.id_zona) {
                  <form class="d-flex gap-2 flex-grow-1" [formGroup]="formEdicion" (ngSubmit)="guardarNombre()">
                    <input class="form-control form-control-sm" formControlName="nombre" aria-label="Nuevo nombre" />
                    <button class="btn btn-primary btn-sm" type="submit">Guardar</button>
                    <button class="btn btn-outline-secondary btn-sm" type="button" (click)="editando.set(null)">X</button>
                  </form>
                } @else {
                  <span>
                    {{ z.nombre }}
                    <span class="small text-muted">· {{ z.trabajadores_asignados }} trabajador(es)</span>
                    @if (!z.activa) { <span class="badge text-bg-secondary">Inactiva</span> }
                  </span>
                  <span class="text-nowrap">
                    <button class="btn btn-link btn-sm" type="button" (click)="editar('zona', z.id_zona, z.nombre)">Renombrar</button>
                    @if (z.activa) {
                      <button class="btn btn-outline-danger btn-sm" type="button" (click)="desactivarZona(z)">Desactivar</button>
                    } @else {
                      <button class="btn btn-outline-success btn-sm" type="button" (click)="activarZona(z)">Activar</button>
                    }
                  </span>
                }
              </li>
            }
          </ul>
          <form class="d-flex gap-2" [formGroup]="formZona" (ngSubmit)="crearZona()">
            <input class="form-control form-control-sm" formControlName="nombre" placeholder="Nueva zona u OTB" maxlength="100" />
            <button class="btn btn-primary btn-sm" type="submit">Agregar</button>
          </form>
          <div class="form-text">
            Los trabajadores pueden pedir zonas nuevas: te llega un aviso en las notificaciones.
          </div>
        </div></div>
      </div>
    </div>
  `,
})
export class CatalogosAdmin {
  private fb = inject(FormBuilder);
  private api = inject(CatalogosService);

  categorias = signal<Categoria[]>([]);
  zonas = signal<ZonaAdmin[]>([]);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  editando = signal<{ tipo: Tipo; id: number } | null>(null);

  formCategoria = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.minLength(2)]] });
  formZona = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.minLength(2)]] });
  formEdicion = this.fb.nonNullable.group({ nombre: ['', [Validators.required, Validators.minLength(2)]] });

  constructor() {
    this.cargar();
  }

  crearCategoria() {
    if (this.formCategoria.invalid) return;
    this.accion(this.api.crearCategoria(this.formCategoria.getRawValue().nombre.trim()), 'Categoría creada.', () => this.formCategoria.reset());
  }

  crearZona() {
    if (this.formZona.invalid) return;
    this.accion(this.api.crearZona(this.formZona.getRawValue().nombre.trim()), 'Zona creada.', () => this.formZona.reset());
  }

  editar(tipo: Tipo, id: number, nombre: string) {
    this.formEdicion.setValue({ nombre });
    this.editando.set({ tipo, id });
  }

  guardarNombre() {
    const e = this.editando();
    if (!e || this.formEdicion.invalid) return;
    const nombre = this.formEdicion.getRawValue().nombre.trim();
    const peticion = e.tipo === 'categoria' ? this.api.actualizarCategoria(e.id, { nombre }) : this.api.actualizarZona(e.id, { nombre });
    this.accion(peticion, 'Nombre actualizado.', () => this.editando.set(null));
  }

  desactivarCategoria(c: Categoria) {
    if (!confirm(`¿Desactivar "${c.nombre}"? Dejará de ofrecerse en nuevas solicitudes.`)) return;
    this.accion(this.api.desactivarCategoria(c.id_categoria), 'Categoría desactivada.');
  }

  activarCategoria(c: Categoria) {
    this.accion(this.api.actualizarCategoria(c.id_categoria, { activa: true }), 'Categoría activada.');
  }

  activarZona(z: ZonaAdmin) {
    this.accion(this.api.actualizarZona(z.id_zona, { activa: true }), 'Zona activada.');
  }

  // CU-32 flujo alterno: con trabajadores asignados el backend avisa (409) antes de desactivar
  desactivarZona(z: ZonaAdmin) {
    this.error.set(null);
    this.mensaje.set(null);
    this.api.desactivarZona(z.id_zona).subscribe({
      next: () => this.terminado('Zona desactivada.'),
      error: (e: HttpErrorResponse) => {
        if (e.status === 409 && e.error?.requiere_confirmacion) {
          if (confirm(`${e.error.message}\n\n¿Desactivarla de todos modos?`)) {
            this.accion(this.api.desactivarZona(z.id_zona, true), 'Zona desactivada.');
          }
        } else {
          this.error.set(mensajeDeError(e));
        }
      },
    });
  }

  private accion(peticion: Observable<unknown>, exito: string, alTerminar?: () => void) {
    this.error.set(null);
    this.mensaje.set(null);
    peticion.subscribe({
      next: () => {
        alTerminar?.();
        this.terminado(exito);
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  private terminado(mensaje: string) {
    this.mensaje.set(mensaje);
    this.cargar();
  }

  private cargar() {
    forkJoin({ categorias: this.api.categoriasTodas(), zonas: this.api.zonasTodas() }).subscribe({
      next: ({ categorias, zonas }) => {
        this.categorias.set(categorias);
        this.zonas.set(zonas);
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }
}
