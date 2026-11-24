import { DatePipe } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { timer } from '../../../node_modules/rxjs/dist/types';

import { AuthService } from '../core/auth.service';
import { MENU_POR_ROL, NOMBRE_ROL } from '../core/menu';
import { Notificacion } from '../core/modelos';
import { NotificacionesService } from '../core/notificaciones.service';

// Estructura común de todas las pantallas con sesión: barra superior + contenido.
// <router-outlet /> es el "hueco" donde Angular pinta la pantalla de la ruta actual.
@Component({
  selector: 'app-layout',
  imports: [RouterOutlet, RouterLink, RouterLinkActive, DatePipe],
  template: `
    <nav class="navbar navbar-expand-lg navbar-dark bg-primary">
      <div class="container">
        <a class="navbar-brand fw-bold" routerLink="/inicio">Arréglalo Ya</a>

        <button class="navbar-toggler" type="button" aria-label="Abrir menú" (click)="menuAbierto.set(!menuAbierto())">
          <span class="navbar-toggler-icon"></span>
        </button>

        <div class="collapse navbar-collapse" [class.show]="menuAbierto()">
          <ul class="navbar-nav me-auto">
            @for (item of menu(); track item.ruta) {
              <li class="nav-item">
                <a class="nav-link" [routerLink]="item.ruta" routerLinkActive="active"
                   (click)="menuAbierto.set(false)">{{ item.texto }}</a>
              </li>
            }
          </ul>

          <div class="d-flex flex-column flex-lg-row align-items-lg-center gap-2 mt-2 mt-lg-0">
            <!-- RF-02: cambiar de función (cliente / trabajador) con la misma cuenta -->
            @if (auth.roles().length > 1) {
              <select class="form-select form-select-sm" aria-label="Función activa"
                      (change)="cambiarRol($event)">
                @for (rol of auth.roles(); track rol) {
                  <option [value]="rol" [selected]="rol === auth.rolActivo()">{{ nombreRol(rol) }}</option>
                }
              </select>
            } @else {
              <span class="badge text-bg-light">{{ nombreRol(auth.rolActivo()) }}</span>
            }

            <!-- Notificaciones -->
            <div class="position-relative">
              <button class="btn btn-outline-light btn-sm" type="button" (click)="alternarNotificaciones()">
                Avisos
                @if (noLeidas() > 0) {
                  <span class="badge text-bg-danger ms-1">{{ noLeidas() }}</span>
                }
              </button>

              @if (panelAbierto()) {
                <div class="card shadow position-absolute end-0 mt-2 panel-avisos">
                  <div class="card-header d-flex justify-content-between align-items-center py-2">
                    <strong>Notificaciones</strong>
                    <button class="btn btn-link btn-sm p-0" type="button" (click)="marcarTodas()">
                      Marcar todas
                    </button>
                  </div>
                  <ul class="list-group list-group-flush">
                    @for (n of notificaciones(); track n.id_notificacion) {
                      <li class="list-group-item small" [class.fw-bold]="!n.leida"
                          role="button" (click)="marcarLeida(n)">
                        {{ n.mensaje }}
                        <div class="text-muted fw-normal">{{ n.fecha_envio | date: 'dd/MM HH:mm' }}</div>
                      </li>
                    } @empty {
                      <li class="list-group-item small text-muted">No tienes notificaciones.</li>
                    }
                  </ul>
                </div>
              }
            </div>

            <span class="text-white small">{{ auth.usuario()?.nombres }}</span>
            <button class="btn btn-light btn-sm" type="button" (click)="auth.cerrarSesion()">Salir</button>
          </div>
        </div>
      </div>
    </nav>

    <main class="container py-4">
      <router-outlet />
    </main>
  `,
  styles: `
    .panel-avisos {
      width: min(22rem, 90vw);
      max-height: 24rem;
      overflow-y: auto;
      z-index: 1050;
    }
  `,
})
export class Layout {
  protected auth = inject(AuthService);
  private notificacionesApi = inject(NotificacionesService);

  menuAbierto = signal(false);
  panelAbierto = signal(false);
  notificaciones = signal<Notificacion[]>([]);

  // computed: se recalcula solo cuando cambian las señales que usa
  menu = computed(() => MENU_POR_ROL[this.auth.rolActivo()] ?? []);
  noLeidas = computed(() => this.notificaciones().filter((n) => !n.leida).length);

  constructor() {
    // Consulta los avisos al entrar y luego cada minuto
    timer(0, 60_000)
      .pipe(takeUntilDestroyed())
      .subscribe(() => this.cargarNotificaciones());
  }

  nombreRol(rol: string): string {
    return NOMBRE_ROL[rol] ?? rol;
  }

  cambiarRol(evento: Event) {
    this.auth.cambiarRol((evento.target as HTMLSelectElement).value);
  }

  alternarNotificaciones() {
    this.panelAbierto.update((abierto) => !abierto);
    if (this.panelAbierto()) this.cargarNotificaciones();
  }

  marcarLeida(n: Notificacion) {
    if (n.leida) return;
    this.notificacionesApi.leer(n.id_notificacion).subscribe(() => this.cargarNotificaciones());
  }

  marcarTodas() {
    this.notificacionesApi.leerTodas().subscribe(() => this.cargarNotificaciones());
  }

  private cargarNotificaciones() {
    this.notificacionesApi.mias().subscribe({
      next: (lista) => this.notificaciones.set(lista),
      error: () => {}, // un fallo al consultar avisos no debe molestar al usuario
    });
  }
}
