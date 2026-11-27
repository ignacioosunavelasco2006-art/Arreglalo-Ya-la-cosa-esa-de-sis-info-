import { CurrencyPipe, DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Observable, catchError, forkJoin, of } from 'rxjs';

import { AuthService } from '../core/auth.service';
import { CalificacionesService } from '../core/calificaciones.service';
import { mensajeDeError } from '../core/errores';
import { NOMBRE_MEDIO_PAGO, NOMBRE_TIPO_PAGO } from '../core/estados';
import {
  CalificacionRecibida,
  Finalizacion,
  Incremento,
  Pago,
  Reprogramacion,
  TrabajoDetalle,
} from '../core/modelos';
import { PagosService } from '../core/pagos.service';
import { ParametrosService } from '../core/parametros.service';
import { TrabajosService } from '../core/trabajos.service';
import { EstadoBadge } from '../shared/estado-badge';

const ESTADOS_CANCELABLES = ['pendiente_anticipo', 'programado', 'en_camino'];
const ESTADOS_REPROGRAMABLES = ['pendiente_anticipo', 'programado'];

@Component({
  selector: 'app-ver-trabajo',
  imports: [RouterLink, DatePipe, CurrencyPipe, ReactiveFormsModule, EstadoBadge],
  template: `
    <a routerLink="/trabajos" class="small">&larr; Volver a mis trabajos</a>

    @if (cargando()) {
      <div class="text-muted mt-3">Cargando...</div>
    } @else if (!trabajo()) {
      <div class="alert alert-danger mt-3">{{ error() }}</div>
    } @else if (trabajo(); as t) {
      <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mt-2 mb-3">
        <h1 class="h3 mb-0">Trabajo #{{ t.id_trabajo }}</h1>
        <app-estado tipo="trabajo" [valor]="t.estado" />
      </div>

      @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
      @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

      <!-- ====== REPROGRAMACIÓN DE HORARIO (CLIENTE O TRABAJADOR) ====== -->
      @if (reprogramacionPendiente(); as rep) {
        @if (rep.id_solicitante === usuarioId()) {
          <div class="alert alert-info mb-3">
            <strong>Solicitud de reprogramación pendiente:</strong> propusiste cambiar el horario al
            <strong>{{ rep.fecha_inicio_propuesta | date: 'dd/MM/yyyy HH:mm' }}</strong>
            - <strong>{{ rep.fecha_fin_propuesta | date: 'dd/MM/yyyy HH:mm' }}</strong>.
            Esperando respuesta de la otra parte.
          </div>
        } @else {
          <div class="card border-info mb-3"><div class="card-body">
            <h2 class="h6">Solicitud de reprogramación de horario</h2>
            <p class="small mb-1">
              Nuevo horario propuesto:
              <strong>{{ rep.fecha_inicio_propuesta | date: 'dd/MM/yyyy HH:mm' }}</strong>
              a
              <strong>{{ rep.fecha_fin_propuesta | date: 'dd/MM/yyyy HH:mm' }}</strong>
            </p>
            <p class="small mb-2">Motivo: {{ rep.motivo }}</p>

            @if (!mostrarRechazoReprog()) {
              <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm" type="button" [disabled]="procesando()"
                        (click)="aceptarReprogramacion(rep)">Aceptar nuevo horario</button>
                <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()"
                        (click)="mostrarRechazoReprog.set(true)">Rechazar</button>
              </div>
            } @else {
              <form [formGroup]="formRechazoReprog" (ngSubmit)="rechazarReprogramacion(rep)" novalidate>
                <label class="form-label small" for="motivo-rechazo-reprog">Motivo del rechazo</label>
                <textarea id="motivo-rechazo-reprog" rows="2" class="form-control form-control-sm"
                          formControlName="motivo"
                          [class.is-invalid]="formRechazoReprog.controls.motivo.touched && formRechazoReprog.controls.motivo.invalid"></textarea>
                <div class="invalid-feedback">Indica el motivo del rechazo.</div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-danger btn-sm" type="submit" [disabled]="procesando()">Confirmar rechazo</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" (click)="mostrarRechazoReprog.set(false)">Volver</button>
                </div>
              </form>
            }
          </div></div>
        }
      } @else if (puedeReprogramar()) {
        <div class="mb-3">
          @if (!mostrarFormReprog()) {
            <button class="btn btn-outline-primary btn-sm" type="button" (click)="mostrarFormReprog.set(true)">
              Solicitar reprogramación de horario
            </button>
          } @else {
            <div class="card border-primary"><div class="card-body">
              <h2 class="h6">Solicitar reprogramación</h2>
              <p class="small text-muted mb-2">
                Propón una nueva fecha y hora. La otra parte deberá aceptarla para que el horario cambie.
              </p>
              <form [formGroup]="formReprogramar" (ngSubmit)="solicitarReprogramacion()" novalidate>
                <div class="row g-2">
                  <div class="col-sm-6">
                    <label class="form-label small mb-1" for="reprog-inicio">Nueva fecha/hora inicio</label>
                    <input id="reprog-inicio" type="datetime-local" class="form-control form-control-sm"
                           formControlName="fecha_inicio"
                           [class.is-invalid]="formReprogramar.controls.fecha_inicio.touched && formReprogramar.controls.fecha_inicio.invalid" />
                  </div>
                  <div class="col-sm-6">
                    <label class="form-label small mb-1" for="reprog-fin">Nueva fecha/hora fin</label>
                    <input id="reprog-fin" type="datetime-local" class="form-control form-control-sm"
                           formControlName="fecha_fin"
                           [class.is-invalid]="formReprogramar.controls.fecha_fin.touched && formReprogramar.controls.fecha_fin.invalid" />
                  </div>
                  <div class="col-12">
                    <label class="form-label small mb-1" for="reprog-motivo">Motivo</label>
                    <input id="reprog-motivo" class="form-control form-control-sm" formControlName="motivo"
                           maxlength="500" placeholder="Explica por qué necesitas cambiar el horario"
                           [class.is-invalid]="formReprogramar.controls.motivo.touched && formReprogramar.controls.motivo.invalid" />
                  </div>
                </div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-primary btn-sm" type="submit" [disabled]="procesando()">Enviar solicitud</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" (click)="mostrarFormReprog.set(false)">Cancelar</button>
                </div>
              </form>
            </div></div>
          }
        </div>
      }

      <!-- ====== ACCIONES DEL CLIENTE ====== -->
      @if (esCliente()) {

        @if (t.estado === 'pendiente_anticipo') {
          <div class="card border-warning mb-3"><div class="card-body">
            <h2 class="h6">Paga el anticipo para programar el trabajo</h2>
            <p class="small mb-2">
              Anticipo: <strong>{{ montoAnticipo() | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>
              ({{ porcentajeAnticipo() * 100 }} % del precio final). Se paga a la plataforma, nunca directamente al trabajador:
              el dinero queda protegido y el saldo se libera al trabajador solo cuando tú confirmes el trabajo terminado.
            </p>
            <form [formGroup]="formAnticipo" (ngSubmit)="pagarAnticipo()" class="d-flex flex-wrap gap-2 align-items-center">
              <select class="form-select form-select-sm w-auto" formControlName="medio" aria-label="Medio de pago">
                <option value="plataforma">Pago en la plataforma</option>
                <option value="qr">QR (simulado)</option>
              </select>
              <button class="btn btn-warning btn-sm" type="submit" [disabled]="procesando()">Pagar anticipo</button>
            </form>
          </div></div>
        }

        @for (inc of incrementosPendientes(); track inc.id_incremento) {
          <div class="card border-info mb-3"><div class="card-body">
            <h2 class="h6">El trabajador pide un incremento de precio</h2>
            <p class="mb-1"><strong>+ {{ inc.monto_adicional | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong></p>
            <p class="small">Motivo: {{ inc.justificacion }}</p>
            <p class="small text-muted">El precio no cambia si lo rechazas.</p>
            <div class="d-flex gap-2">
              <button class="btn btn-success btn-sm" type="button" [disabled]="procesando()"
                      (click)="responderIncremento(inc, true)">Aceptar</button>
              <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()"
                      (click)="responderIncremento(inc, false)">Rechazar</button>
            </div>
          </div></div>
        }

        @if (finalizacionPendiente(); as fin) {
          <div class="card border-success mb-3"><div class="card-body">
            <h2 class="h6">El trabajador indica que terminó el trabajo</h2>
            <p class="small">
              Revisa el resultado. Si estás conforme y confirmas, se cobra el saldo y se paga al trabajador
              (descontando la comisión de la plataforma). Si no, el trabajo continúa.
            </p>

            @if (!mostrarRechazo()) {
              <div class="d-flex gap-2">
                <button class="btn btn-success btn-sm" type="button" [disabled]="procesando()"
                        (click)="confirmarFinalizacion(fin)">Estoy conforme, confirmar</button>
                <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()"
                        (click)="mostrarRechazo.set(true)">Rechazar</button>
              </div>
            } @else {
              <form [formGroup]="formRechazo" (ngSubmit)="rechazarFinalizacion(fin)" novalidate>
                <label class="form-label small" for="motivo-rechazo">¿Qué falta o qué está mal?</label>
                <textarea id="motivo-rechazo" rows="2" class="form-control form-control-sm" formControlName="motivo"
                          [class.is-invalid]="formRechazo.controls.motivo.touched && formRechazo.controls.motivo.invalid"></textarea>
                <div class="invalid-feedback">Indica el motivo.</div>
                <div class="d-flex gap-2 mt-2">
                  <button class="btn btn-danger btn-sm" type="submit" [disabled]="procesando()">Enviar rechazo</button>
                  <button class="btn btn-outline-secondary btn-sm" type="button" (click)="mostrarRechazo.set(false)">Volver</button>
                </div>
              </form>
            }
          </div></div>
        }

        @if (puedeCalificar()) {
          <div class="card border-primary mb-3"><div class="card-body">
            <h2 class="h6">Califica el trabajo</h2>
            <form [formGroup]="formCalificar" (ngSubmit)="calificar()" novalidate>
              <div class="row g-2">
                <div class="col-sm-4">
                  <select class="form-select form-select-sm" formControlName="puntaje" aria-label="Puntaje">
                    <option [ngValue]="5">★★★★★ Excelente</option>
                    <option [ngValue]="4">★★★★ Muy bueno</option>
                    <option [ngValue]="3">★★★ Regular</option>
                    <option [ngValue]="2">★★ Malo</option>
                    <option [ngValue]="1">★ Muy malo</option>
                  </select>
                </div>
                <div class="col-sm-8">
                  <input class="form-control form-control-sm" formControlName="comentario"
                         placeholder="Comentario (opcional)" maxlength="500" />
                </div>
              </div>
              <button class="btn btn-primary btn-sm mt-2" type="submit" [disabled]="procesando()">Enviar calificación</button>
            </form>
          </div></div>
        }

        @if (esperaEfectivo()) {
          <div class="alert alert-info">
            Entrega el saldo en <strong>efectivo</strong> al trabajador. Él confirmará en la aplicación que lo recibió.
          </div>
        }

        @if (t.estado === 'terminado') {
          <div class="alert alert-light border small">
            Tienes 7 días desde el cierre del trabajo para presentar un reclamo si hubo problemas.
            <span class="text-muted">(La pantalla de reclamos se agrega en la siguiente entrega.)</span>
          </div>
        }
      } @else if (t.estado === 'pendiente_anticipo') {
        <div class="alert alert-warning">Esperando que el cliente pague el anticipo.</div>
      }

      <!-- ====== ACCIONES DEL TRABAJADOR ====== -->
      @if (esTrabajador()) {

        @if (t.estado === 'programado' || t.estado === 'en_camino') {
          <div class="card border-primary mb-3"><div class="card-body">
            <h2 class="h6">Avanza el trabajo</h2>
            <div class="d-flex flex-wrap gap-2">
              @if (t.estado === 'programado') {
                <button class="btn btn-outline-primary btn-sm" type="button" [disabled]="procesando()"
                        (click)="cambiarEstado('en_camino')">Voy en camino</button>
              }
              <button class="btn btn-primary btn-sm" type="button" [disabled]="procesando()"
                      (click)="cambiarEstado('en_proceso')">Comenzar el trabajo</button>
            </div>
            <div class="form-text">El cliente recibe un aviso con cada cambio de estado.</div>
          </div></div>
        }

        @if (enCurso()) {
          @if (incrementosPendientes().length > 0) {
            <div class="alert alert-info">
              Esperando la respuesta del cliente a tu incremento de
              <strong>{{ incrementosPendientes()[0].monto_adicional | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>.
            </div>
          } @else {
            <div class="card mb-3"><div class="card-body">
              <h2 class="h6">¿Surgió un imprevisto? Pide un incremento</h2>
              <p class="small text-muted mb-2">
                No puedes cambiar el precio sin avisar: el cliente debe aceptar el incremento. Si lo rechaza, se mantiene el precio actual.
              </p>
              <form [formGroup]="formIncremento" (ngSubmit)="pedirIncremento()" novalidate>
                <div class="row g-2">
                  <div class="col-sm-4">
                    <input type="number" min="1" step="0.01" class="form-control form-control-sm" formControlName="monto"
                           placeholder="Monto adicional (Bs)"
                           [class.is-invalid]="formIncremento.controls.monto.touched && formIncremento.controls.monto.invalid" />
                  </div>
                  <div class="col-sm-8">
                    <input class="form-control form-control-sm" formControlName="justificacion" maxlength="500"
                           placeholder="Justificación (mínimo 10 caracteres)"
                           [class.is-invalid]="formIncremento.controls.justificacion.touched && formIncremento.controls.justificacion.invalid" />
                  </div>
                </div>
                <button class="btn btn-outline-primary btn-sm mt-2" type="submit" [disabled]="procesando()">Enviar solicitud de incremento</button>
              </form>
            </div></div>
          }
        }

        @if (t.estado === 'en_proceso') {
          @if (finalizacionPendiente()) {
            <div class="alert alert-info">Esperando que el cliente confirme la finalización del trabajo.</div>
          } @else {
            <div class="card border-success mb-3"><div class="card-body">
              <h2 class="h6">¿Terminaste el trabajo?</h2>
              <p class="small text-muted mb-2">
                El cliente revisará el resultado. Cuando lo confirme se te pagará, descontando la comisión de la plataforma.
              </p>
              <button class="btn btn-success btn-sm" type="button" [disabled]="procesando() || incrementosPendientes().length > 0"
                      (click)="pedirFinalizacion()">Marcar como terminado</button>
              @if (incrementosPendientes().length > 0) {
                <div class="form-text">Primero debe resolverse el incremento pendiente.</div>
              }
            </div></div>
          }
        }

        @if (saldoEfectivoPendiente(); as pago) {
          <div class="card border-warning mb-3"><div class="card-body">
            <h2 class="h6">Pago en efectivo</h2>
            <p class="small mb-2">
              El cliente debe entregarte <strong>{{ pago.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>. ¿Lo recibiste?
            </p>
            <div class="d-flex gap-2">
              <button class="btn btn-success btn-sm" type="button" [disabled]="procesando()"
                      (click)="confirmarEfectivo(pago, true)">Sí, lo recibí</button>
              <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()"
                      (click)="confirmarEfectivo(pago, false)">No lo recibí</button>
            </div>
            <div class="form-text">Si indicas que no lo recibiste, se abre un caso para un supervisor.</div>
          </div></div>
        }

        @if (t.estado === 'terminado') {
          @if (calificacionRecibida(); as cal) {
            <div class="card mb-3"><div class="card-body">
              <h2 class="h6">Calificación del cliente</h2>
              <p class="mb-1"><strong>{{ '★'.repeat(cal.puntaje) }}</strong>
                <span class="text-muted">{{ '★'.repeat(5 - cal.puntaje) }}</span></p>
              @if (cal.comentario) { <p class="small">{{ cal.comentario }}</p> }
              @if (cal.respuesta_trabajador) {
                <div class="small border-start ps-2 text-muted">Tu respuesta: {{ cal.respuesta_trabajador }}</div>
              } @else {
                <form [formGroup]="formRespuesta" (ngSubmit)="responderCalificacion(cal)" novalidate>
                  <input class="form-control form-control-sm" formControlName="respuesta" maxlength="500"
                         placeholder="Responde al comentario (opcional, será público)" />
                  <button class="btn btn-outline-primary btn-sm mt-2" type="submit" [disabled]="procesando()">Responder</button>
                </form>
              }
            </div></div>
          }

          @if (!internaEnviada()) {
            <div class="card mb-3"><div class="card-body">
              <h2 class="h6">Califica al cliente (interno)</h2>
              <p class="small text-muted mb-2">Solo lo ve el equipo de administración. No aparece en el perfil del cliente.</p>
              <form [formGroup]="formInterna" (ngSubmit)="calificarCliente()" novalidate>
                <div class="row g-2">
                  <div class="col-sm-4">
                    <select class="form-select form-select-sm" formControlName="puntaje" aria-label="Puntaje del cliente">
                      <option [ngValue]="5">5 - Excelente</option>
                      <option [ngValue]="4">4 - Bueno</option>
                      <option [ngValue]="3">3 - Regular</option>
                      <option [ngValue]="2">2 - Malo</option>
                      <option [ngValue]="1">1 - Problemático</option>
                    </select>
                  </div>
                  <div class="col-sm-8">
                    <input class="form-control form-control-sm" formControlName="nota" maxlength="500"
                           placeholder="Nota para administración (opcional)" />
                  </div>
                </div>
                <button class="btn btn-outline-secondary btn-sm mt-2" type="submit" [disabled]="procesando()">Guardar calificación interna</button>
              </form>
            </div></div>
          }
        }
      }

      <!-- ====== RESUMEN ====== -->
      <div class="card mb-4"><div class="card-body">
        <dl class="row small mb-0">
          @if (esCliente()) {
            <dt class="col-sm-4">Trabajador</dt>
            <dd class="col-sm-8"><a [routerLink]="['/trabajadores', t.id_trabajador]">Ver perfil del trabajador</a></dd>
          }
          <dt class="col-sm-4">Dirección</dt><dd class="col-sm-8">{{ t.direccion_exacta ?? '—' }}</dd>
          <dt class="col-sm-4">Horario programado</dt>
          <dd class="col-sm-8">
            @if (t.fecha_inicio_prog) {
              {{ t.fecha_inicio_prog | date: 'dd/MM/yyyy HH:mm' }} a {{ t.fecha_fin_prog | date: 'dd/MM/yyyy HH:mm' }}
            } @else { Sin horario definido }
          </dd>
          <dt class="col-sm-4">Método de pago</dt><dd class="col-sm-8">{{ medioPago(t.metodo_pago) }}</dd>
          <dt class="col-sm-4">Precio final</dt>
          <dd class="col-sm-8">{{ t.precio_final | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
          <dt class="col-sm-4">Incrementos aceptados</dt>
          <dd class="col-sm-8">{{ t.total_incrementos | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
          <dt class="col-sm-4">Precio total</dt>
          <dd class="col-sm-8 fw-bold">{{ t.precio_total | currency: 'BOB' : 'Bs ' : '1.2-2' }}</dd>
        </dl>
      </div></div>

      <div class="row g-4">
        <div class="col-12 col-lg-7">
          <h2 class="h5">Pagos</h2>
          <div class="table-responsive">
            <table class="table table-sm bg-white">
              <thead><tr><th>Concepto</th><th>Medio</th><th>Monto</th><th>Estado</th><th>Fecha</th></tr></thead>
              <tbody>
                @for (p of pagos(); track p.id_pago) {
                  <tr>
                    <td>{{ tipoPago(p.tipo) }}</td>
                    <td>{{ medioPago(p.medio) }}</td>
                    <td>{{ p.monto | currency: 'BOB' : 'Bs ' : '1.2-2' }}</td>
                    <td><app-estado tipo="pago" [valor]="p.estado" /></td>
                    <td>{{ p.fecha_pago | date: 'dd/MM/yy HH:mm' }}</td>
                  </tr>
                } @empty {
                  <tr><td colspan="5" class="text-muted text-center">Aún no hay pagos.</td></tr>
                }
              </tbody>
            </table>
          </div>

          @if (t.incrementos.length > 0) {
            <h2 class="h5 mt-4">Incrementos de precio</h2>
            <ul class="list-group">
              @for (inc of t.incrementos; track inc.id_incremento) {
                <li class="list-group-item d-flex justify-content-between align-items-start">
                  <div>
                    <strong>+ {{ inc.monto_adicional | currency: 'BOB' : 'Bs ' : '1.2-2' }}</strong>
                    <div class="small text-muted">{{ inc.justificacion }}</div>
                  </div>
                  <app-estado tipo="incremento" [valor]="inc.estado" />
                </li>
              }
            </ul>
          }

          @if (reprogramaciones().length > 0) {
            <h2 class="h5 mt-4">Reprogramaciones</h2>
            <ul class="list-group">
              @for (rep of reprogramaciones(); track rep.id_reprogramacion) {
                <li class="list-group-item d-flex justify-content-between align-items-start gap-2">
                  <div class="small">
                    <div>
                      <strong>Propuesto:</strong>
                      {{ rep.fecha_inicio_propuesta | date: 'dd/MM/yy HH:mm' }}
                      a {{ rep.fecha_fin_propuesta | date: 'dd/MM/yy HH:mm' }}
                    </div>
                    <div class="text-muted">Motivo: {{ rep.motivo }}</div>
                    @if (rep.motivo_rechazo) {
                      <div class="text-danger">Rechazo: {{ rep.motivo_rechazo }}</div>
                    }
                  </div>
                  <span
                    class="badge"
                    [class.text-bg-warning]="rep.estado === 'pendiente'"
                    [class.text-bg-success]="rep.estado === 'aceptada'"
                    [class.text-bg-danger]="rep.estado === 'rechazada'"
                  >
                    {{ rep.estado }}
                  </span>
                </li>
              }
            </ul>
          }
        </div>

        <div class="col-12 col-lg-5">
          <h2 class="h5">Historial</h2>
          <ul class="list-group">
            @for (h of t.historial; track $index) {
              <li class="list-group-item small">
                <app-estado tipo="trabajo" [valor]="h.estado_nuevo" />
                <span class="text-muted ms-2">{{ h.fecha_cambio | date: 'dd/MM/yy HH:mm' }}</span>
              </li>
            }
          </ul>

          @if (puedeCancelar()) {
            <div class="mt-4">
              @if (!mostrarCancelar()) {
                <button class="btn btn-outline-danger btn-sm" type="button" (click)="mostrarCancelar.set(true)">
                  Cancelar trabajo
                </button>
              } @else {
                <form class="card card-body border-danger" [formGroup]="formCancelar" (ngSubmit)="cancelar()">
                  <label class="form-label small" for="motivo-cancel">Motivo (opcional)</label>
                  <input id="motivo-cancel" class="form-control form-control-sm" formControlName="motivo" maxlength="300" />
                  @if (esCliente()) {
                    <div class="form-text">
                      Puedes cancelar hasta 2 horas antes del servicio. Si ya pagaste el anticipo, se te devolverá
                      en un máximo de 3 días.
                    </div>
                  } @else {
                    <div class="form-text text-danger">
                      Las cancelaciones repetidas del trabajador pueden suspender su cuenta.
                    </div>
                  }
                  <div class="d-flex gap-2 mt-2">
                    <button class="btn btn-danger btn-sm" type="submit" [disabled]="procesando()">Confirmar cancelación</button>
                    <button class="btn btn-outline-secondary btn-sm" type="button" (click)="mostrarCancelar.set(false)">Volver</button>
                  </div>
                </form>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
})
export class VerTrabajo {
  private ruta = inject(ActivatedRoute);
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private api = inject(TrabajosService);
  private pagosApi = inject(PagosService);
  private calificacionesApi = inject(CalificacionesService);
  private parametros = inject(ParametrosService);

  private id = Number(this.ruta.snapshot.paramMap.get('id'));

  trabajo = signal<TrabajoDetalle | null>(null);
  pagos = signal<Pago[]>([]);
  porcentajeAnticipo = signal(0.25);
  puedeCalificar = signal(false);
  calificacionRecibida = signal<CalificacionRecibida | null>(null);
  internaEnviada = signal(false);

  cargando = signal(true);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  mostrarRechazo = signal(false);
  mostrarCancelar = signal(false);
  mostrarFormReprog = signal(false);
  mostrarRechazoReprog = signal(false);

  usuarioId = computed(() => this.auth.usuario()?.id_usuario);
  esCliente = computed(() => this.trabajo()?.id_cliente === this.usuarioId());
  esTrabajador = computed(() => this.trabajo()?.id_trabajador === this.usuarioId());

  montoAnticipo = computed(() => (this.trabajo()?.precio_final ?? 0) * this.porcentajeAnticipo());
  incrementosPendientes = computed<Incremento[]>(
    () => this.trabajo()?.incrementos.filter((i) => i.estado === 'pendiente') ?? [],
  );
  finalizacionPendiente = computed<Finalizacion | undefined>(() =>
    this.trabajo()?.finalizaciones.find((f) => f.estado === 'pendiente'),
  );
  reprogramaciones = computed<Reprogramacion[]>(() => this.trabajo()?.reprogramaciones ?? []);
  reprogramacionPendiente = computed<Reprogramacion | undefined>(() =>
    this.reprogramaciones().find((r) => r.estado === 'pendiente'),
  );
  puedeReprogramar = computed(() => {
    const t = this.trabajo();
    return (
      !!t &&
      ESTADOS_REPROGRAMABLES.includes(t.estado) &&
      (this.esCliente() || this.esTrabajador()) &&
      !this.reprogramacionPendiente()
    );
  });
  enCurso = computed(() => ['programado', 'en_camino', 'en_proceso'].includes(this.trabajo()?.estado ?? ''));
  saldoEfectivoPendiente = computed(() =>
    this.pagos().find((p) => p.tipo === 'saldo' && p.medio === 'efectivo' && p.estado === 'pendiente'),
  );
  puedeCancelar = computed(() => {
    const t = this.trabajo();
    return !!t && ESTADOS_CANCELABLES.includes(t.estado) && (this.esCliente() || this.esTrabajador());
  });
  esperaEfectivo = computed(
    () =>
      this.trabajo()?.metodo_pago === 'efectivo' &&
      this.trabajo()?.estado === 'terminado' &&
      this.pagos().some((p) => p.tipo === 'saldo' && p.estado === 'pendiente'),
  );

  formAnticipo = this.fb.nonNullable.group({ medio: ['plataforma' as 'plataforma' | 'qr'] });
  formRechazo = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(300)]],
  });
  formCancelar = this.fb.nonNullable.group({ motivo: ['', Validators.maxLength(300)] });
  formIncremento = this.fb.nonNullable.group({
    monto: [null as number | null, [Validators.required, Validators.min(0.01)]],
    justificacion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(500)]],
  });
  formRespuesta = this.fb.nonNullable.group({ respuesta: ['', Validators.maxLength(500)] });
  formInterna = this.fb.nonNullable.group({
    puntaje: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    nota: ['', Validators.maxLength(500)],
  });
  formCalificar = this.fb.nonNullable.group({
    puntaje: [5, [Validators.required, Validators.min(1), Validators.max(5)]],
    comentario: ['', Validators.maxLength(500)],
  });
  formReprogramar = this.fb.nonNullable.group({
    fecha_inicio: ['', Validators.required],
    fecha_fin: ['', Validators.required],
    motivo: ['', [Validators.required, Validators.maxLength(500)]],
  });
  formRechazoReprog = this.fb.nonNullable.group({
    motivo: ['', [Validators.required, Validators.maxLength(300)]],
  });

  constructor() {
    this.cargar();
  }

  tipoPago(tipo: string) {
    return NOMBRE_TIPO_PAGO[tipo] ?? tipo;
  }

  medioPago(medio: string) {
    return NOMBRE_MEDIO_PAGO[medio] ?? medio;
  }

  // ---------------- Reprogramaciones ----------------

  solicitarReprogramacion() {
    if (this.formReprogramar.invalid) {
      this.formReprogramar.markAllAsTouched();
      return;
    }
    const v = this.formReprogramar.getRawValue();
    this.ejecutar(
      this.api.solicitarReprogramacion(
        this.id,
        new Date(v.fecha_inicio).toISOString(),
        new Date(v.fecha_fin).toISOString(),
        v.motivo.trim(),
      ),
      'Solicitud de reprogramación enviada. La otra parte recibirá una notificación.',
      () => {
        this.mostrarFormReprog.set(false);
        this.formReprogramar.reset();
      },
    );
  }

  aceptarReprogramacion(rep: Reprogramacion) {
    this.ejecutar(
      this.api.responderReprogramacion(rep.id_reprogramacion, true),
      'Reprogramación aceptada: el horario del trabajo fue actualizado.',
    );
  }

  rechazarReprogramacion(rep: Reprogramacion) {
    if (this.formRechazoReprog.invalid) {
      this.formRechazoReprog.markAllAsTouched();
      return;
    }
    this.ejecutar(
      this.api.responderReprogramacion(
        rep.id_reprogramacion,
        false,
        this.formRechazoReprog.getRawValue().motivo.trim(),
      ),
      'Reprogramación rechazada: se mantiene el horario anterior.',
      () => {
        this.mostrarRechazoReprog.set(false);
        this.formRechazoReprog.reset();
      },
    );
  }

  // ---------------- Acciones ----------------

  pagarAnticipo() {
    this.ejecutar(
      this.pagosApi.anticipo(this.id, this.formAnticipo.getRawValue().medio),
      'Anticipo pagado. El trabajo quedó programado y se avisó al trabajador.',
    );
  }

  responderIncremento(inc: Incremento, aceptar: boolean) {
    this.ejecutar(
      this.api.responderIncremento(inc.id_incremento, aceptar),
      aceptar ? 'Incremento aceptado: el precio total se actualizó.' : 'Incremento rechazado: se mantiene el precio anterior.',
    );
  }

  confirmarFinalizacion(fin: Finalizacion) {
    this.ejecutar(
      this.api.responderFinalizacion(fin.id_finalizacion, true),
      'Trabajo confirmado. Se procesó el pago al trabajador.',
    );
  }

  rechazarFinalizacion(fin: Finalizacion) {
    if (this.formRechazo.invalid) {
      this.formRechazo.markAllAsTouched();
      return;
    }
    this.ejecutar(
      this.api.responderFinalizacion(fin.id_finalizacion, false, this.formRechazo.getRawValue().motivo.trim()),
      'Rechazaste la finalización: el trabajo continúa.',
      () => {
        this.mostrarRechazo.set(false);
        this.formRechazo.reset();
      },
    );
  }

  cancelar() {
    const motivo = this.formCancelar.getRawValue().motivo.trim();
    this.ejecutar(this.pagosApi.cancelar(this.id, motivo || undefined), 'Trabajo cancelado.', () =>
      this.mostrarCancelar.set(false),
    );
  }

  calificar() {
    const v = this.formCalificar.getRawValue();
    this.ejecutar(
      this.calificacionesApi.crear(this.id, v.puntaje, v.comentario.trim() || undefined),
      '¡Gracias por calificar!',
    );
  }

  // ---- Acciones del trabajador ----

  cambiarEstado(estado: 'en_camino' | 'en_proceso') {
    this.ejecutar(
      this.api.cambiarEstado(this.id, estado),
      estado === 'en_camino' ? 'Avisamos al cliente que vas en camino.' : 'Trabajo en proceso.',
    );
  }

  pedirIncremento() {
    if (this.formIncremento.invalid) {
      this.formIncremento.markAllAsTouched();
      return;
    }
    const v = this.formIncremento.getRawValue();
    this.ejecutar(
      this.api.pedirIncremento(this.id, v.monto!, v.justificacion.trim()),
      'Solicitud enviada: el cliente debe aceptarla para que el precio cambie.',
      () => this.formIncremento.reset(),
    );
  }

  pedirFinalizacion() {
    if (!confirm('¿Confirmas que el trabajo está terminado? El cliente recibirá la solicitud para confirmarlo.')) return;
    this.ejecutar(this.api.pedirFinalizacion(this.id), 'Solicitud enviada: esperando la confirmación del cliente.');
  }

  confirmarEfectivo(pago: Pago, recibido: boolean) {
    this.ejecutar(
      this.pagosApi.confirmarEfectivo(pago.id_pago, recibido),
      recibido ? 'Pago en efectivo confirmado.' : 'Registramos que no lo recibiste: un supervisor revisará el caso.',
    );
  }

  responderCalificacion(cal: CalificacionRecibida) {
    const texto = this.formRespuesta.getRawValue().respuesta.trim();
    if (!texto) return;
    this.ejecutar(this.calificacionesApi.responder(cal.id_calificacion, texto), 'Respuesta publicada.');
  }

  calificarCliente() {
    const v = this.formInterna.getRawValue();
    this.ejecutar(
      this.calificacionesApi.calificarCliente(this.id, v.puntaje, v.nota.trim() || undefined),
      'Calificación interna guardada. Solo la ve la administración.',
      () => this.internaEnviada.set(true),
    );
  }

  // ---------------- Carga y utilidades ----------------

  private cargar() {
    forkJoin({
      trabajo: this.api.obtener(this.id),
      pagos: this.pagosApi.delTrabajo(this.id),
      anticipo: this.parametros.porcentaje('anticipo', 0.25).pipe(catchError(() => of(0.25))),
    }).subscribe({
      next: ({ trabajo, pagos, anticipo }) => {
        this.trabajo.set(trabajo);
        this.pagos.set(pagos);
        this.porcentajeAnticipo.set(anticipo);
        this.cargando.set(false);
        this.revisarCalificacion(trabajo);
        this.revisarCalificacionRecibida(trabajo);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  private revisarCalificacion(t: TrabajoDetalle) {
    this.puedeCalificar.set(false);
    if (t.estado !== 'terminado' || t.id_cliente !== this.usuarioId()) return;
    this.calificacionesApi.pendientes().subscribe({
      next: (lista) => this.puedeCalificar.set(lista.some((x) => x.id_trabajo === t.id_trabajo)),
      error: () => {},
    });
  }

  private revisarCalificacionRecibida(t: TrabajoDetalle) {
    this.calificacionRecibida.set(null);
    if (t.estado !== 'terminado' || t.id_trabajador !== this.usuarioId()) return;
    this.calificacionesApi.delTrabajador(t.id_trabajador).subscribe({
      next: (lista) => this.calificacionRecibida.set(lista.find((c) => c.id_trabajo === t.id_trabajo) ?? null),
      error: () => {},
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