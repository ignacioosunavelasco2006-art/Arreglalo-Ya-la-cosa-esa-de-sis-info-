import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { Devolucion } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';
import { ParametrosService } from '../../core/parametros.service';
import { SupervisionService } from '../../core/supervision.service';

const DIA_MS = 86_400_000;

// RF-26 / RN-08: el dinero debe devolverse al cliente en un máximo de 3 días.
@Component({
  selector: 'app-devoluciones',
  imports: [RouterLink, DatePipe, CurrencyPipe, FormsModule, ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Devoluciones</h1>

    <div class="mb-3" style="max-width: 16rem">
      <select class="form-select form-select-sm" aria-label="Filtrar por estado"
              [ngModel]="filtro()" (ngModelChange)="cambiarFiltro($event)">
        <option value="">Todas</option>
        <option value="solicitada">Por resolver</option>
        <option value="aprobada">Aprobadas (por procesar)</option>
        <option value="procesada">Procesadas</option>
        <option value="rechazada">Rechazadas</option>
      </select>
    </div>

    @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (devoluciones().length === 0) {
      <div class="card"><div class="card-body text-center text-muted">No hay devoluciones.</div></div>
    } @else {
      <div class="row g-3">
        @for (d of devoluciones(); track d.id_devolucion) {
          <div class="col-12 col-lg-6">
            <div class="card h-100" [class.border-danger]="vencida(d)">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start">
                  <div>
                    <strong>{{ d.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>
                    <span class="small text-muted ms-2">{{ nombre(d.id_cliente) }}</span>
                  </div>
                  <span [class]="'badge text-bg-' + color(d.estado)">{{ d.estado }}</span>
                </div>
                <p class="small my-2">{{ d.motivo }}</p>
                <div class="small text-muted">
                  <a [routerLink]="['/trabajos', d.id_trabajo]">Trabajo #{{ d.id_trabajo }}</a>
                  · solicitada {{ d.fecha_solicitud | date: 'dd/MM/yyyy' }}
                  @if (d.id_reclamo) { · reclamo #{{ d.id_reclamo }} }
                </div>

                @if (d.estado === 'aprobada') {
                  <div class="small mt-1" [class.text-danger]="vencida(d)" [class.fw-bold]="vencida(d)">
                    Plazo: hasta el {{ limite(d) | date: 'dd/MM/yyyy HH:mm' }}
                    @if (vencida(d)) { — ¡VENCIDO! }
                  </div>
                }
                @if (d.motivo_rechazo) { <div class="small text-muted">Rechazo: {{ d.motivo_rechazo }}</div> }

                @if (d.estado === 'solicitada') {
                  @if (rechazando() === d.id_devolucion) {
                    <form class="d-flex gap-2 mt-2" [formGroup]="formRechazo" (ngSubmit)="rechazar(d)">
                      <input class="form-control form-control-sm" formControlName="motivo" placeholder="Motivo del rechazo" maxlength="300" />
                      <button class="btn btn-danger btn-sm" type="submit" [disabled]="procesando()">Rechazar</button>
                      <button class="btn btn-outline-secondary btn-sm" type="button" (click)="rechazando.set(null)">X</button>
                    </form>
                  } @else {
                    <div class="d-flex gap-2 mt-2">
                      <button class="btn btn-success btn-sm" type="button" [disabled]="procesando()" (click)="aprobar(d)">Aprobar</button>
                      <button class="btn btn-outline-danger btn-sm" type="button" (click)="abrirRechazo(d)">Rechazar</button>
                    </div>
                  }
                }
                @if (d.estado === 'aprobada') {
                  <button class="btn btn-primary btn-sm mt-2" type="button" [disabled]="procesando()" (click)="procesar(d)">
                    Marcar como devuelta
                  </button>
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class Devoluciones {
  private fb = inject(FormBuilder);
  private api = inject(SupervisionService);
  private admin = inject(AdminService);
  private parametros = inject(ParametrosService);

  filtro = signal('');
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  devoluciones = signal<Devolucion[]>([]);
  rechazando = signal<number | null>(null);
  private nombres = signal(new Map<number, string>());
  private diasPlazo = signal(3);

  formRechazo = this.fb.nonNullable.group({ motivo: ['', [Validators.required, Validators.maxLength(300)]] });

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Cliente #${id}`;
  }

  color(estado: string) {
    const colores: Record<string, string> = {
      solicitada: 'warning',
      aprobada: 'info',
      procesada: 'success',
      rechazada: 'secondary',
    };
    return colores[estado] ?? 'secondary';
  }

  // RN-08: el plazo corre desde la aprobación
  limite(d: Devolucion) {
    return new Date(new Date(d.fecha_aprobacion ?? d.fecha_solicitud).getTime() + this.diasPlazo() * DIA_MS);
  }

  vencida(d: Devolucion) {
    return d.estado === 'aprobada' && this.limite(d).getTime() < Date.now();
  }

  cambiarFiltro(valor: string) {
    this.filtro.set(valor);
    this.cargar();
  }

  aprobar(d: Devolucion) {
    this.ejecutar(this.api.resolverDevolucion(d.id_devolucion, true), 'Devolución aprobada: el plazo ya está corriendo.');
  }

  abrirRechazo(d: Devolucion) {
    this.formRechazo.reset();
    this.rechazando.set(d.id_devolucion);
  }

  rechazar(d: Devolucion) {
    if (this.formRechazo.invalid) return;
    this.ejecutar(
      this.api.resolverDevolucion(d.id_devolucion, false, this.formRechazo.getRawValue().motivo.trim()),
      'Devolución rechazada.',
      () => this.rechazando.set(null),
    );
  }

  procesar(d: Devolucion) {
    if (!confirm('¿Confirmas que el dinero ya fue devuelto al cliente?')) return;
    this.ejecutar(this.api.procesarDevolucion(d.id_devolucion), 'Devolución marcada como procesada.');
  }

  private cargar() {
    this.cargando.set(true);
    forkJoin({
      lista: this.api.devoluciones(this.filtro() || undefined),
      usuarios: this.admin.usuarios(),
      dias: this.parametros.numero('dias_devolucion', 3),
    }).subscribe({
      next: ({ lista, usuarios, dias }) => {
        this.devoluciones.set(lista);
        this.nombres.set(mapaNombres(usuarios));
        this.diasPlazo.set(dias);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

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
