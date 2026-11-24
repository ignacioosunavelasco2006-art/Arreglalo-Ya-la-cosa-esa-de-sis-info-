import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { mensajeDeError } from '../core/errores';

// Un "componente" es una pantalla (o un pedazo de pantalla): una clase TypeScript + su HTML.
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  template: `
    <div class="container py-5">
      <div class="row justify-content-center">
        <div class="col-12 col-md-6 col-lg-5">
          <h1 class="h3 text-center mb-1">Arréglalo Ya</h1>
          <p class="text-center text-muted mb-4">Inicia sesión para continuar</p>

          @if (sesionExpirada) {
            <div class="alert alert-warning">Tu sesión venció. Vuelve a iniciar sesión.</div>
          }

          <div class="card shadow-sm">
            <div class="card-body p-4">
              <form [formGroup]="form" (ngSubmit)="entrar()" novalidate>
                <div class="mb-3">
                  <label class="form-label" for="correo">Correo electrónico</label>
                  <input id="correo" type="email" class="form-control" formControlName="correo"
                         autocomplete="email"
                         [class.is-invalid]="form.controls.correo.touched && form.controls.correo.invalid" />
                  <div class="invalid-feedback">Escribe un correo válido.</div>
                </div>

                <div class="mb-3">
                  <label class="form-label" for="contrasena">Contraseña</label>
                  <input id="contrasena" type="password" class="form-control" formControlName="contrasena"
                         autocomplete="current-password"
                         [class.is-invalid]="form.controls.contrasena.touched && form.controls.contrasena.invalid" />
                  <div class="invalid-feedback">La contraseña es obligatoria.</div>
                </div>

                @if (error()) {
                  <div class="alert alert-danger py-2">{{ error() }}</div>
                }

                <button class="btn btn-primary w-100" type="submit" [disabled]="cargando()">
                  {{ cargando() ? 'Entrando...' : 'Entrar' }}
                </button>
              </form>
            </div>
          </div>

          <p class="text-center mt-3">
            ¿No tienes cuenta? <a routerLink="/registro">Regístrate</a>
          </p>
        </div>
      </div>
    </div>
  `,
    styles: `
    :host {
      display: block;
      min-height: 100vh;
    }
h1 {
  font-size: 2.4rem;
  font-weight: 800;
  letter-spacing: -0.5px;
  color: #ffffff;
}
p.text-muted {
  color: rgba(255, 255, 255, 0.8) !important;
  font-size: 1.05rem;
}
    .card {
      border: none;
      border-radius: 16px;
      box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
    }
.btn-primary {
  --bs-btn-bg: #f59e0b;
  --bs-btn-border-color: #f59e0b;
  --bs-btn-hover-bg: #d98a06;
  --bs-btn-hover-border-color: #d98a06;
  --bs-btn-color: #1f2937;
  --bs-btn-hover-color: #1f2937;
  padding: 0.7rem;
  font-weight: 600;
  border-radius: 10px;
}
    .form-control {
      padding: 0.7rem 0.9rem;
      border-radius: 10px;
    }
      p.mt-3 {
  color: rgba(255, 255, 255, 0.85);
  font-size: 1rem;
}
p.mt-3 a {
  color: #f59e0b;
  font-weight: 600;
  text-decoration: none;
}
p.mt-3 a:hover {
  text-decoration: underline;
}
  `,
})
export class Login {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private ruta = inject(ActivatedRoute);

  readonly sesionExpirada = this.ruta.snapshot.queryParamMap.has('expirada');

  form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    contrasena: ['', Validators.required],
  });

  cargando = signal(false);
  error = signal<string | null>(null);

  entrar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        // Si lo mandaron al login desde otra página, vuelve a ella
        const volver = this.ruta.snapshot.queryParamMap.get('volver');
        const destino = volver && volver.startsWith('/') && !volver.startsWith('//') ? volver : '/inicio';
        this.router.navigateByUrl(destino);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
