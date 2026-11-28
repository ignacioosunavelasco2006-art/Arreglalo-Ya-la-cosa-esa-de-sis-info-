import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { ArchivosService } from '../../core/archivos.service';
import { mensajeDeError } from '../../core/errores';
import { NOMBRE_DOCUMENTO } from '../../core/estados';
import { DetalleTrabajadorSupervisor, Inspeccion, UsuarioLista } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';
import { SupervisionService } from '../../core/supervision.service';
import { EstadoBadge } from '../../shared/estado-badge';

// RF-09 y RF-10: el supervisor revisa documentos, programa inspecciones y decide.
@Component({
  selector: 'app-trabajador-revision',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge],
  template: `
    <a routerLink="/supervisor/trabajadores" class="small">&larr; Volver a la cola</a>

    @if (cargando()) {
      <div class="text-muted mt-3">Cargando...</div>
    } @else if (!detalle()) {
      <div class="alert alert-danger mt-3">{{ error() }}</div>
    } @else if (detalle(); as d) {
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 mb-3">
        <h1 class="h3 mb-0">{{ nombre(d.id_usuario) }}</h1>
        <app-estado tipo="verificacion" [valor]="d.estado_verificacion" />
      </div>

      @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
      @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

      <div class="row g-4">
        <div class="col-12 col-lg-7">
          <!-- Datos -->
          <div class="card mb-3"><div class="card-body">
            <h2 class="h5">Datos</h2>
            <dl class="row small mb-0">
              <dt class="col-sm-4">Correo</dt><dd class="col-sm-8">{{ usuario()?.correo }}</dd>
              <dt class="col-sm-4">Teléfono</dt><dd class="col-sm-8">{{ usuario()?.telefono }}</dd>
              <dt class="col-sm-4">Carnet</dt><dd class="col-sm-8">{{ d.carnet_identidad }}</dd>
              <dt class="col-sm-4">Experiencia</dt><dd class="col-sm-8">{{ d.anios_experiencia }} año(s)</dd>
              <dt class="col-sm-4">Descripción</dt><dd class="col-sm-8">{{ d.descripcion || '—' }}</dd>
              <dt class="col-sm-4">Servicios</dt>
              <dd class="col-sm-8">
                @for (c of d.categorias; track c.id_categoria) {
                  <span class="badge text-bg-secondary me-1">{{ c.nombre }}
                    @if (c.precio_estimado) { · {{ c.precio_estimado | currency: 'BOB' : 'Bs ' : '1.0-2' }} }
                  </span>
                } @empty { <span class="text-danger">Sin servicios</span> }
              </dd>
              <dt class="col-sm-4">Zonas</dt>
              <dd class="col-sm-8">
                @for (z of d.zonas; track z.id_zona) { <span class="badge text-bg-secondary me-1">{{ z.nombre }}</span> }
                @empty { <span class="text-danger">Sin zonas</span> }
              </dd>
              <dt class="col-sm-4">Datos bancarios</dt>
              <dd class="col-sm-8">
                <span [class]="d.tiene_datos_bancarios ? 'text-success' : 'text-danger'">
                  {{ d.tiene_datos_bancarios ? '✔ Registrados' : '✘ Faltan (obligatorios)' }}
                </span>
              </dd>
              @if (d.motivo_rechazo) {
                <dt class="col-sm-4">Última decisión</dt><dd class="col-sm-8">{{ d.motivo_rechazo }}</dd>
              }
            </dl>
          </div></div>

          <!-- Documentos -->
          <div class="card mb-3"><div class="card-body">
            <h2 class="h5">Documentos</h2>
            <ul class="list-group">
              @for (doc of d.documentos; track doc.id_documento) {
                <li class="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {{ nombreDocumento(doc.tipo) }}
                    <div class="small text-muted">{{ doc.fecha_subida | date: 'dd/MM/yyyy HH:mm' }}</div>
                  </div>
                  <button class="btn btn-outline-primary btn-sm" type="button" (click)="verDocumento(doc.ruta_archivo)">Ver</button>
                </li>
              } @empty {
                <li class="list-group-item text-danger">No subió documentos.</li>
              }
            </ul>
            <div class="small mt-2">
              <span [class]="tiene('carnet') ? 'text-success' : 'text-danger'">{{ tiene('carnet') ? '✔' : '✘' }} Carnet</span>
              ·
              <span [class]="tiene('antecedentes') ? 'text-success' : 'text-danger'">{{ tiene('antecedentes') ? '✔' : '✘' }} Antecedentes</span>
            </div>
          </div></div>

          <!-- Inspecciones -->
          <div class="card"><div class="card-body">
            <h2 class="h5">Inspecciones</h2>
            <p class="small text-muted">El costo del transporte del inspector lo paga el trabajador.</p>

            @for (i of d.inspecciones; track i.id_inspeccion) {
              <div class="border rounded p-2 mb-2 small">
                <div class="d-flex justify-content-between">
                  <strong>{{ i.fecha_programada | date: 'dd/MM/yyyy HH:mm' }}</strong>
                  <span class="badge text-bg-secondary">{{ i.estado }}</span>
                </div>
                <div>Inspector: {{ nombre(i.id_inspector) }}</div>
                @if (i.resultado) { <div>Resultado: {{ i.resultado }}</div> }
                @if (i.costo_transporte !== null) {
                  <div>Costo de transporte: {{ i.costo_transporte | currency: 'BOB' : 'Bs ' : '1.2-2' }}</div>
                }
                @if (i.estado !== 'realizada') {
                  @if (reprogramando() === i.id_inspeccion) {
                    <form class="d-flex gap-2 mt-2" [formGroup]="formReprogramar" (ngSubmit)="reprogramar(i)">
                      <input type="datetime-local" class="form-control form-control-sm" formControlName="fecha" />
                      <button class="btn btn-primary btn-sm" type="submit" [disabled]="procesando()">Guardar</button>
                      <button class="btn btn-outline-secondary btn-sm" type="button" (click)="reprogramando.set(null)">X</button>
                    </form>
                  } @else {
                    <button class="btn btn-link btn-sm p-0" type="button" (click)="reprogramando.set(i.id_inspeccion)">Reprogramar</button>
                  }
                }
              </div>
            } @empty {
              <div class="text-muted small mb-2">No hay inspecciones programadas.</div>
            }

            <form [formGroup]="formInspeccion" (ngSubmit)="programar()" class="row g-2 mt-1" novalidate>
              <div class="col-sm-5">
                <select class="form-select form-select-sm" formControlName="id_inspector" aria-label="Inspector">
                  <option [ngValue]="0">Inspector...</option>
                  @for (u of inspectores(); track u.id_usuario) {
                    <option [ngValue]="u.id_usuario">{{ u.nombres }} {{ u.apellidos }}</option>
                  }
                </select>
              </div>
              <div class="col-sm-5">
                <input type="datetime-local" class="form-control form-control-sm" formControlName="fecha" aria-label="Fecha de la visita" />
              </div>
              <div class="col-sm-2">
                <button class="btn btn-outline-primary btn-sm w-100" type="submit" [disabled]="procesando()">Programar</button>
              </div>
            </form>
            @if (inspectores().length === 0) {
              <div class="form-text">No hay inspectores: créalos en Super supervisor → Usuarios.</div>
            }
          </div></div>
        </div>

        <!-- Decisión -->
        <div class="col-12 col-lg-5">
          <div class="card border-primary"><div class="card-body">
            <h2 class="h5">Decisión</h2>
            <form [formGroup]="formDecision" (ngSubmit)="decidir()" novalidate>
              <div class="mb-2">
                <div class="form-check">
                  <input class="form-check-input" type="radio" id="d-ok" value="aprobado" formControlName="estado" />
                  <label class="form-check-label" for="d-ok">Aprobar (publica el perfil)</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" id="d-obs" value="observado" formControlName="estado" />
                  <label class="form-check-label" for="d-obs">Observar (pedir correcciones)</label>
                </div>
                <div class="form-check">
                  <input class="form-check-input" type="radio" id="d-no" value="rechazado" formControlName="estado" />
                  <label class="form-check-label" for="d-no">Rechazar</label>
                </div>
              </div>

              @if (formDecision.controls.estado.value !== 'aprobado') {
                <label class="form-label small" for="motivo">Motivo (el trabajador lo verá)</label>
                <textarea id="motivo" rows="3" class="form-control form-control-sm" formControlName="motivo" maxlength="300"
                          [class.is-invalid]="formDecision.controls.motivo.touched && formDecision.controls.motivo.invalid"></textarea>
                <div class="invalid-feedback">Indica el motivo.</div>
              } @else {
                <div class="small text-muted">
                  Para aprobar deben existir carnet, antecedentes y datos bancarios.
                </div>
              }

              <button class="btn btn-primary w-100 mt-3" type="submit" [disabled]="procesando()">Guardar decisión</button>
            </form>
          </div></div>
        </div>
      </div>
    }
  `,
})
export class TrabajadorRevision {
  private ruta = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private api = inject(SupervisionService);
  private admin = inject(AdminService);
  private archivos = inject(ArchivosService);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  detalle = signal<DetalleTrabajadorSupervisor | null>(null);
  private usuarios = signal<UsuarioLista[]>([]);
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  reprogramando = signal<number | null>(null);

