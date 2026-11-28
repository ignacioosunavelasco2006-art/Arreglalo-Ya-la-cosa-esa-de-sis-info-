import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { Parametro } from '../../core/modelos';

// Nombres claros para los parámetros que usa el sistema (el resto se muestra con su clave).
const CONOCIDOS: Record<string, string> = {
  comision: 'Comisión de la plataforma (%)',
  anticipo: 'Anticipo del cliente (%)',
  horas_cancelacion: 'Horas mínimas para cancelar (cliente)',
  dias_devolucion: 'Días máximos para devolver el dinero',
  dias_reclamo: 'Días para presentar un reclamo',
  dias_vigencia_solicitud: 'Días de vigencia de una solicitud',
  umbral_incidentes: 'Incidentes para suspender (2 o 3)',
  atrasos_automaticos: 'Detectar atrasos automáticamente (1 = sí, 0 = no)',
  minutos_tolerancia_atraso: 'Minutos de tolerancia de un atraso',
};

// RF-34 / CU-34: el super supervisor ajusta la plataforma sin tocar el código.
@Component({
  selector: 'app-parametros',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-1">Parámetros del sistema</h1>
    <p class="text-muted small">Los cambios se aplican de inmediato y quedan registrados en la bitácora con tu nombre.</p>

    @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    <div class="table-responsive mb-4">
      <table class="table align-middle bg-white">
        <thead><tr><th>Parámetro</th><th style="width: 14rem">Valor</th><th>Última modificación</th></tr></thead>
        <tbody>
          @for (p of parametros(); track p.clave) {
            <tr>
              <td>
                <div>{{ etiqueta(p.clave) }}</div>
                <div class="small text-muted"><code>{{ p.clave }}</code>{{ p.descripcion ? ' · ' + p.descripcion : '' }}</div>
              </td>
              <td>
                @if (editando() === p.clave) {
                  <form class="d-flex gap-1" [formGroup]="formEdicion" (ngSubmit)="guardar(p)">
                    <input class="form-control form-control-sm" formControlName="valor" aria-label="Nuevo valor" />
                    <button class="btn btn-primary btn-sm" type="submit" [disabled]="procesando()">OK</button>
                    <button class="btn btn-outline-secondary btn-sm" type="button" (click)="editando.set(null)">X</button>
                  </form>
                } @else {
                  <strong>{{ p.valor }}</strong>
                  <button class="btn btn-link btn-sm" type="button" (click)="editar(p)">Cambiar</button>
                }
              </td>
              <td class="small text-muted">{{ p.fecha_modificacion | date: 'dd/MM/yyyy HH:mm' }}</td>
            </tr>
          } @empty {
            <tr><td colspan="3" class="text-muted text-center">No hay parámetros. Ejecuta migracion.sql.</td></tr>
          }
        </tbody>
      </table>
    </div>

    <div class="card" style="max-width: 40rem"><div class="card-body">
      <h2 class="h6">Agregar un parámetro</h2>
      <form [formGroup]="formNuevo" (ngSubmit)="crear()" class="row g-2" novalidate>
        <div class="col-sm-4">
          <input class="form-control form-control-sm" formControlName="clave" placeholder="clave_en_minusculas"
                 [class.is-invalid]="formNuevo.controls.clave.touched && formNuevo.controls.clave.invalid" />
        </div>
        <div class="col-sm-3"><input class="form-control form-control-sm" formControlName="valor" placeholder="Valor" /></div>
        <div class="col-sm-5"><input class="form-control form-control-sm" formControlName="descripcion" placeholder="Descripción" maxlength="200" /></div>
        <div class="col-12"><button class="btn btn-outline-primary btn-sm" type="submit" [disabled]="procesando()">Agregar</button></div>
      </form>
    </div></div>
  `,
})
export class Parametros {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);

  parametros = signal<(Parametro & { fecha_modificacion?: string })[]>([]);
  editando = signal<string | null>(null);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  formEdicion = this.fb.nonNullable.group({ valor: ['', Validators.required] });
  formNuevo = this.fb.nonNullable.group({
    clave: ['', [Validators.required, Validators.pattern(/^[a-z0-9_]+$/), Validators.maxLength(60)]],
    valor: ['', Validators.required],
    descripcion: [''],
  });

  constructor() {
    this.cargar();
  }

  etiqueta(clave: string) {
    return CONOCIDOS[clave] ?? clave;
  }

  editar(p: Parametro) {
    this.formEdicion.setValue({ valor: p.valor });
    this.editando.set(p.clave);
  }

  guardar(p: Parametro) {
    if (this.formEdicion.invalid) return;
    this.ejecutar(
      this.api.actualizarParametro(p.clave, this.formEdicion.getRawValue().valor.trim()),
      'Parámetro actualizado.',
      () => this.editando.set(null),
    );
  }

  crear() {
    if (this.formNuevo.invalid) {
      this.formNuevo.markAllAsTouched();
      return;
    }
    const v = this.formNuevo.getRawValue();
    this.ejecutar(this.api.crearParametro(v.clave, v.valor.trim(), v.descripcion.trim()), 'Parámetro agregado.', () =>
      this.formNuevo.reset(),
    );
  }

  private cargar() {
    this.api.parametros().subscribe({
      next: (lista) => this.parametros.set(lista),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  // El backend rechaza valores fuera de rango (CU-34 flujo alterno) y aquí se muestra su mensaje
  private ejecutar(peticion: Observable<unknown>, exito: string, alTerminar?: () => void) {
    this.procesando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    peticion.subscribe({
      next: () => {
        this.mensaje.set(exito);
        this.procesando.set(false);
        alTerminar?.();
        this.cargar();
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.procesando.set(false);
      },
    });
  }
}
