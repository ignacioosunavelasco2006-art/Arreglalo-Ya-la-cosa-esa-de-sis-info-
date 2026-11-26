import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { ItemBitacora, UsuarioLista } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';

// RNF-07 / sección 8.18: quién hizo qué y cuándo. Es de solo lectura: nadie puede editarla.
@Component({
  selector: 'app-bitacora',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <a routerLink="/inicio" class="small">&larr; Volver al inicio</a>
    <h1 class="h3 mb-1">Bitácora de auditoría</h1>
    <p class="text-muted small">Registro inalterable de acciones importantes: inicios de sesión, precios, pagos, reclamos, sanciones y cambios de parámetros.</p>

    <form [formGroup]="form" (ngSubmit)="cargar()" class="row g-2 align-items-end mb-3">
      <div class="col-sm-4">
        <label class="form-label small mb-1" for="usuario">Usuario</label>
        <select id="usuario" class="form-select form-select-sm" formControlName="id_usuario">
          <option [ngValue]="0">Todos</option>
          @for (u of usuarios(); track u.id_usuario) { <option [ngValue]="u.id_usuario">{{ u.nombres }} {{ u.apellidos }}</option> }
        </select>
      </div>
      <div class="col-sm-4">
        <label class="form-label small mb-1" for="accion">Acción (texto exacto)</label>
        <input id="accion" class="form-control form-control-sm" formControlName="accion" placeholder="ej. inicio_sesion" />
      </div>
      <div class="col-sm-2">
        <label class="form-label small mb-1" for="limite">Máximo</label>
        <select id="limite" class="form-select form-select-sm" formControlName="limite">
          <option [ngValue]="100">100</option><option [ngValue]="200">200</option><option [ngValue]="500">500</option><option [ngValue]="1000">1000</option>
        </select>
      </div>
      <div class="col-sm-2"><button class="btn btn-primary btn-sm w-100" type="submit">Filtrar</button></div>
    </form>

    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    <div class="table-responsive">
      <table class="table table-sm table-striped bg-white small">
        <thead><tr><th>Fecha</th><th>Usuario</th><th>Acción</th><th>Entidad</th><th>Detalle</th></tr></thead>
        <tbody>
          @for (b of items(); track b.id_bitacora) {
            <tr>
              <td class="text-nowrap">{{ b.fecha | date: 'dd/MM/yy HH:mm:ss' }}</td>
              <td>{{ b.id_usuario ? nombre(b.id_usuario) : 'Sistema' }}</td>
              <td><code>{{ b.accion }}</code></td>
              <td>{{ b.entidad }}{{ b.id_entidad ? ' #' + b.id_entidad : '' }}</td>
              <td>{{ b.detalle }}</td>
            </tr>
          } @empty { <tr><td colspan="5" class="text-muted text-center">Sin registros.</td></tr> }
        </tbody>
      </table>
    </div>
  `,
})
export class Bitacora {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);

  items = signal<ItemBitacora[]>([]);
  usuarios = signal<UsuarioLista[]>([]);
  private nombres = signal(new Map<number, string>());
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
  id_usuario: [0],
  entidad: [''],
  id_entidad: [0],
  accion: [''],
  limite: [200],
});

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Usuario #${id}`;
  }

  cargar() {
    const v = this.form.getRawValue();
    this.error.set(null);
    forkJoin({
      items: this.api.bitacora({ id_usuario: v.id_usuario || undefined, entidad: v.entidad 
        || undefined, id_entidad: v.id_entidad || undefined, accion: v.accion.trim() || undefined, limite: v.limite }),
      usuarios: this.api.usuarios(),
    }).subscribe({
      next: ({ items, usuarios }) => {
        this.items.set(items);
        this.usuarios.set(usuarios);
        this.nombres.set(mapaNombres(usuarios));
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }
}
