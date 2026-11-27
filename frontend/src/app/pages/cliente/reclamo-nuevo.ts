import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { mensajeDeError } from '../../core/errores';
import { ArchivoSubido } from '../../core/modelos';
import { ReclamosService } from '../../core/reclamos.service';
import { SubirArchivo } from '../../shared/subir-archivo';

// RF-29 / CU-29: el cliente reclama dentro de los 7 días posteriores al cierre del trabajo.
@Component({
  selector: 'app-reclamo-nuevo',
  imports: [ReactiveFormsModule, RouterLink, SubirArchivo],
  template: `
    <div class="row justify-content-center">
      <div class="col-12 col-lg-8">
        <a [routerLink]="['/trabajos', idTrabajo]" class="small">&larr; Volver al trabajo #{{ idTrabajo }}</a>
        <h1 class="h3 mt-2 mb-1">Presentar un reclamo</h1>
        <p class="text-muted">
          Cuéntanos qué salió mal en el trabajo #{{ idTrabajo }}. Un supervisor revisará el caso con todo el historial
          (precios, pagos y cambios) y te avisará su decisión. El pago al trabajador queda retenido mientras se resuelve.
        </p>

        @if (!idTrabajo) {
          <div class="alert alert-warning">Primero elige el trabajo desde su pantalla.</div>
        } @else {
          <div class="card shadow-sm"><div class="card-body">
            <form [formGroup]="form" (ngSubmit)="enviar()" novalidate>
              <div class="mb-3">
                <label class="form-label" for="descripcion">¿Qué pasó?</label>
                <textarea id="descripcion" rows="5" class="form-control" formControlName="descripcion" maxlength="2000"
                          placeholder="Describe el problema con el mayor detalle posible"
                          [class.is-invalid]="form.controls.descripcion.touched && form.controls.descripcion.invalid"></textarea>
                <div class="invalid-feedback">Describe el problema (mínimo 10 caracteres).</div>
              </div>

              <div class="mb-3">
                <label class="form-label">Evidencias (fotos o PDF, opcional)</label>
                @if (evidencias().length < 10) {
                  <app-subir-archivo tipo="evidencia" aceptar="image/jpeg,image/png,image/webp,application/pdf"
                                     (subido)="agregar($event)" />
                }
                <ul class="list-unstyled small mt-2 mb-0">
                  @for (e of evidencias(); track e.ruta) {
                    <li class="d-flex justify-content-between">
                      <span>📎 {{ e.nombre_original }}</span>
                      <button class="btn btn-link btn-sm text-danger p-0" type="button" (click)="quitar(e.ruta)">Quitar</button>
                    </li>
                  }
                </ul>
              </div>

              @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

              <button class="btn btn-danger" type="submit" [disabled]="enviando()">
                {{ enviando() ? 'Enviando...' : 'Presentar reclamo' }}
              </button>
            </form>
          </div></div>
        }
      </div>
    </div>
  `,
})
export class ReclamoNuevo {
  private fb = inject(FormBuilder);
  private api = inject(ReclamosService);
  private router = inject(Router);

  idTrabajo = Number(inject(ActivatedRoute).snapshot.queryParamMap.get('trabajo'));

  evidencias = signal<ArchivoSubido[]>([]);
  enviando = signal(false);
  error = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  agregar(archivo: ArchivoSubido) {
    this.evidencias.update((l) => [...l, archivo]);
  }

  quitar(ruta: string) {
    this.evidencias.update((l) => l.filter((e) => e.ruta !== ruta));
  }

  enviar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.enviando.set(true);
    this.error.set(null);
    this.api
      .crear(this.idTrabajo, this.form.getRawValue().descripcion.trim(), this.evidencias().map((e) => e.ruta))
      .subscribe({
        next: (r) => this.router.navigate(['/reclamos', r.id_reclamo]),
        // Aquí aparece, por ejemplo, "El plazo de 7 días para reclamar ya venció"
        error: (e) => {
          this.error.set(mensajeDeError(e));
          this.enviando.set(false);
        },
      });
  }
}
