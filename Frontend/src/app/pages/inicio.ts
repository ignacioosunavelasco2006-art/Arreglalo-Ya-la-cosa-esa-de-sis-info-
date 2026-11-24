import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';

import { AuthService } from '../core/auth.service';
import { ACCESOS_POR_ROL, NOMBRE_ROL } from '../core/menu';

// Panel de inicio: saluda y muestra los accesos de la función activa.
// Los accesos sin "ruta" aparecen como "Próximamente" hasta que construyamos esa pantalla.
@Component({
  selector: 'app-inicio',
  imports: [RouterLink],
  template: `
    <h1 class="h3 mb-1">Hola, {{ auth.usuario()?.nombres }}</h1>
    <p class="text-muted">Estás usando la plataforma como <strong>{{ nombreRol() }}</strong>.</p>

    @if (auth.usuario()?.estado === 'suspendida') {
      <div class="alert alert-warning">
        <strong>Tu cuenta está suspendida.</strong>
        Mientras dure la suspensión no puedes ofertar, aceptar trabajos ni recibir solicitudes.
      </div>
    }

    <div class="row g-3 mt-1">
      @for (acceso of accesos(); track acceso.texto) {
        <div class="col-12 col-sm-6 col-lg-3">
          <div class="card h-100" [class.opacity-50]="!acceso.ruta">
            <div class="card-body">
              <h2 class="h6">{{ acceso.texto }}</h2>
              <p class="small text-muted mb-3">{{ acceso.descripcion }}</p>
              @if (acceso.ruta) {
                <a class="btn btn-sm btn-primary" [routerLink]="acceso.ruta">Abrir</a>
              } @else {
                <span class="badge text-bg-secondary">Próximamente</span>
              }
            </div>
          </div>
        </div>
      }
    </div>
  `,
})
export class Inicio {
  protected auth = inject(AuthService);

  nombreRol = computed(() => NOMBRE_ROL[this.auth.rolActivo()] ?? this.auth.rolActivo());
  accesos = computed(() => ACCESOS_POR_ROL[this.auth.rolActivo()] ?? []);
}
