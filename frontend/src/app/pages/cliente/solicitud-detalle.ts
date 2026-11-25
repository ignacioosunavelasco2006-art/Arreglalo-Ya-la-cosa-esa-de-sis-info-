import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { Categoria, Oferta, Solicitud, Zona } from '../../core/modelos';
import { SolicitudesService } from '../../core/solicitudes.service';
import { TrabajosService } from '../../core/trabajos.service';
import { EstadoBadge } from '../../shared/estado-badge';
import { Imagen } from '../../shared/imagen';
import { VisitasOferta } from './visitas-oferta';

// Horario del trabajo: inicio en el futuro y fin posterior al inicio
function horarioValido(grupo: AbstractControl): ValidationErrors | null {
  const inicio = grupo.get('inicio')?.value as string;
  const fin = grupo.get('fin')?.value as string;
  if (!inicio || !fin) return null;
  const i = new Date(inicio).getTime();
  const f = new Date(fin).getTime();
  if (i < Date.now()) return { inicioPasado: true };
  if (f <= i) return { finAntes: true };
  return null;
}

@Component({
  selector: 'app-solicitud-detalle',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge, VisitasOferta, Imagen],
  template: `
    <a routerLink="/solicitudes" class="small">&larr; Volver a mis solicitudes</a>

    @if (cargando()) {
      <div class="text-muted mt-3">Cargando...</div>
    } @else if (error() && !solicitud()) {
      <div class="alert alert-danger mt-3">{{ error() }}</div>
    } @else if (solicitud(); as s) {
      <div class="d-flex flex-wrap justify-content-between align-items-start gap-2 mt-2 mb-3">
        <div>
          <h1 class="h3 mb-1">{{ nombreCategoria() }}</h1>
          <app-estado tipo="solicitud" [valor]="s.estado" />
        </div>
        @if (s.estado === 'abierta') {
          <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()"
                  (click)="cancelarSolicitud()">Cancelar solicitud</button>
        }
      </div>

      @if (error()) {
        <div class="alert alert-danger py-2">{{ error() }}</div>
      }

      <div class="card mb-4">
        <div class="card-body">
          <p>{{ s.descripcion }}</p>
          <dl class="row small mb-0">
            <dt class="col-sm-3">Zona</dt><dd class="col-sm-9">{{ nombreZona() }}</dd>
            <dt class="col-sm-3">Dirección</dt><dd class="col-sm-9">{{ s.direccion_exacta }}</dd>
            <dt class="col-sm-3">Fecha deseada</dt>
            <dd class="col-sm-9">{{ s.fecha_deseada | date: 'dd/MM/yyyy HH:mm' }}</dd>
            @if (s.presupuesto_aproximado) {
              <dt class="col-sm-3">Presupuesto</dt>
              <dd class="col-sm-9">{{ s.presupuesto_aproximado | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
            }
            <dt class="col-sm-3">Vence</dt>
            <dd class="col-sm-9">{{ s.fecha_vencimiento | date: 'dd/MM/yyyy' }}</dd>
          </dl>
          @if (s.fotos?.length) {
            <div class="d-flex flex-wrap gap-2 mt-3">
              @for (f of s.fotos; track f.ruta_archivo) {
                <app-imagen [ruta]="f.ruta_archivo" alt="Foto del problema" />
              }
            </div>
          }
        </div>
      </div>

      <h2 class="h5">Ofertas recibidas ({{ ofertas().length }})</h2>

      @if (ofertas().length === 0) {
        <div class="card"><div class="card-body text-muted text-center">
          @if (s.estado === 'abierta') {
            Aún no recibiste ofertas. Te avisaremos cuando llegue una.
          } @else {
            Esta solicitud no recibió ofertas.
          }
        </div></div>
      }

      <div class="row g-3">
        @for (o of ofertas(); track o.id_oferta) {
          <div class="col-12 col-lg-6">
            <div class="card h-100" [class.border-success]="o.estado === 'aceptada'">
              <div class="card-body">
                <div class="d-flex justify-content-between align-items-start mb-2">
                  <div>
                    @if (o.trabajador; as t) {
                      <a [routerLink]="['/trabajadores', t.id_usuario]" class="fw-bold">{{ t.nombre ?? 'Trabajador' }}</a>
                      <div class="small text-muted">
                        @if (t.etiqueta === 'nuevo') {
                          <span class="badge text-bg-info">Nuevo</span>
                        } @else {
                          ★ {{ t.calificacion_promedio }} ({{ t.total_calificaciones }})
                        }
                        · {{ t.anios_experiencia }} año(s) de experiencia
                      </div>
                    }
                  </div>
                  <app-estado tipo="oferta" [valor]="o.estado" />
                </div>

                <div class="h5">{{ o.precio_estimado | currency: 'BOB' : 'Bs ' : '1.2-2' }}
                  <span class="small text-muted fw-normal">precio estimado</span>
                </div>
                @if (o.comentario) {
                  <p class="small">{{ o.comentario }}</p>
                }

                @if (o.requiere_visita) {
                  <div class="my-2">
                    <span class="badge text-bg-warning mb-2">Requiere visita previa</span>
                    <app-visitas-oferta [idOferta]="o.id_oferta" [editable]="s.estado === 'abierta' && o.estado === 'pendiente'"
                                        (cambio)="cargar()" />
                  </div>
                }

                @if (s.estado === 'abierta' && o.estado === 'pendiente') {
                  @if (aceptando() === o.id_oferta) {
                    <form class="border rounded p-3 mt-2" [formGroup]="formAceptar" (ngSubmit)="confirmarAceptacion(o)" novalidate>
                      <div class="mb-2">
                        <label class="form-label small mb-1" [for]="'pago-' + o.id_oferta">Método de pago</label>
                        <select class="form-select form-select-sm" [id]="'pago-' + o.id_oferta" formControlName="metodo_pago">
                          <option value="plataforma">Plataforma (anticipo protegido)</option>
                          <option value="qr">QR</option>
                          <option value="efectivo">Efectivo</option>
                        </select>
                      </div>
                      <div class="row g-2">
                        <div class="col-6">
                          <label class="form-label small mb-1" [for]="'ini-' + o.id_oferta">Inicio del trabajo</label>
                          <input type="datetime-local" class="form-control form-control-sm" [id]="'ini-' + o.id_oferta"
                                 formControlName="inicio" />
                        </div>
                        <div class="col-6">
                          <label class="form-label small mb-1" [for]="'fin-' + o.id_oferta">Fin estimado</label>
                          <input type="datetime-local" class="form-control form-control-sm" [id]="'fin-' + o.id_oferta"
                                 formControlName="fin" />
                        </div>
                      </div>
                      @if (formAceptar.touched && formAceptar.invalid) {
                        <div class="text-danger small mt-1">
                          @if (formAceptar.hasError('inicioPasado')) { El inicio no puede ser pasado. }
                          @else if (formAceptar.hasError('finAntes')) { El fin debe ser posterior al inicio. }
                          @else { Indica el horario del trabajo. }
                        </div>
                      }
                      <div class="form-text">
                        Al aceptar, el precio estimado pasa a ser el precio final y se te pedirá el anticipo.
                      </div>
                      <div class="d-flex gap-2 mt-2">
                        <button class="btn btn-success btn-sm" type="submit" [disabled]="procesando()">Confirmar aceptación</button>
                        <button class="btn btn-outline-secondary btn-sm" type="button" (click)="aceptando.set(null)">Volver</button>
                      </div>
                    </form>
                  } @else {
                    <div class="d-flex gap-2 mt-2">
                      <button class="btn btn-success btn-sm" type="button" [disabled]="procesando()"
                              (click)="abrirAceptar(o)">Aceptar oferta</button>
                      <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()"
                              (click)="rechazar(o)">Rechazar</button>
                    </div>
                  }
                }
              </div>
            </div>
          </div>
        }
      </div>
    }
  `,
})
export class SolicitudDetalle {
  private ruta = inject(ActivatedRoute);
  private router = inject(Router);
  private fb = inject(FormBuilder);
  private api = inject(SolicitudesService);
  private trabajosApi = inject(TrabajosService);
  private catalogos = inject(CatalogosService);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  solicitud = signal<Solicitud | null>(null);
  ofertas = signal<Oferta[]>([]);
  private categorias = signal<Categoria[]>([]);
  private zonas = signal<Zona[]>([]);

  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  aceptando = signal<number | null>(null); // id de la oferta cuyo formulario de aceptación está abierto

