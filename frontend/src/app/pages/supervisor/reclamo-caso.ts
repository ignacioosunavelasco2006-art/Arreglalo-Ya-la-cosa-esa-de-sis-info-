import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { ArchivosService } from '../../core/archivos.service';
import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/errores';
import { NOMBRE_MEDIO_PAGO, NOMBRE_TIPO_PAGO } from '../../core/estados';
import { CasoReclamo } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';
import { SupervisionService } from '../../core/supervision.service';
import { EstadoBadge } from '../../shared/estado-badge';

// Sección 8.14 / CU-33: el supervisor ve TODO el contexto del trabajo antes de decidir.
@Component({
  selector: 'app-reclamo-caso',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge],
  template: `
    <a routerLink="/supervisor/reclamos" class="small">&larr; Volver a reclamos</a>

    @if (cargando()) {
      <div class="text-muted mt-3">Cargando...</div>
    } @else if (!caso()) {
      <div class="alert alert-danger mt-3">{{ error() }}</div>
    } @else if (caso(); as c) {
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 mb-3">
        <h1 class="h3 mb-0">Reclamo #{{ c.reclamo.id_reclamo }}</h1>
        <div>
          <app-estado tipo="reclamo" [valor]="c.reclamo.estado" />
          @if (c.reclamo.escalado_super) { <span class="badge text-bg-danger ms-1">Escalado al super supervisor</span> }
        </div>
      </div>

      @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
      @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

      <div class="row g-4">
        <div class="col-12 col-lg-7">
          <div class="card mb-3"><div class="card-body">
            <h2 class="h5">Lo que reclama el cliente</h2>
            <div class="small text-muted mb-2">
              {{ nombre(c.reclamo.id_cliente) }} · {{ c.reclamo.fecha_reclamo | date: 'dd/MM/yyyy HH:mm' }}
            </div>
            <p>{{ c.reclamo.descripcion }}</p>

            <h3 class="h6">Evidencias</h3>
            <ul class="list-group">
              @for (e of c.evidencias; track e.id_evidencia) {
                <li class="list-group-item d-flex justify-content-between align-items-center py-2">
                  Evidencia #{{ e.id_evidencia }}
                  <button class="btn btn-outline-primary btn-sm" type="button" (click)="verArchivo(e.ruta_archivo)">Ver</button>
                </li>
              } @empty { <li class="list-group-item text-muted py-2">Sin evidencias.</li> }
            </ul>

            @if (c.reclamo.resolucion) {
              <div class="alert alert-light border mt-3 mb-0">
                <strong>Resolución:</strong> {{ c.reclamo.resolucion }}
              </div>
            }
          </div></div>

          <div class="card mb-3"><div class="card-body">
            <h2 class="h5">Trabajo #{{ c.trabajo.id_trabajo }}</h2>
            <dl class="row small mb-0">
              <dt class="col-sm-4">Cliente</dt><dd class="col-sm-8">{{ nombre(c.trabajo.id_cliente) }}</dd>
              <dt class="col-sm-4">Trabajador</dt><dd class="col-sm-8">{{ nombre(c.trabajo.id_trabajador) }}</dd>
              <dt class="col-sm-4">Precio acordado</dt><dd class="col-sm-8">{{ c.trabajo.precio_final | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
              <dt class="col-sm-4">Incrementos aceptados</dt><dd class="col-sm-8">{{ c.trabajo.total_incrementos | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
              <dt class="col-sm-4">Precio total</dt><dd class="col-sm-8 fw-bold">{{ c.trabajo.precio_total | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
              <dt class="col-sm-4">Método de pago</dt><dd class="col-sm-8">{{ medio(c.trabajo.metodo_pago) }}</dd>
              @if (c.calificacion) {
                <dt class="col-sm-4">Calificación</dt>
                <dd class="col-sm-8">★ {{ c.calificacion.puntaje }} {{ c.calificacion.comentario ? '— ' + c.calificacion.comentario : '' }}</dd>
              }
            </dl>
          </div></div>

          <div class="card mb-3"><div class="card-body">
            <h2 class="h5">Pagos</h2>
            <div class="table-responsive">
              <table class="table table-sm mb-0">
                <thead><tr><th>Concepto</th><th>Medio</th><th>Monto</th><th>Estado</th></tr></thead>
                <tbody>
                  @for (p of c.pagos; track p.id_pago) {
                    <tr>
                      <td>{{ tipoPago(p.tipo) }}</td><td>{{ medio(p.medio) }}</td>
                      <td>{{ p.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }}</td>
                      <td><app-estado tipo="pago" [valor]="p.estado" /></td>
                    </tr>
                  } @empty { <tr><td colspan="4" class="text-muted">Sin pagos.</td></tr> }
                </tbody>
              </table>
            </div>
            @if (c.devoluciones.length > 0) {
              <h3 class="h6 mt-3">Devoluciones</h3>
              @for (d of c.devoluciones; track d.id_devolucion) {
                <div class="small">{{ d.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }} — {{ d.estado }} — {{ d.motivo }}</div>
              }
            }
          </div></div>

          @if (c.incrementos.length > 0 || c.finalizaciones.length > 0) {
            <div class="card mb-3"><div class="card-body">
              <h2 class="h5">Incrementos y finalización</h2>
              @for (i of c.incrementos; track i.id_incremento) {
                <div class="small">Incremento {{ i.monto_adicional | currency: 'BOB' : 'Bs ' : '1.2-2' }} ({{ i.estado }}): {{ i.justificacion }}</div>
              }
              @for (f of c.finalizaciones; track f.id_finalizacion) {
                <div class="small">Finalización solicitada el {{ f.fecha_solicitud | date: 'dd/MM HH:mm' }} ({{ f.estado }})
                  {{ f.motivo_rechazo ? '— ' + f.motivo_rechazo : '' }}</div>
              }
            </div></div>
          }
        </div>

        <div class="col-12 col-lg-5">
          <div class="card mb-3"><div class="card-body">
            <h2 class="h5">Historial del trabajo</h2>
            <ul class="list-group list-group-flush">
              @for (h of c.historial; track $index) {
                <li class="list-group-item small px-0">
                  <app-estado tipo="trabajo" [valor]="h.estado_nuevo" />
                  <span class="text-muted ms-2">{{ h.fecha_cambio | date: 'dd/MM/yy HH:mm' }}</span>
                </li>
              }
            </ul>
          </div></div>

          <!-- Acciones según el estado -->
          @if (c.reclamo.estado === 'abierto') {
            <div class="card border-primary"><div class="card-body">
              <h2 class="h5">Tomar el caso</h2>
              <p class="small text-muted">Quedarás como supervisor asignado y se avisará a las partes.</p>
              <button class="btn btn-primary" type="button" [disabled]="procesando()" (click)="tomar()">Tomar en revisión</button>
            </div></div>
          }

          @if (c.reclamo.estado === 'en_revision') {
            @if (puedeResolver()) {
              <div class="card border-primary"><div class="card-body">
                <h2 class="h5">Resolver</h2>
                <form [formGroup]="form" (ngSubmit)="resolver()" novalidate>
                  <div class="mb-2">
                    <label class="form-label small mb-1" for="decision">Decisión</label>
                    <select id="decision" class="form-select form-select-sm" formControlName="decision">
                      <option value="desestimar">Desestimar el reclamo</option>
                      <option value="devolver_dinero">Devolver dinero al cliente</option>
                      <option value="sancionar">Sancionar al trabajador (queda en su historial)</option>
                      <option value="suspender">Suspender al trabajador</option>
                    </select>
                  </div>

                  @if (form.controls.decision.value === 'devolver_dinero') {
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="monto">Monto a devolver (Bs)</label>
                      <input id="monto" type="number" min="1" step="0.01" class="form-control form-control-sm" formControlName="monto" />
                      <div class="form-text">Se devuelve en un máximo de 3 días. No puede superar lo pagado por el cliente.</div>
                    </div>
                  }
                  @if (form.controls.decision.value === 'suspender') {
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="dias">Días de suspensión</label>
                      <input id="dias" type="number" min="1" max="365" class="form-control form-control-sm" formControlName="dias" />
                    </div>
                  }
                  @if (c.calificacion) {
                    <div class="mb-2">
                      <label class="form-label small mb-1" for="puntaje">Ajustar la calificación (opcional)</label>
                      <select id="puntaje" class="form-select form-select-sm" formControlName="puntaje">
                        <option [ngValue]="0">No cambiar (actual: {{ c.calificacion.puntaje }})</option>
                        @for (n of [1, 2, 3, 4, 5]; track n) { <option [ngValue]="n">{{ n }}</option> }
                      </select>
                    </div>
                  }

                  <div class="mb-2">
                    <label class="form-label small mb-1" for="resolucion">Resolución (la verán ambas partes)</label>
                    <textarea id="resolucion" rows="3" class="form-control form-control-sm" formControlName="resolucion" maxlength="500"
                              [class.is-invalid]="form.controls.resolucion.touched && form.controls.resolucion.invalid"></textarea>
                    <div class="invalid-feedback">Explica la decisión (mínimo 5 caracteres).</div>
                  </div>

                  <button class="btn btn-primary w-100" type="submit" [disabled]="procesando()">Aplicar resolución</button>
                </form>

                @if (!c.reclamo.escalado_super && esSupervisorSimple()) {
                  <hr />
                  <p class="small text-muted mb-2">Si el caso es grave puedes pasarlo al super supervisor.</p>
                  <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()" (click)="escalar()">
                    Escalar al super supervisor
                  </button>
                }
              </div></div>
            } @else {
              <div class="alert alert-info">
                @if (c.reclamo.escalado_super) { Este caso fue escalado: lo resuelve el super supervisor. }
                @else { Este caso lo atiende {{ nombre(c.reclamo.id_supervisor ?? 0) }}. }
              </div>
            }
          }
        </div>
      </div>
    }
  `,
})
export class ReclamoCaso {
  private ruta = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private api = inject(SupervisionService);
  private admin = inject(AdminService);
  private auth = inject(AuthService);
  private archivos = inject(ArchivosService);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  caso = signal<CasoReclamo | null>(null);
  private nombres = signal(new Map<number, string>());
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  esSuper = computed(() => this.auth.tieneRol('super_supervisor'));
  esSupervisorSimple = computed(() => this.auth.tieneRol('supervisor') && !this.esSuper());

