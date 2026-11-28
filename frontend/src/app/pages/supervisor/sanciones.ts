import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable, forkJoin } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { mensajeDeError } from '../../core/errores';
import { Incidente, Suspension, UsuarioLista } from '../../core/modelos';
import { mapaNombres } from '../../core/nombres';
import { SupervisionService } from '../../core/supervision.service';

// RF-08 y RF-33: incidentes de los trabajadores y suspensiones (automáticas, voluntarias y sanciones).
@Component({
  selector: 'app-sanciones',
  imports: [DatePipe, ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Incidentes y suspensiones</h1>

    <ul class="nav nav-tabs mb-3">
      <li class="nav-item">
        <button class="nav-link" [class.active]="pestana() === 'incidentes'" type="button" (click)="pestana.set('incidentes')">
          Incidentes
        </button>
      </li>
      <li class="nav-item">
        <button class="nav-link" [class.active]="pestana() === 'suspensiones'" type="button" (click)="pestana.set('suspensiones')">
          Suspensiones
        </button>
      </li>
    </ul>

    @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    @if (pestana() === 'incidentes') {
      <p class="small text-muted">
        Las cancelaciones del trabajador se registran solas. Al llegar al umbral (3, configurable en 2) la cuenta se
        suspende automáticamente. Puedes anular un incidente injustificado.
      </p>
      <div class="table-responsive mb-4">
        <table class="table table-sm align-middle bg-white">
          <thead><tr><th>Trabajador</th><th>Trabajo</th><th>Tipo</th><th>Fecha</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (i of incidentes(); track i.id_incidente) {
              <tr [class.text-muted]="i.anulado">
                <td>{{ nombre(i.id_trabajador) }}</td>
                <td>#{{ i.id_trabajo }}</td>
                <td>{{ i.tipo }}</td>
                <td>{{ i.fecha | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ i.anulado ? 'Anulado' : 'Vigente' }}</td>
                <td class="text-end">
                  @if (!i.anulado) {
                    <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="procesando()" (click)="anular(i)">Anular</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="6" class="text-muted text-center">Sin incidentes.</td></tr> }
          </tbody>
        </table>
      </div>

      <div class="card" style="max-width: 40rem"><div class="card-body">
        <h2 class="h6">Registrar un incidente manualmente</h2>
        <form [formGroup]="formIncidente" (ngSubmit)="registrarIncidente()" class="row g-2" novalidate>
          <div class="col-sm-5">
            <select class="form-select form-select-sm" formControlName="id_trabajador" aria-label="Trabajador">
              <option [ngValue]="0">Trabajador...</option>
              @for (u of trabajadores(); track u.id_usuario) { <option [ngValue]="u.id_usuario">{{ u.nombres }} {{ u.apellidos }}</option> }
            </select>
          </div>
          <div class="col-sm-3">
            <input type="number" min="1" class="form-control form-control-sm" formControlName="id_trabajo" placeholder="N.º de trabajo" />
          </div>
          <div class="col-sm-2">
            <select class="form-select form-select-sm" formControlName="tipo" aria-label="Tipo">
              <option value="atraso">Atraso</option>
              <option value="cancelacion">Cancelación</option>
            </select>
          </div>
          <div class="col-sm-2"><button class="btn btn-outline-primary btn-sm w-100" type="submit" [disabled]="procesando()">Registrar</button></div>
        </form>
      </div></div>
    }

    @if (pestana() === 'suspensiones') {
      <div class="table-responsive mb-4">
        <table class="table table-sm align-middle bg-white">
          <thead><tr><th>Usuario</th><th>Tipo</th><th>Motivo</th><th>Duración</th><th>Hasta</th><th>Estado</th><th></th></tr></thead>
          <tbody>
            @for (s of suspensiones(); track s.id_suspension) {
              <tr>
                <td>{{ nombre(s.id_usuario) }}</td>
                <td>{{ s.tipo }}</td>
                <td class="small">{{ s.motivo }}</td>
                <td>{{ s.dias_duracion }} día(s)</td>
                <td>{{ s.fecha_fin | date: 'dd/MM/yyyy HH:mm' }}</td>
                <td>{{ s.estado }}</td>
                <td class="text-end">
                  @if (s.estado === 'vigente' && s.tipo !== 'voluntaria') {
                    <button class="btn btn-outline-success btn-sm" type="button" [disabled]="procesando()" (click)="levantar(s)">Levantar</button>
                  }
                </td>
              </tr>
            } @empty { <tr><td colspan="7" class="text-muted text-center">Sin suspensiones.</td></tr> }
          </tbody>
        </table>
      </div>

      <div class="card" style="max-width: 40rem"><div class="card-body">
        <h2 class="h6">Suspender una cuenta (sanción)</h2>
        <p class="small text-muted">Mientras dure, el trabajador no puede ofertar, aceptar trabajos ni recibir solicitudes y su perfil aparece «no disponible».</p>
        <form [formGroup]="formSancion" (ngSubmit)="sancionar()" class="row g-2" novalidate>
          <div class="col-sm-6">
            <select class="form-select form-select-sm" formControlName="id_usuario" aria-label="Trabajador">
              <option [ngValue]="0">Trabajador...</option>
              @for (u of trabajadores(); track u.id_usuario) { <option [ngValue]="u.id_usuario">{{ u.nombres }} {{ u.apellidos }}</option> }
            </select>
          </div>
          <div class="col-sm-3">
            <input type="number" min="1" max="365" class="form-control form-control-sm" formControlName="dias" placeholder="Días" />
          </div>
          <div class="col-12">
            <input class="form-control form-control-sm" formControlName="motivo" placeholder="Motivo (obligatorio)" maxlength="300" />
          </div>
          <div class="col-12"><button class="btn btn-danger btn-sm" type="submit" [disabled]="procesando()">Suspender cuenta</button></div>
        </form>
      </div></div>
    }
  `,
})
export class Sanciones {
  private fb = inject(FormBuilder);
  private api = inject(SupervisionService);
  private admin = inject(AdminService);

  pestana = signal<'incidentes' | 'suspensiones'>('incidentes');
  incidentes = signal<Incidente[]>([]);
  suspensiones = signal<Suspension[]>([]);
  private usuarios = signal<UsuarioLista[]>([]);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  private nombres = computed(() => mapaNombres(this.usuarios()));
  trabajadores = computed(() => this.usuarios().filter((u) => u.roles.includes('trabajador') && u.estado !== 'eliminada'));

  formIncidente = this.fb.nonNullable.group({
    id_trabajador: [0],
    id_trabajo: [null as number | null],
    tipo: ['atraso'],
  });
  formSancion = this.fb.nonNullable.group({
    id_usuario: [0],
    dias: [null as number | null],
    motivo: ['', Validators.required],
  });

  constructor() {
    this.cargar();
  }

  nombre(id: number) {
    return this.nombres().get(id) ?? `Usuario #${id}`;
  }

  anular(i: Incidente) {
    if (!confirm('¿Anular este incidente? Ya no contará para la suspensión automática.')) return;
    this.ejecutar(this.api.anularIncidente(i.id_incidente), 'Incidente anulado.');
  }

  registrarIncidente() {
    const v = this.formIncidente.getRawValue();
    if (!v.id_trabajador || !v.id_trabajo) {
      this.error.set('Elige el trabajador e indica el número de trabajo.');
      return;
    }
    this.ejecutar(
      this.api.registrarIncidente(v.id_trabajador, v.id_trabajo, v.tipo),
      'Incidente registrado (si alcanzó el umbral, la cuenta se suspendió).',
      () => this.formIncidente.reset({ id_trabajador: 0, id_trabajo: null, tipo: 'atraso' }),
    );
  }

  sancionar() {
    const v = this.formSancion.getRawValue();
    if (!v.id_usuario || !v.dias || !v.motivo.trim()) {
      this.error.set('Elige el trabajador e indica los días y el motivo.');
      return;
    }
    if (!confirm('¿Suspender esta cuenta? Se avisará al trabajador.')) return;
    this.ejecutar(this.api.sancionar(v.id_usuario, v.dias, v.motivo.trim()), 'Cuenta suspendida.', () =>
      this.formSancion.reset({ id_usuario: 0, dias: null, motivo: '' }),
    );
  }

  levantar(s: Suspension) {
    if (!confirm('¿Levantar la suspensión? La cuenta vuelve a estar activa.')) return;
    this.ejecutar(this.api.levantarSuspension(s.id_suspension), 'Suspensión levantada.');
  }

  private cargar() {
    forkJoin({ i: this.api.incidentes(), s: this.api.suspensiones(), u: this.admin.usuarios() }).subscribe({
      next: ({ i, s, u }) => {
        this.incidentes.set(i);
        this.suspensiones.set(s);
        this.usuarios.set(u);
      },
      error: (e) => this.error.set(mensajeDeError(e)),
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
