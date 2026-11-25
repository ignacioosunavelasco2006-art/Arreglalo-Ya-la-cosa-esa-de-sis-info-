import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';

import { mensajeDeError } from '../../core/errores';
import { NOMBRE_DIA } from '../../core/estados';
import { BloqueDisponibilidad, Calendario, ItemCalendario } from '../../core/modelos';
import { MiPerfilService } from '../../core/mi-perfil.service';
import { TrabajosService } from '../../core/trabajos.service';
import { EstadoBadge } from '../../shared/estado-badge';

const hoy = () => new Date().toISOString().slice(0, 10);
const enDias = (n: number) => new Date(Date.now() + n * 86_400_000).toISOString().slice(0, 10);

// RF-19 / CU-19: calendario de trabajos aceptados (por día y hora) y disponibilidad semanal.
@Component({
  selector: 'app-calendario',
  imports: [DatePipe, RouterLink, ReactiveFormsModule, EstadoBadge],
  template: `
    <h1 class="h3 mb-3">Mi calendario</h1>

    <div class="row g-4">
      <div class="col-12 col-lg-7">
        <form class="d-flex flex-wrap gap-2 align-items-end mb-3" [formGroup]="formRango" (ngSubmit)="cargar()">
          <div>
            <label class="form-label small mb-1" for="desde">Desde</label>
            <input id="desde" type="date" class="form-control form-control-sm" formControlName="desde" />
          </div>
          <div>
            <label class="form-label small mb-1" for="hasta">Hasta</label>
            <input id="hasta" type="date" class="form-control form-control-sm" formControlName="hasta" />
          </div>
          <button class="btn btn-outline-primary btn-sm" type="submit">Ver</button>
        </form>

        @if (errorCalendario()) { <div class="alert alert-danger py-2">{{ errorCalendario() }}</div> }

        @if (calendario()) {
          @if (diasAgrupados().length === 0) {
            <div class="card"><div class="card-body text-center text-muted">
              No tienes trabajos programados en ese período.
            </div></div>
          }
          @for (dia of diasAgrupados(); track dia.fecha) {
            <h2 class="h6 mt-3">{{ tituloDia(dia.fecha) }}</h2>
            @for (t of dia.trabajos; track t.id_trabajo) {
              <a class="card mb-2 text-decoration-none text-body" [routerLink]="['/trabajos', t.id_trabajo]">
                <div class="card-body py-2 d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{{ t.fecha_inicio_prog | date: 'HH:mm' }} – {{ t.fecha_fin_prog | date: 'HH:mm' }}</strong>
                    <span class="small text-muted ms-2">Trabajo #{{ t.id_trabajo }}</span>
                    <div class="small">{{ t.descripcion }}</div>
                  </div>
                  <app-estado tipo="trabajo" [valor]="t.estado" />
                </div>
              </a>
            }
          }
        }
      </div>

      <div class="col-12 col-lg-5">
        <div class="card"><div class="card-body">
          <h2 class="h5">Mi disponibilidad semanal</h2>
          <p class="small text-muted">Los horarios en los que normalmente puedes trabajar.</p>

          <ul class="list-group mb-3">
            @for (b of bloques(); track b.id_disponibilidad) {
              <li class="list-group-item d-flex justify-content-between align-items-center" [class.text-muted]="!b.activa">
                <span>{{ nombreDia(b.dia_semana) }} · {{ hora(b.hora_inicio) }} – {{ hora(b.hora_fin) }}</span>
                <button class="btn btn-sm" [class]="b.activa ? 'btn-outline-secondary' : 'btn-outline-success'"
                        type="button" (click)="alternar(b)">{{ b.activa ? 'Desactivar' : 'Activar' }}</button>
              </li>
            } @empty {
              <li class="list-group-item text-muted">Aún no definiste tu disponibilidad.</li>
            }
          </ul>

          <form [formGroup]="formBloque" (ngSubmit)="agregar()" novalidate>
            <div class="row g-2">
              <div class="col-12">
                <select class="form-select form-select-sm" formControlName="dia_semana" aria-label="Día">
                  @for (d of opcionesDia; track d.valor) { <option [ngValue]="d.valor">{{ d.texto }}</option> }
                </select>
              </div>
              <div class="col-6">
                <label class="form-label small mb-1" for="hi">Desde</label>
                <input id="hi" type="time" class="form-control form-control-sm" formControlName="hora_inicio" />
              </div>
              <div class="col-6">
                <label class="form-label small mb-1" for="hf">Hasta</label>
                <input id="hf" type="time" class="form-control form-control-sm" formControlName="hora_fin" />
              </div>
            </div>
            @if (errorBloque()) { <div class="text-danger small mt-2">{{ errorBloque() }}</div> }
            <button class="btn btn-primary btn-sm mt-2" type="submit">Agregar horario</button>
          </form>
        </div></div>
      </div>
    </div>
  `,
})
export class CalendarioPagina {
  private fb = inject(FormBuilder);
  private trabajosApi = inject(TrabajosService);
  private perfilApi = inject(MiPerfilService);