  nombreCategoria = computed(
    () => this.categorias().find((c) => c.id_categoria === this.solicitud()?.id_categoria)?.nombre ?? 'Solicitud',
  );
  nombreZona = computed(
    () => this.zonas().find((z) => z.id_zona === this.solicitud()?.id_zona)?.nombre ?? '',
  );

  formAceptar = this.fb.nonNullable.group(
    {
      metodo_pago: ['plataforma'],
      inicio: ['', Validators.required],
      fin: ['', Validators.required],
    },
    { validators: horarioValido },
  );

  constructor() {
    this.cargar();
  }

  cargar() {
    forkJoin({
      solicitud: this.api.obtener(this.id),
      ofertas: this.api.ofertas(this.id),
      catalogo: this.catalogos.todo(),
    }).subscribe({
      next: ({ solicitud, ofertas, catalogo }) => {
        this.solicitud.set(solicitud);
        this.ofertas.set(ofertas);
        this.categorias.set(catalogo.categorias);
        this.zonas.set(catalogo.zonas);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  abrirAceptar(oferta: Oferta) {
    this.error.set(null);
    this.formAceptar.reset({ metodo_pago: 'plataforma', inicio: '', fin: '' });
    this.aceptando.set(oferta.id_oferta);
  }

  confirmarAceptacion(oferta: Oferta) {
    if (this.formAceptar.invalid) {
      this.formAceptar.markAllAsTouched();
      return;
    }
    const v = this.formAceptar.getRawValue();
    this.procesando.set(true);
    this.error.set(null);

    this.trabajosApi
      .aceptarOferta({
        id_oferta: oferta.id_oferta,
        metodo_pago: v.metodo_pago,
        fecha_inicio_prog: new Date(v.inicio).toISOString(),
        fecha_fin_prog: new Date(v.fin).toISOString(),
      })
      .subscribe({
        // Siguiente paso: pagar el anticipo en la pantalla del trabajo
        next: (trabajo) => this.router.navigate(['/trabajos', trabajo.id_trabajo]),
        error: (e) => {
          this.error.set(mensajeDeError(e));
          this.procesando.set(false);
        },
      });
  }

  rechazar(oferta: Oferta) {
    if (!confirm('¿Rechazar esta oferta? Se avisará al trabajador.')) return;
    this.ejecutar(this.api.rechazarOferta(oferta.id_oferta));
  }

  cancelarSolicitud() {
    if (!confirm('¿Cancelar la solicitud? Las ofertas pendientes se rechazarán.')) return;
    this.ejecutar(this.api.cancelar(this.id));
  }

  // Ejecuta una acción, y al terminar recarga la pantalla
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
}
