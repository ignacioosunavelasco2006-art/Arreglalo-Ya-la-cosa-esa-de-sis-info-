import { Component, inject, output, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { mensajeDeError } from '../../../core/errores';
import { DatosBancarios } from '../../../core/modelos';
import { UsuariosService } from '../../../core/usuarios.service';

// RF-03 / CU-03: datos bancarios obligatorios para el trabajador (sin ellos no puede ser aprobado
// ni recibir pagos). El número se guarda cifrado y aquí nunca se vuelve a mostrar completo.
@Component({
  selector: 'app-bancarios-seccion',
  imports: [ReactiveFormsModule],
  template: `
    <div class="card mb-4"><div class="card-body">
      <h2 class="h5">Datos bancarios</h2>
      <p class="small text-muted">Aquí recibirás tus pagos. El número de cuenta se guarda cifrado.</p>

      @if (actuales(); as d) {
        <div class="alert alert-light border small">
          Cuenta registrada: <strong>{{ d.banco }}</strong> · titular {{ d.titular }} · {{ d.numero_cuenta }}
          <div class="text-muted">Para cambiarla, vuelve a llenar el formulario.</div>
        </div>
      }

      <form [formGroup]="form" (ngSubmit)="guardar()" novalidate>
        <div class="row g-2">
          <div class="col-md-4">
            <label class="form-label small mb-1" for="banco">Banco</label>
            <input id="banco" class="form-control form-control-sm" formControlName="banco"
                   [class.is-invalid]="invalido('banco')" />
          </div>
          <div class="col-md-4">
            <label class="form-label small mb-1" for="titular">Titular</label>
            <input id="titular" class="form-control form-control-sm" formControlName="titular"
                   [class.is-invalid]="invalido('titular')" />
          </div>
          <div class="col-md-4">
            <label class="form-label small mb-1" for="cuenta">Número de cuenta</label>
            <input id="cuenta" class="form-control form-control-sm" formControlName="numero_cuenta"
                   inputmode="numeric" autocomplete="off" [class.is-invalid]="invalido('numero_cuenta')" />
            <div class="invalid-feedback">Solo dígitos, entre 6 y 25.</div>
          </div>
        </div>

        @if (error()) { <div class="text-danger small mt-2">{{ error() }}</div> }
        @if (exito()) { <div class="text-success small mt-2">Datos bancarios guardados.</div> }
        <button class="btn btn-primary btn-sm mt-3" type="submit" [disabled]="guardando()">Guardar datos bancarios</button>
      </form>
    </div></div>
  `,
})
export class BancariosSeccion {
  private fb = inject(FormBuilder);
  private api = inject(UsuariosService);

  cambio = output<void>();

  actuales = signal<DatosBancarios | null>(null);
  guardando = signal(false);
  error = signal<string | null>(null);
  exito = signal(false);

  form = this.fb.nonNullable.group({
    banco: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(80)]],
    titular: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(150)]],
    numero_cuenta: ['', [Validators.required, Validators.pattern(/^[0-9]{6,25}$/)]],
  });

  constructor() {
    this.cargar();
  }

  invalido(campo: 'banco' | 'titular' | 'numero_cuenta') {
    const c = this.form.controls[campo];
    return c.touched && c.invalid;
  }

  guardar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.guardando.set(true);
    this.error.set(null);
    this.exito.set(false);

    this.api.guardarDatosBancarios(this.form.getRawValue()).subscribe({
      next: (datos) => {
        this.actuales.set(datos);
        this.form.reset();
        this.guardando.set(false);
        this.exito.set(true);
        this.cambio.emit();
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  private cargar() {
    this.api.datosBancarios().subscribe({
      next: (d) => this.actuales.set(d),
      // 404 = todavía no registró datos: no es un error
      error: (e: HttpErrorResponse) => {
        if (e.status !== 404) this.error.set(mensajeDeError(e));
      },
    });
  }
}
