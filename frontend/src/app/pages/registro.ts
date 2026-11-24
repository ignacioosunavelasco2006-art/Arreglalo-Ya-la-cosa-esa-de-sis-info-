import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/errores';

// Validador personalizado: las dos contraseñas deben coincidir
function contrasenasCoinciden(grupo: AbstractControl): ValidationErrors | null {
  const a = grupo.get('contrasena')?.value;
  const b = grupo.get('confirmar')?.value;
  return a === b ? null : { noCoinciden: true };
}

@Component({
  selector: 'app-registro',
  imports: [ReactiveFormsModule, RouterLink],
  template: 
  `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-8 col-lg-6">
<h1 class="h3 text-center mb-1 text-white">Crear cuenta</h1>
<p class="text-center text-white-50 mb-4">Regístrate como cliente o como trabajador</p>
          <div class="card shadow-sm">
            <div class="card-body p-4">
              <form [formGroup]="form" (ngSubmit)="registrar()" novalidate>
                <div class="mb-3">
                  <label class="form-label d-block">¿Cómo quieres usar la plataforma?</label>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" id="t-cliente" value="cliente"
                           formControlName="tipo_cuenta" />
                    <label class="form-check-label" for="t-cliente">Necesito un servicio (cliente)</label>
                  </div>
                  <div class="form-check form-check-inline">
                    <input class="form-check-input" type="radio" id="t-trabajador" value="trabajador"
                           formControlName="tipo_cuenta" />
                    <label class="form-check-label" for="t-trabajador">Ofrezco servicios (trabajador)</label>
                  </div>
                  <div class="form-text">
                    Más adelante podrás activar la otra función con la misma cuenta.
                  </div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="nombres">Nombres</label>
                    <input id="nombres" class="form-control" formControlName="nombres"
                           [class.is-invalid]="invalido('nombres')" />
                    <div class="invalid-feedback">Escribe tus nombres.</div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="apellidos">Apellidos</label>
                    <input id="apellidos" class="form-control" formControlName="apellidos"
                           [class.is-invalid]="invalido('apellidos')" />
                    <div class="invalid-feedback">Escribe tus apellidos.</div>
                  </div>
                </div>

                <div class="mb-3">
                  <label class="form-label" for="correo">Correo electrónico</label>
                  <input id="correo" type="email" class="form-control" formControlName="correo"
                         autocomplete="email" [class.is-invalid]="invalido('correo')" />
                  <div class="invalid-feedback">Escribe un correo válido.</div>
                </div>

                <div class="mb-3">
                  <label class="form-label" for="telefono">Teléfono</label>
                  <input id="telefono" type="tel" class="form-control" formControlName="telefono"
                         [class.is-invalid]="invalido('telefono')" />
                  <div class="invalid-feedback">Escribe tu teléfono.</div>
                </div>

                <div class="row">
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="contrasena">Contraseña</label>
                    <input id="contrasena" type="password" class="form-control" formControlName="contrasena"
                           autocomplete="new-password" [class.is-invalid]="invalido('contrasena')" />
                    <div class="invalid-feedback">Mínimo 8 caracteres.</div>
                  </div>
                  <div class="col-md-6 mb-3">
                    <label class="form-label" for="confirmar">Repite la contraseña</label>
                    <input id="confirmar" type="password" class="form-control" formControlName="confirmar"
                           autocomplete="new-password"
                           [class.is-invalid]="form.controls.confirmar.touched && form.hasError('noCoinciden')" />
                    <div class="invalid-feedback">Las contraseñas no coinciden.</div>
                  </div>
                </div>

                @if (error()) {
                  <div class="alert alert-danger py-2">{{ error() }}</div>
                }

                <button class="btn btn-primary w-100" type="submit" [disabled]="cargando()">
                  {{ cargando() ? 'Creando cuenta...' : 'Crear cuenta' }}
                </button>
              </form>
            </div>
          </div>

<p class="text-center mt-3 text-white">
  ¿Ya tienes cuenta? <a routerLink="/login" class="text-info">Inicia sesión</a>
</p>
        </div>
      </div>
    </div>
  `,
})
export class Registro {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  form = this.fb.nonNullable.group(
    {
      tipo_cuenta: ['cliente' as 'cliente' | 'trabajador'],
      nombres: ['', [Validators.required, Validators.maxLength(100)]],
      apellidos: ['', [Validators.required, Validators.maxLength(100)]],
      correo: ['', [Validators.required, Validators.email, Validators.maxLength(150)]],
      telefono: ['', [Validators.required, Validators.maxLength(20)]],
      contrasena: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(72)]],
      confirmar: ['', Validators.required],
    },
    { validators: contrasenasCoinciden },
  );

  cargando = signal(false);
  error = signal<string | null>(null);

  invalido(campo: 'nombres' | 'apellidos' | 'correo' | 'telefono' | 'contrasena'): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  registrar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const { confirmar, ...datos } = this.form.getRawValue();

    this.auth.registrar(datos).subscribe({
      // Cuenta creada: entra directamente con esas mismas credenciales
      next: () =>
        this.auth.login({ correo: datos.correo, contrasena: datos.contrasena }).subscribe({
          next: () => this.router.navigateByUrl('/inicio'),
          error: () => this.router.navigateByUrl('/login'),
        }),
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
