import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { forkJoin } from 'rxjs';

import { ArchivosService } from '../../core/archivos.service';
import { mensajeDeError } from '../../core/errores';
import { ArchivoSubido, Devolucion, ReclamoConEvidencias } from '../../core/modelos';
import { ReclamosService } from '../../core/reclamos.service';
import { EstadoBadge } from '../../shared/estado-badge';
import { SubirArchivo } from '../../shared/subir-archivo';

@Component({
  selector: 'app-reclamo-detalle',
  imports: [RouterLink, DatePipe, CurrencyPipe, EstadoBadge, SubirArchivo],
  template: `
    <a routerLink="/reclamos" class="small">&larr; Volver a mis reclamos</a>

    @if (cargando()) {
      <div class="text-muted mt-3">Cargando...</div>
    } @else if (!reclamo()) {
      <div class="alert alert-danger mt-3">{{ error() }}</div>
    } @else if (reclamo(); as r) {
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 mb-3">
        <h1 class="h3 mb-0">Reclamo #{{ r.id_reclamo }}</h1>
        <app-estado tipo="reclamo" [valor]="r.estado" />
      </div>

      @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

      <div class="card mb-3"><div class="card-body">
        <div class="small text-muted mb-2">
          <a [routerLink]="['/trabajos', r.id_trabajo]">Trabajo #{{ r.id_trabajo }}</a>
          · presentado el {{ r.fecha_reclamo | date: 'dd/MM/yyyy HH:mm' }}
        </div>
        <p>{{ r.descripcion }}</p>

        @if (r.estado === 'abierto') { <div class="alert alert-info py-2 small mb-0">Esperando que un supervisor tome tu caso.</div> }
        @if (r.estado === 'en_revision') { <div class="alert alert-info py-2 small mb-0">Un supervisor está revisando tu caso. Puedes agregar más evidencias.</div> }
        @if (r.resolucion) {
          <div class="alert alert-success mb-0"><strong>Resolución:</strong> {{ r.resolucion }}</div>
        }
      </div></div>

      <div class="card mb-3"><div class="card-body">
        <h2 class="h5">Evidencias</h2>
        <ul class="list-group mb-3">
          @for (e of r.evidencias; track e.id_evidencia) {
            <li class="list-group-item d-flex justify-content-between align-items-center py-2">
              Evidencia #{{ e.id_evidencia }}
              <button class="btn btn-outline-primary btn-sm" type="button" (click)="ver(e.ruta_archivo)">Ver</button>
            </li>
          } @empty { <li class="list-group-item text-muted py-2">Sin evidencias.</li> }
        </ul>
        @if (r.estado === 'abierto' || r.estado === 'en_revision') {
          <app-subir-archivo tipo="evidencia" aceptar="image/jpeg,image/png,image/webp,application/pdf" (subido)="agregar($event)" />
        }
      </div></div>

      @if (devolucionesDelReclamo().length > 0) {
        <div class="card"><div class="card-body">
          <h2 class="h5">Devolución</h2>
          @for (d of devolucionesDelReclamo(); track d.id_devolucion) {
            <div>{{ d.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }} — {{ d.estado }}</div>
          }
        </div></div>
      }
    }
  `,
})
export class ReclamoDetalle {
  private ruta = inject(ActivatedRoute);
  private api = inject(ReclamosService);
  private archivos = inject(ArchivosService);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  reclamo = signal<ReclamoConEvidencias | null>(null);
  private devoluciones = signal<Devolucion[]>([]);
  cargando = signal(true);
  error = signal<string | null>(null);

  devolucionesDelReclamo = computed(() => this.devoluciones().filter((d) => d.id_reclamo === this.id));

  constructor() {
    this.cargar();
  }

  ver(ruta: string) {
    this.archivos.abrir(ruta, () => this.error.set('No se pudo abrir el archivo.'));
  }

  agregar(archivo: ArchivoSubido) {
    this.error.set(null);
    this.api.agregarEvidencia(this.id, archivo.ruta).subscribe({
      next: () => this.cargar(),
      error: (e) => this.error.set(mensajeDeError(e)),
    });
  }

  private cargar() {
    forkJoin({ reclamo: this.api.obtener(this.id), devoluciones: this.api.misDevoluciones() }).subscribe({
      next: ({ reclamo, devoluciones }) => {
        this.reclamo.set(reclamo);
        this.devoluciones.set(devoluciones);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
