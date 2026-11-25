import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/errores';
import { NOMBRE_ROL } from '../core/menu';
import { UsuariosService } from '../core/usuarios.service';

// Mi cuenta: editar datos (CU-02) y activar la otra función con la misma cuenta (RF-02).
@Component({
  selector: 'app-mi-cuenta',
  imports: [ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Mi cuenta</h1>

    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h5 mb-3">Mis datos</h2>
            <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="nombres">Nombres</label>
                  <input id="nombres" class="form-control" formControlName="nombres"
                         [class.is-invalid]="form.controls.nombres.touched && form.controls.nombres.invalid" />
                </div>
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="apellidos">Apellidos</label>
                  <input id="apellidos" class="form-control" formControlName="apellidos"
                         [class.is-invalid]="form.controls.apellidos.touched && form.controls.apellidos.invalid" />
                </div>
              </div>
              <div class="mb-3">
                <label class="form-label" for="correo">Correo</label>
                <input id="correo" type="email" class="form-control" formControlName="correo"
                       [class.is-invalid]="form.controls.correo.touched && form.controls.correo.invalid" />
              </div>
              <div class="mb-3">
                <label class="form-label" for="telefono">Teléfono</label>
                <input id="telefono" class="form-control" formControlName="telefono"
                       [class.is-invalid]="form.controls.telefono.touched && form.controls.telefono.invalid" />
              </div>

              @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }
              @if (exito()) { <div class="alert alert-success py-2">{{ exito() }}</div> }

              <button class="btn btn-primary" type="submit" [disabled]="guardando()">
                {{ guardando() ? 'Guardando...' : 'Guardar cambios' }}
              </button>
            </form>
          </div>
        </div>
      </div>

      <div class="col-12 col-lg-5">
        <div class="card shadow-sm">
          <div class="card-body">
            <h2 class="h5 mb-3">Mis funciones</h2>
            <p>
              @for (rol of auth.roles(); track rol) {
                <span class="badge text-bg-primary me-1">{{ nombreRol(rol) }}</span>
              }
            </p>

            @if (puedeActivar().length > 0) {
              <p class="small text-muted">
                Con la misma cuenta puedes usar la plataforma también como:
              </p>
              @for (rol of puedeActivar(); track rol) {
                <button class="btn btn-outline-primary btn-sm me-2" type="button"
                        [disabled]="activando()" (click)="activar(rol)">
                  Activar {{ nombreRol(rol) }}
                </button>
              }
            }

            @if (avisoFuncion()) {
              <div class="alert alert-info mt-3 mb-0 small">
                {{ avisoFuncion() }}
                <button class="btn btn-link btn-sm p-0 d-block" type="button" (click)="auth.cerrarSesion()">
                  Cerrar sesión ahora
                </button>
              </div>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class MiCuenta {
  private fb = inject(FormBuilder);
  private api = inject(UsuariosService);
  protected auth = inject(AuthService);

  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.maxLength(100)]],
    apellidos: ['', [Validators.required, Validators.maxLength(100)]],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', [Validators.required, Validators.maxLength(20)]],
  });

  guardando = signal(false);
  activando = signal(false);
  error = signal<string | null>(null);
  exito = signal<string | null>(null);
  avisoFuncion = signal<string | null>(null);

  // Funciones (cliente/trabajador) que aún no tiene. Las cuentas internas no cambian de función.
  puedeActivar = computed(() => {
    const roles = this.auth.roles();
    if (roles.some((r) => ['supervisor', 'super_supervisor', 'inspector'].includes(r))) return [];
    return (['cliente', 'trabajador'] as const).filter((r) => !roles.includes(r));
  });

  constructor() {
    this.api.miCuenta().subscribe({
      next: (u) => this.form.patchValue(u),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  nombreRol(rol: string): string {
    return NOMBRE_ROL[rol] ?? rol;
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(null);

    this.api.actualizar(this.form.getRawValue()).subscribe({
      next: (u) => {
        this.auth.actualizarUsuarioLocal({
          nombres: u.nombres, apellidos: u.apellidos, correo: u.correo, telefono: u.telefono,
        });
        this.exito.set('Datos actualizados.');
        this.guardando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  activar(rol: 'cliente' | 'trabajador') {
    this.activando.set(true);
    this.error.set(null);
    this.api.activarFuncion(rol).subscribe({
      next: (r) => {
        // El token actual todavía no incluye el rol nuevo: hay que volver a entrar
        this.avisoFuncion.set(`${r.mensaje} ${r.nota}`);
        this.activando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.activando.set(false);
      },
    });
  }
}
