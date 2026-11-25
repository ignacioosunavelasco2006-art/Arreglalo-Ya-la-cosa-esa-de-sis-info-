import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { CatalogosService } from '../../core/catalogos.service';
import { mensajeDeError } from '../../core/errores';
import { Categoria, OfertaPropia, Solicitud, Zona } from '../../core/modelos';
import { SolicitudesService } from '../../core/solicitudes.service';
import { EstadoBadge } from '../../shared/estado-badge';
import { Imagen } from '../../shared/imagen';

// RF-13 / CU-13: el trabajador revisa la solicitud (sin dirección exacta) y envía su oferta.
@Component({
  selector: 'app-oportunidad-detalle',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge, Imagen],
  template: `
    <a routerLink="/oportunidades" class="small">&larr; Volver a solicitudes disponibles</a>

    @if (cargando()) {
      <div class="text-muted mt-3">Cargando...</div>
    } @else if (!solicitud()) {
      <div class="alert alert-danger mt-3">{{ error() }}</div>
    } @else if (solicitud(); as s) {
      <h1 class="h3 mt-2 mb-1">{{ nombreCategoria() }}</h1>
      <app-estado tipo="solicitud" [valor]="s.estado" />

      <div class="card my-3"><div class="card-body">
        <p>{{ s.descripcion }}</p>
        <dl class="row small mb-0">
          <dt class="col-sm-3">Zona</dt><dd class="col-sm-9">{{ nombreZona() }}</dd>
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
        <div class="form-text mt-2">
          La dirección exacta solo se muestra al trabajador contratado.
        </div>
      </div></div>

      @if (miOferta(); as o) {
        <div class="alert alert-success">
          Ya enviaste una oferta de <strong>{{ o.precio_estimado | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>
          (<app-estado tipo="oferta" [valor]="o.estado" />).
          Puedes seguirla en <a routerLink="/mis-ofertas" class="alert-link">Mis ofertas</a>.
        </div>
      } @else if (s.estado === 'abierta') {
        <div class="card shadow-sm"><div class="card-body">
          <h2 class="h5">Envía tu oferta</h2>
          <form [formGroup]="form" (ngSubmit)="ofertar()" novalidate>
            <div class="mb-3" style="max-width: 16rem">
              <label class="form-label" for="precio">Precio estimado (Bs)</label>
              <input id="precio" type="number" min="1" step="0.01" class="form-control" formControlName="precio_estimado"
                     [class.is-invalid]="form.controls.precio_estimado.touched && form.controls.precio_estimado.invalid" />
              <div class="invalid-feedback">Indica un precio mayor a 0.</div>
              <div class="form-text">
                Es un estimado: al aceptarlo el cliente pasa a ser el precio final y no cambia sin su aprobación.
              </div>
            </div>
            <div class="mb-3">
              <label class="form-label" for="comentario">Comentario (opcional)</label>
              <textarea id="comentario" rows="3" class="form-control" formControlName="comentario" maxlength="500"
                        placeholder="Ej.: Puedo ir mañana por la tarde con los materiales"></textarea>
            </div>
            <div class="form-check mb-3">
              <input id="visita" class="form-check-input" type="checkbox" formControlName="requiere_visita" />
              <label class="form-check-label" for="visita">
                Necesito una visita previa para dar un precio definitivo
              </label>
            </div>

            @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }
            <button class="btn btn-primary" type="submit" [disabled]="enviando()">
              {{ enviando() ? 'Enviando...' : 'Enviar oferta' }}
            </button>
          </form>
        </div></div>
      } @else {
        <div class="alert alert-secondary">Esta solicitud ya no está abierta.</div>
      }
    }
  `,
})
export class OportunidadDetalle {
  private ruta = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private api = inject(SolicitudesService);
  private catalogos = inject(CatalogosService);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  solicitud = signal<Solicitud | null>(null);
  miOferta = signal<OfertaPropia | null>(null);
  private categorias = signal<Categoria[]>([]);
  private zonas = signal<Zona[]>([]);

  cargando = signal(true);
  enviando = signal(false);
  error = signal<string | null>(null);

  nombreCategoria = computed(
    () => this.categorias().find((c) => c.id_categoria === this.solicitud()?.id_categoria)?.nombre ?? 'Solicitud',
  );
  nombreZona = computed(() => this.zonas().find((z) => z.id_zona === this.solicitud()?.id_zona)?.nombre ?? '');

  form = this.fb.nonNullable.group({
    precio_estimado: [null as number | null, [Validators.required, Validators.min(0.01)]],
    comentario: [''],
    requiere_visita: [false],
  });

  constructor() {
    this.cargar();
  }

  ofertar() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const v = this.form.getRawValue();
    this.enviando.set(true);
    this.error.set(null);

    this.api
      .crearOferta(this.id, {
        precio_estimado: v.precio_estimado!,
        ...(v.comentario.trim() ? { comentario: v.comentario.trim() } : {}),
        requiere_visita: v.requiere_visita,
      })
      .subscribe({
        next: (oferta) => {
          this.miOferta.set(oferta);
          this.enviando.set(false);
        },
        // Aquí aparecen los avisos del backend: cruce de agenda, perfil no aprobado, cuenta suspendida...
        error: (e) => {
          this.error.set(mensajeDeError(e));
          this.enviando.set(false);
        },
      });
  }

  private cargar() {
    forkJoin({
      solicitud: this.api.obtener(this.id),
      ofertas: this.api.misOfertas(),
      catalogo: this.catalogos.todo(),
    }).subscribe({
      next: ({ solicitud, ofertas, catalogo }) => {
        this.solicitud.set(solicitud);
        this.miOferta.set(ofertas.find((o) => o.id_solicitud === this.id) ?? null);
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
}