  // Escalado: solo el super supervisor. Si no: el supervisor asignado (o un super supervisor).
  puedeResolver = computed(() => {
    const r = this.caso()?.reclamo;
    if (!r) return false;
    if (r.escalado_super) return this.esSuper();
    return this.esSuper() || r.id_supervisor === this.auth.usuario()?.id_usuario;
  });

  form = this.fb.nonNullable.group({
    decision: ['desestimar' as 'desestimar' | 'devolver_dinero' | 'sancionar' | 'suspender'],
    resolucion: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(500)]],
    monto: [null as number | null],
    dias: [null as number | null],
    puntaje: [0],
  });

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Usuario #${id}`;
  }

  tipoPago(t: string) {
    return NOMBRE_TIPO_PAGO[t] ?? t;
  }

  medio(m: string) {
    return NOMBRE_MEDIO_PAGO[m] ?? m;
  }

  verArchivo(ruta: string) {
    this.archivos.abrir(ruta, () => this.error.set('No se pudo abrir el archivo.'));
  }

  tomar() {
    this.ejecutar(this.api.tomarReclamo(this.id), 'Caso asignado a ti.');
  }

  escalar() {
    if (!confirm('¿Escalar este caso al super supervisor? Ya no podrás resolverlo tú.')) return;
    this.ejecutar(this.api.escalarReclamo(this.id), 'Caso escalado al super supervisor.');
  }

  resolver() {
    const v = this.form.getRawValue();
    if (this.form.controls.resolucion.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    if (v.decision === 'devolver_dinero' && !v.monto) {
      this.error.set('Indica el monto a devolver.');
      return;
    }
    if (v.decision === 'suspender' && !v.dias) {
      this.error.set('Indica los días de suspensión.');
      return;
    }
    if (!confirm('¿Aplicar esta resolución? Se notificará a ambas partes y no se puede deshacer.')) return;

    this.ejecutar(
      this.api.resolverReclamo(this.id, {
        decision: v.decision,
        resolucion: v.resolucion.trim(),
        ...(v.decision === 'devolver_dinero' ? { monto_devolucion: v.monto! } : {}),
        ...(v.decision === 'suspender' ? { dias_suspension: v.dias! } : {}),
        ...(v.puntaje ? { nuevo_puntaje: v.puntaje } : {}),
      }),
      'Reclamo resuelto y notificado a las partes.',
    );
  }

  private cargar() {
    forkJoin({ caso: this.api.caso(this.id), usuarios: this.admin.usuarios() }).subscribe({
      next: ({ caso, usuarios }) => {
        this.caso.set(caso);
        this.nombres.set(mapaNombres(usuarios));
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  private ejecutar(peticion: Observable<unknown>, exito: string) {
    this.procesando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    peticion.subscribe({
      next: () => {
        this.mensaje.set(exito);
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
