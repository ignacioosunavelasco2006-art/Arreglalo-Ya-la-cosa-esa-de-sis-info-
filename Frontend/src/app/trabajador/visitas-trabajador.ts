import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, signal } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';

import { mensajeDeError } from '../../core/errores';
import { VisitaPrevia } from '../../core/modelos';
import { TrabajosService } from '../../core/trabajos.service';
import { EstadoBadge } from '../../shared/estado-badge';

function fechaFutura(control: AbstractControl): ValidationErrors | null {
  const v = control.value as string;
  return v && new Date(v).getTime() < Date.now() ? { pasada: true } : null;
}

// RF-16 (lado trabajador): propone la fecha de visita, la realiza y propone el precio definitivo.
@Component({
  selector: 'app-visitas-trabajador',
  imports: [DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge],
  template: `
    <div class="border rounded p-2 bg-light small mt-2">
      <strong>Visita previa</strong>

      @for (v of visitas(); track v.id_visita) {
        <div class="mt-2 pt-2 border-top">
          <div class="d-flex justify-content-between align-items-center">
            <span>{{ v.fecha_propuesta | date: 'dd/MM/yyyy HH:mm' }}</span>
            <app-estado tipo="visita" [valor]="v.estado" />
          </div>

          @if (v.estado === 'propuesta') {
            <div class="text-muted">Esperando que el cliente acepte la fecha.</div>
          }

          @if (v.estado === 'aceptada') {
            <form class="mt-2" [formGroup]="formResultado" (ngSubmit)="registrarResultado(v)" novalidate>
              <div class="text-muted mb-1">El cliente aceptó la fecha. Tras la visita, registra el resultado:</div>
              <textarea rows="2" class="form-control form-control-sm mb-1" formControlName="resultado"
                        placeholder="Qué encontraste y qué hay que hacer" maxlength="500"
                        [class.is-invalid]="formResultado.controls.resultado.touched && formResultado.controls.resultado.invalid"></textarea>
              <input type="number" min="1" step="0.01" class="form-control form-control-sm mb-1" style="max-width: 12rem"
                     formControlName="precio_definitivo" placeholder="Precio definitivo (Bs)"
                     [class.is-invalid]="formResultado.controls.precio_definitivo.touched && formResultado.controls.precio_definitivo.invalid" />
              <button class="btn btn-primary btn-sm" type="submit" [disabled]="procesando()">Registrar resultado</button>
            </form>
          }

          @if (v.estado === 'realizada') {
            <div>Propusiste <strong>{{ v.precio_definitivo | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>.
              <span class="text-muted">Esperando respuesta del cliente.</span></div>
          }
          @if (v.estado === 'precio_aceptado') {
            <div class="text-success">El cliente aceptó el precio: ya puede aceptar tu oferta.</div>
          }
        </div>
      }

      @if (puedeProponer()) {
        <form class="mt-2 pt-2 border-top" [formGroup]="formFecha" (ngSubmit)="proponer()" novalidate>
          <label class="form-label mb-1" [for]="'fecha-' + idOferta()">Propón una fecha para visitar el lugar</label>
          <div class="d-flex flex-wrap gap-2">
            <input type="datetime-local" class="form-control form-control-sm w-auto" [id]="'fecha-' + idOferta()"
                   formControlName="fecha" [class.is-invalid]="formFecha.controls.fecha.touched && formFecha.controls.fecha.invalid" />
            <button class="btn btn-outline-primary btn-sm" type="submit" [disabled]="procesando()">Proponer fecha</button>
          </div>
          @if (formFecha.controls.fecha.touched && formFecha.controls.fecha.invalid) {
            <div class="text-danger">Elige una fecha futura.</div>
          }
        </form>
      }

      @if (error()) { <div class="text-danger mt-1">{{ error() }}</div> }
    </div>
  `,
})
export class VisitasTrabajador implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(TrabajosService);

  idOferta = input.required<number>();
  // Solo se puede proponer visita mientras la oferta siga pendiente
  activa = input(true);

  visitas = signal<VisitaPrevia[]>([]);
  procesando = signal(false);
  error = signal<string | null>(null);

  formFecha = this.fb.nonNullable.group({ fecha: ['', [Validators.required, fechaFutura]] });
  formResultado = this.fb.nonNullable.group({
    resultado: ['', [Validators.required, Validators.minLength(5)]],
    precio_definitivo: [null as number | null, [Validators.required, Validators.min(0.01)]],
  });

  // Se puede proponer una nueva fecha si no hay una visita en curso (propuesta, aceptada o realizada)
  puedeProponer() {
    const enCurso = this.visitas().some((v) => ['propuesta', 'aceptada', 'realizada', 'precio_aceptado'].includes(v.estado));
    return this.activa() && !enCurso;
  }

  ngOnInit() {
    this.cargar();
  }

  proponer() {
    if (this.formFecha.invalid) {
      this.formFecha.markAllAsTouched();
      return;
    }
    this.ejecutar(this.api.proponerVisita(this.idOferta(), new Date(this.formFecha.getRawValue().fecha).toISOString()));
    this.formFecha.reset();
  }

  registrarResultado(visita: VisitaPrevia) {
    if (this.formResultado.invalid) {
      this.formResultado.markAllAsTouched();
      return;
    }
    const v = this.formResultado.getRawValue();
    this.ejecutar(this.api.registrarResultadoVisita(visita.id_visita, v.resultado.trim(), v.precio_definitivo!));
    this.formResultado.reset();
  }

  private ejecutar(peticion: Observable<unknown>) {
    this.procesando.set(true);
    this.error.set(null);
    peticion.subscribe({
      next: () => {
        this.procesando.set(false);
        this.cargar();
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.procesando.set(false);
      },
    });
  }

  private cargar() {
    this.api.visitas(this.idOferta()).subscribe({
      next: (lista) => this.visitas.set(lista),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }
}
