import { Component, inject, signal, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DatePipe } from '@angular/common';
import { AusenciasService, Ausencia } from '../../core/ausencias.service';

@Component({
  selector: 'app-ausencias',
  standalone: true,
  imports: [FormsModule, DatePipe],
  template: `
    <div class="container py-3">
      <h3>Mis ausencias</h3>

      <div class="card card-body mb-3">
        <div class="row g-2">
          <div class="col-md-4">
            <label class="form-label">Desde</label>
            <input type="datetime-local" class="form-control" [(ngModel)]="inicio">
          </div>
          <div class="col-md-4">
            <label class="form-label">Hasta</label>
            <input type="datetime-local" class="form-control" [(ngModel)]="fin">
          </div>
          <div class="col-md-4">
            <label class="form-label">Motivo</label>
            <input class="form-control" [(ngModel)]="motivo" maxlength="300">
          </div>
        </div>
        <button class="btn btn-primary mt-3" (click)="guardar()">Registrar ausencia</button>

        @if (error()) {
          <div class="alert alert-danger mt-3">{{ error() }}</div>
        }

        @if (conflictos().length) {
          <div class="alert alert-warning mt-3">
            Tienes {{ conflictos().length }} trabajo(s) en ese periodo:
            <ul class="mb-2">
              @for (c of conflictos(); track c.id_trabajo) {
                <li>Trabajo #{{ c.id_trabajo }} — {{ c.fecha_inicio_prog | date:'short' }} ({{ c.estado }})</li>
              }
            </ul>
            <button class="btn btn-sm btn-warning" (click)="guardar(true)">Registrar de todas formas</button>
          </div>
        }
      </div>

      <ul class="list-group">
        @for (a of ausencias(); track a.id_ausencia) {
          <li class="list-group-item d-flex justify-content-between align-items-center">
            <span>
              {{ a.fecha_inicio | date:'short' }} → {{ a.fecha_fin | date:'short' }}
              @if (a.motivo) {
                <small class="text-muted"> · {{ a.motivo }}</small>
              }
            </span>
            <button class="btn btn-sm btn-outline-danger" (click)="cancelar(a.id_ausencia)">Cancelar</button>
          </li>
        } @empty {
          <li class="list-group-item text-muted">No tienes ausencias registradas.</li>
        }
      </ul>
    </div>
  `,
})
export class AusenciasPage implements OnInit {
  private svc = inject(AusenciasService);

  ausencias = signal<Ausencia[]>([]);
  conflictos = signal<any[]>([]);
  error = signal('');

  inicio = '';
  fin = '';
  motivo = '';

  ngOnInit() {
    this.cargar();
  }

  cargar() {
    this.svc.listar().subscribe((a) => this.ausencias.set(a));
  }

  guardar(forzar = false) {
    this.error.set('');
    if (!forzar) this.conflictos.set([]);
    this.svc
      .crear(
        { fecha_inicio: this.inicio, fecha_fin: this.fin, motivo: this.motivo || undefined },
        forzar,
      )
      .subscribe({
        next: () => {
          this.conflictos.set([]);
          this.inicio = this.fin = this.motivo = '';
          this.cargar();
        },
        error: (e) => {
          if (e.status === 409 && e.error?.trabajos) this.conflictos.set(e.error.trabajos);
          else this.error.set(e.error?.message ?? 'No se pudo registrar la ausencia');
        },
      });
  }

  cancelar(id: number) {
    this.svc.cancelar(id).subscribe(() => this.cargar());
  }
}