  private nombres = computed(() => mapaNombres(this.usuarios()));
  usuario = computed(() => this.usuarios().find((u) => u.id_usuario === this.id));
  inspectores = computed(() => this.usuarios().filter((u) => u.roles.includes('inspector') && u.estado !== 'eliminada'));

  formDecision = this.fb.nonNullable.group({
    estado: ['aprobado' as 'aprobado' | 'observado' | 'rechazado'],
    motivo: [''],
  });
  formInspeccion = this.fb.nonNullable.group({ id_inspector: [0], fecha: [''] });
  formReprogramar = this.fb.nonNullable.group({ fecha: ['', Validators.required] });

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Usuario #${id}`;
  }

  nombreDocumento(tipo: string) {
    return NOMBRE_DOCUMENTO[tipo] ?? tipo;
  }

  tiene(tipo: string) {
    return !!this.detalle()?.documentos.some((d) => d.tipo === tipo);
  }

  verDocumento(ruta: string) {
    this.archivos.abrir(ruta, () => this.error.set('No se pudo abrir el documento.'));
  }

  decidir() {
    const v = this.formDecision.getRawValue();
    if (v.estado !== 'aprobado' && !v.motivo.trim()) {
      this.formDecision.controls.motivo.markAsTouched();
      this.formDecision.controls.motivo.setErrors({ required: true });
      return;
    }
    const textos: Record<string, string> = {
      aprobado: 'Perfil aprobado: ya aparece en las búsquedas.',
      observado: 'Se enviaron las observaciones al trabajador.',
      rechazado: 'Perfil rechazado.',
    };
    this.ejecutar(this.api.revisar(this.id, v.estado, v.motivo.trim() || undefined), textos[v.estado] ?? 'Listo.');
  }

  programar() {
    const v = this.formInspeccion.getRawValue();
    if (!v.id_inspector || !v.fecha) {
      this.error.set('Elige el inspector y la fecha de la visita.');
      return;
    }
    this.ejecutar(
      this.api.programarInspeccion(this.id, v.id_inspector, new Date(v.fecha).toISOString()),
      'Inspección programada: se avisó al inspector y al trabajador.',
      () => this.formInspeccion.reset({ id_inspector: 0, fecha: '' }),
    );
  }

  reprogramar(i: Inspeccion) {
    if (this.formReprogramar.invalid) return;
    this.ejecutar(
      this.api.reprogramarInspeccion(i.id_inspeccion, new Date(this.formReprogramar.getRawValue().fecha).toISOString()),
      'Inspección reprogramada.',
      () => this.reprogramando.set(null),
    );
  }

  private cargar() {
    forkJoin({ detalle: this.api.detalleTrabajador(this.id), usuarios: this.admin.usuarios() }).subscribe({
      next: ({ detalle, usuarios }) => {
        this.detalle.set(detalle);
        this.usuarios.set(usuarios);
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