  opcionesDia = NOMBRE_DIA.map((texto, valor) => ({ valor, texto })).filter((d) => d.valor > 0);

  calendario = signal<Calendario | null>(null);
  bloques = signal<BloqueDisponibilidad[]>([]);
  errorCalendario = signal<string | null>(null);
  errorBloque = signal<string | null>(null);

  formRango = this.fb.nonNullable.group({ desde: [hoy()], hasta: [enDias(30)] });
  formBloque = this.fb.nonNullable.group({
    dia_semana: [1],
    hora_inicio: ['08:00', Validators.required],
    hora_fin: ['12:00', Validators.required],
  });

  // El backend agrupa por día UTC; aquí se vuelve a agrupar con la hora LOCAL del usuario,
  // para que un trabajo de las 21:00 no aparezca en el día siguiente.
  diasAgrupados = computed(() => {
    const c = this.calendario();
    if (!c) return [];
    const dos = (n: number) => String(n).padStart(2, '0');
    const mapa = new Map<string, ItemCalendario[]>();
    for (const dia of c.dias) {
      for (const t of dia.trabajos) {
        const f = new Date(t.fecha_inicio_prog);
        const clave = `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`;
        mapa.set(clave, [...(mapa.get(clave) ?? []), t]);
      }
    }
    return [...mapa.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([fecha, trabajos]) => ({ fecha, trabajos }));
  });

  constructor() {
    this.cargar();
    this.cargarBloques();
  }

  // "2026-12-03" -> "Jueves 03/12/2026"
  tituloDia(fecha: string) {
    const [a, m, d] = fecha.split('-').map(Number);
    const dia = new Date(a, m - 1, d).getDay(); // 0 = domingo
    return `${NOMBRE_DIA[dia === 0 ? 7 : dia]} ${String(d).padStart(2, '0')}/${String(m).padStart(2, '0')}/${a}`;
  }

  nombreDia(n: number) {
    return NOMBRE_DIA[n] ?? '';
  }

  // El backend devuelve "08:00:00"; se muestra "08:00"
  hora(valor: string) {
    return valor.slice(0, 5);
  }

  cargar() {
    this.errorCalendario.set(null);
    const { desde, hasta } = this.formRango.getRawValue();
    // "hasta" incluye el día completo
    this.trabajosApi
      .calendario(new Date(`${desde}T00:00:00`).toISOString(), new Date(`${hasta}T23:59:59`).toISOString())
      .subscribe({
        next: (c) => this.calendario.set(c),
        error: (e) => this.errorCalendario.set(mensajeDeError(e)),
      });
  }

  agregar() {
    if (this.formBloque.invalid) return;
    this.errorBloque.set(null);
    this.perfilApi.crearBloque(this.formBloque.getRawValue()).subscribe({
      next: () => this.cargarBloques(),
      error: (e) => this.errorBloque.set(mensajeDeError(e)),
    });
  }

  alternar(bloque: BloqueDisponibilidad) {
    this.perfilApi.actualizarBloque(bloque.id_disponibilidad, { activa: !bloque.activa }).subscribe({
      next: () => this.cargarBloques(),
      error: (e) => this.errorBloque.set(mensajeDeError(e)),
    });
  }

  private cargarBloques() {
    this.perfilApi.disponibilidad().subscribe({
      next: (lista) => this.bloques.set(lista),
      error: (e) => this.errorBloque.set(mensajeDeError(e)),
    });
  }
}
