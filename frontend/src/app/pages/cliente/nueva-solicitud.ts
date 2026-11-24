import { Component, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { Router, RouterLink } from '@angular/router';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { ArchivoSubido, Categoria, Zona } from '../../core/modelos';
import { SolicitudesService } from '../../core/solicitudes.service';
import { Imagen } from '../../shared/imagen';
import { SubirArchivo } from '../../shared/subir-archivo';

// RF-11 / CU-11: publicar una solicitud. La fecha pasada se rechaza (flujo alterno del CU).
function fechaFutura(control: AbstractControl): ValidationErrors | null {
  const valor = control.value as string;
  return valor && new Date(valor).getTime() < Date.now() ? { pasada: true } : null;
}

@Component({
  selector: 'app-nueva-solicitud',
  imports: [ReactiveFormsModule, RouterLink, SubirArchivo, Imagen],
  template: `
    <div class="row justify-content-center">
      <div class="col-12 col-lg-8">
        <h1 class="h3 mb-1">Publicar solicitud</h1>
        <p class="text-muted">Describe el problema y los trabajadores de tu zona te enviarán ofertas.</p>

        <div class="card shadow-sm">
          <div class="card-body">
            <form [formGroup]="form" (ngSubmit)="publicar()" novalidate>
              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="categoria">Tipo de servicio</label>
                  <select id="categoria" class="form-select" formControlName="id_categoria"
                          [class.is-invalid]="invalido('id_categoria')">
                    <option [ngValue]="0">Selecciona...</option>
                    @for (c of categorias(); track c.id_categoria) {
                      <option [ngValue]="c.id_categoria">{{ c.nombre }}</option>
                    }
                  </select>
                  <div class="invalid-feedback">Elige el tipo de servicio.</div>
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label" for="zona">Zona / OTB</label>
                  <select id="zona" class="form-select" formControlName="id_zona"
                          [class.is-invalid]="invalido('id_zona')">
                    <option [ngValue]="0">Selecciona...</option>
                    @for (z of zonas(); track z.id_zona) {
                      <option [ngValue]="z.id_zona">{{ z.nombre }}</option>
                    }
                  </select>
                  <div class="invalid-feedback">Elige tu zona.</div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="descripcion">¿Qué necesitas?</label>
                <textarea id="descripcion" rows="4" class="form-control" formControlName="descripcion"
                          placeholder="Ej.: Se rompió la tubería del baño y gotea todo el día"
                          [class.is-invalid]="invalido('descripcion')"></textarea>
                <div class="invalid-feedback">Describe el problema (mínimo 10 caracteres).</div>
              </div>

              <div class="mb-3">
                <label class="form-label" for="direccion">Dirección exacta</label>
                <input id="direccion" class="form-control" formControlName="direccion_exacta"
                       [class.is-invalid]="invalido('direccion_exacta')" />
                <div class="form-text">
                  Solo la verá el trabajador que contrates. Las búsquedas muestran únicamente la zona.
                </div>
                <div class="invalid-feedback">Escribe la dirección (mínimo 5 caracteres).</div>
              </div>

              <div class="row">
                <div class="col-md-6 mb-3">
                  <label class="form-label" for="fecha">Fecha y hora deseada</label>
                  <input id="fecha" type="datetime-local" class="form-control" formControlName="fecha_deseada"
                         [class.is-invalid]="invalido('fecha_deseada')" />
                  <div class="invalid-feedback">
                    @if (form.controls.fecha_deseada.hasError('pasada')) {
                      La fecha no puede ser pasada.
                    } @else {
                      Indica la fecha en que quieres recibir al trabajador.
                    }
                  </div>
                </div>

                <div class="col-md-6 mb-3">
                  <label class="form-label" for="presupuesto">Presupuesto aproximado (Bs, opcional)</label>
                  <input id="presupuesto" type="number" min="1" class="form-control"
                         formControlName="presupuesto" [class.is-invalid]="invalido('presupuesto')" />
                  <div class="invalid-feedback">Debe ser mayor a 0.</div>
                </div>
              </div>

              <div class="mb-3">
                <label class="form-label">Fotos del problema (opcional, hasta 10)</label>
                @if (fotos().length < 10) {
                  <app-subir-archivo tipo="foto" aceptar="image/jpeg,image/png,image/webp" (subido)="agregarFoto($event)" />
                }
                <div class="form-text">Una buena foto ayuda a recibir ofertas más precisas. JPG, PNG o WebP, máximo 5 MB.</div>
                <div class="d-flex flex-wrap gap-3 mt-2">
                  @for (f of fotos(); track f.ruta) {
                    <div class="text-center">
                      <app-imagen [ruta]="f.ruta" alt="Foto adjunta" />
                      <div><button class="btn btn-link btn-sm text-danger p-0" type="button" (click)="quitarFoto(f.ruta)">Quitar</button></div>
                    </div>
                  }
                </div>
              </div>

              <div class="alert alert-light border small">La solicitud estará vigente 30 días.</div>

              @if (error()) {
                <div class="alert alert-danger py-2">{{ error() }}</div>
              }

              <div class="d-flex gap-2">
                <button class="btn btn-primary" type="submit" [disabled]="cargando()">
                  {{ cargando() ? 'Publicando...' : 'Publicar solicitud' }}
                </button>
                <a class="btn btn-outline-secondary" routerLink="/solicitudes">Cancelar</a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class NuevaSolicitud {
  private fb = inject(FormBuilder);
  private api = inject(SolicitudesService);
  private catalogos = inject(CatalogosService);
  private router = inject(Router);

  categorias = signal<Categoria[]>([]);
  zonas = signal<Zona[]>([]);
  cargando = signal(false);
  error = signal<string | null>(null);
  fotos = signal<ArchivoSubido[]>([]);

  form = this.fb.nonNullable.group({
    id_categoria: [0, [Validators.required, Validators.min(1)]],
    id_zona: [0, [Validators.required, Validators.min(1)]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    direccion_exacta: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(250)]],
    fecha_deseada: ['', [Validators.required, fechaFutura]],
    presupuesto: [null as number | null, [Validators.min(1)]],
  });

  constructor() {
    this.catalogos.todo().subscribe({
      next: ({ categorias, zonas }) => {
        this.categorias.set(categorias);
        this.zonas.set(zonas);
      },
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  invalido(
    campo: 'id_categoria' | 'id_zona' | 'descripcion' | 'direccion_exacta' | 'fecha_deseada' | 'presupuesto',
  ): boolean {
    const control = this.form.controls[campo];
    return control.touched && control.invalid;
  }

  agregarFoto(archivo: ArchivoSubido) {
    this.fotos.update((lista) => [...lista, archivo]);
  }

  quitarFoto(ruta: string) {
    this.fotos.update((lista) => lista.filter((f) => f.ruta !== ruta));
  }

  publicar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.cargando.set(true);
    this.error.set(null);

    const v = this.form.getRawValue();
    this.api
      .crear({
        id_categoria: v.id_categoria,
        id_zona: v.id_zona,
        descripcion: v.descripcion.trim(),
        direccion_exacta: v.direccion_exacta.trim(),
        fecha_deseada: new Date(v.fecha_deseada).toISOString(),
        ...(v.presupuesto ? { presupuesto_aproximado: v.presupuesto } : {}),
        ...(this.fotos().length ? { fotos: this.fotos().map((f) => f.ruta) } : {}),
      })
      .subscribe({
        next: (solicitud) => this.router.navigate(['/solicitudes', solicitud.id_solicitud]),
        error: (e) => {
          this.error.set(mensajeDeError(e));
          this.cargando.set(false);
        },
      });
  }
}
