import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, OnInit, inject, input, output, signal } from '@angular/core';

import { mensajeDeError } from '../../core/errores';
import { VisitaPrevia } from '../../core/modelos';
import { TrabajosService } from '../../core/trabajos.service';
import { EstadoBadge } from '../../shared/estado-badge';

// RF-16 / CU-16: visita previa. El trabajador propone fecha, visita y propone un precio definitivo;
// el cliente acepta la fecha y luego acepta (o rechaza) ese precio. Solo con el precio aceptado
// se puede aceptar la oferta.
@Component({
  selector: 'app-visitas-oferta',
  imports: [DatePipe, CurrencyPipe, EstadoBadge],
  template: `
    <div class="border rounded p-2 bg-light small">
      <strong>Visita previa</strong>

      @if (cargando()) {
        <div class="text-muted">Cargando...</div>
      } @else {
        @for (v of visitas(); track v.id_visita) {
          <div class="mt-2 pt-2 border-top">
            <div class="d-flex justify-content-between align-items-center">
              <span>{{ v.fecha_propuesta | date: 'dd/MM/yyyy HH:mm' }}</span>
              <app-estado tipo="visita" [valor]="v.estado" />
            </div>

            @if (v.resultado) {
              <div class="mt-1">Resultado: {{ v.resultado }}</div>
            }
            @if (v.precio_definitivo) {
              <div>Precio definitivo propuesto:
                <strong>{{ v.precio_definitivo | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>
              </div>
            }

            @if (editable()) {
              <div class="mt-2 d-flex flex-wrap gap-2">
                @if (v.estado === 'propuesta') {
                  <button class="btn btn-sm btn-success" type="button" [disabled]="procesando()"
                          (click)="responder(v, 'aceptar_fecha')">Aceptar fecha</button>
                }
                @if (v.estado === 'realizada') {
                  <button class="btn btn-sm btn-success" type="button" [disabled]="procesando()"
                          (click)="responder(v, 'aceptar_precio')">Aceptar precio</button>
                }
                @if (v.estado === 'propuesta' || v.estado === 'aceptada' || v.estado === 'realizada') {
                  <button class="btn btn-sm btn-outline-danger" type="button" [disabled]="procesando()"
                          (click)="responder(v, 'rechazar')">Rechazar</button>
                }
              </div>
            }
          </div>
        } @empty {
          <div class="text-muted">El trabajador aún no propone una fecha de visita.</div>
        }
      }

      @if (error()) {
        <div class="text-danger mt-1">{{ error() }}</div>
      }
    </div>
  `,
})
export class VisitasOferta implements OnInit {
  private api = inject(TrabajosService);

  idOferta = input.required<number>();
  editable = input(true); // false cuando la solicitud ya no está abierta
  cambio = output<void>(); // avisa al padre para que recargue las ofertas

  visitas = signal<VisitaPrevia[]>([]);
  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);

  ngOnInit() {
    this.cargar();
  }

  responder(visita: VisitaPrevia, accion: 'aceptar_fecha' | 'aceptar_precio' | 'rechazar') {
    this.procesando.set(true);
    this.error.set(null);
    this.api.responderVisita(visita.id_visita, accion).subscribe({
      next: () => {
        this.procesando.set(false);
        this.cargar();
        this.cambio.emit();
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.procesando.set(false);
      },
    });
  }

  private cargar() {
    this.api.visitas(this.idOferta()).subscribe({
      next: (lista) => {
        this.visitas.set(lista);
        this.cargando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }
}
