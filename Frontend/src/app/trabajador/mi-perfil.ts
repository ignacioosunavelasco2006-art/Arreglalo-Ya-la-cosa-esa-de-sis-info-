import { HttpErrorResponse } from '@angular/common/http';
import { Component, computed, inject, signal } from '@angular/core';
import { Observable } from 'rxjs';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { AdministracionService } from '../../core/administracion.service';
import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/errores';
import { PerfilPrivado } from '../../core/modelos';
import { MiPerfilService } from '../../core/mi-perfil.service';
import { EstadoBadge } from '../../shared/estado-badge';
import { BancariosSeccion } from './secciones/bancarios-seccion';
import { DocumentosSeccion } from './secciones/documentos-seccion';
import { ServiciosSeccion } from './secciones/servicios-seccion';

@Component({
  selector: 'app-mi-perfil',
  imports: [
    ReactiveFormsModule,
    EstadoBadge,
    DocumentosSeccion,
    ServiciosSeccion,
    BancariosSeccion,
  ],
  template: `
    <h1 class="h3 mb-3">Mi perfil de trabajador</h1>

    @if (cargando()) {
      <div class="text-muted">Cargando...</div>
    } @else if (sinPerfil()) {
      <!-- ============ Primer paso: crear el perfil ============ -->
      <div class="card shadow-sm" style="max-width: 36rem"><div class="card-body">
        <h2 class="h5">Crea tu perfil</h2>
        <p class="small text-muted">
          Para ofrecer servicios necesitas un perfil. Después subirás tus documentos y un supervisor
          lo revisará antes de que puedas enviar ofertas.
        </p>
        <form [formGroup]="formDatos" (ngSubmit)="crear()" novalidate>
          <div class="row g-2">
            <div class="col-md-6">
              <label class="form-label small mb-1" for="carnet">Carnet de identidad</label>
              <input id="carnet" class="form-control form-control-sm" formControlName="carnet_identidad"
                     [class.is-invalid]="formDatos.controls.carnet_identidad.touched && formDatos.controls.carnet_identidad.invalid" />
              <div class="invalid-feedback">Entre 5 y 20 caracteres.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1" for="anios">Años de experiencia</label>
              <input id="anios" type="number" min="0" max="60" class="form-control form-control-sm" formControlName="anios_experiencia" />
            </div>
            <div class="col-12">
              <label class="form-label small mb-1" for="desc">Cuéntales a los clientes sobre ti</label>
              <textarea id="desc" rows="3" class="form-control form-control-sm" formControlName="descripcion" maxlength="1000"></textarea>
            </div>
          </div>
          @if (error()) { <div class="alert alert-danger py-2 mt-2">{{ error() }}</div> }
          <button class="btn btn-primary mt-3" type="submit" [disabled]="guardando()">Crear perfil</button>
        </form>
      </div></div>
    } @else if (perfil(); as p) {
      @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
      @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

      <!-- ============ Estado de verificación ============ -->
      <div class="card mb-4" [class.border-success]="p.estado_verificacion === 'aprobado'">
        <div class="card-body">
          <div class="d-flex flex-wrap justify-content-between align-items-center gap-2 mb-2">
            <h2 class="h5 mb-0">Estado de tu perfil</h2>
            <app-estado tipo="verificacion" [valor]="p.estado_verificacion" />
          </div>

          @if (p.estado_verificacion === 'aprobado') {
            <p class="mb-0">Tu perfil está aprobado: apareces en las búsquedas y puedes enviar ofertas.</p>
          } @else {
            @if (p.motivo_rechazo) {
              <div class="alert alert-warning py-2 small">
                <strong>Comentario del supervisor:</strong> {{ p.motivo_rechazo }}
              </div>
            }
            <p class="small mb-2">Para enviar tu perfil a revisión necesitas completar:</p>
            <ul class="list-unstyled small mb-3">
              @for (item of checklist(); track item.texto) {
                <li>
                  <span [class]="item.ok ? 'text-success' : 'text-danger'">{{ item.ok ? '✔' : '✘' }}</span>
                  {{ item.texto }}
                </li>
              }
            </ul>

            @if (faltantes().length > 0) {
              <div class="alert alert-danger py-2 small">
                El servidor indica que aún falta: {{ faltantes().join(', ') }}.
              </div>
            }

            <button class="btn btn-success" type="button" [disabled]="!completo() || guardando()" (click)="enviarRevision()">
              Enviar a revisión
            </button>
          }
        </div>
      </div>

      <!-- ============ Datos personales ============ -->
      <div class="card mb-4"><div class="card-body">
        <h2 class="h5">Datos del perfil</h2>
        <form [formGroup]="formDatos" (ngSubmit)="guardarDatos()" novalidate>
          <div class="row g-2">
            <div class="col-md-6">
              <label class="form-label small mb-1" for="carnet">Carnet de identidad</label>
              <input id="carnet" class="form-control form-control-sm" formControlName="carnet_identidad"
                     [class.is-invalid]="formDatos.controls.carnet_identidad.touched && formDatos.controls.carnet_identidad.invalid" />
              <div class="invalid-feedback">Entre 5 y 20 caracteres.</div>
            </div>
            <div class="col-md-6">
              <label class="form-label small mb-1" for="anios">Años de experiencia</label>
              <input id="anios" type="number" min="0" max="60" class="form-control form-control-sm" formControlName="anios_experiencia" />
            </div>
            <div class="col-12">
              <label class="form-label small mb-1" for="desc">Cuéntales a los clientes sobre ti</label>
              <textarea id="desc" rows="3" class="form-control form-control-sm" formControlName="descripcion" maxlength="1000"></textarea>
            </div>
          </div>
          @if (p.estado_verificacion === 'aprobado') {
            <div class="form-text">Si cambias tu carnet, el perfil volverá a revisión.</div>
          }
          <button class="btn btn-primary btn-sm mt-3" type="submit" [disabled]="guardando()">Guardar datos</button>
        </form>
      </div></div>

      <app-documentos-seccion [documentos]="p.documentos" (cambio)="cargar()" />
      <app-servicios-seccion [perfil]="p" (cambio)="cargar()" />
      <app-bancarios-seccion (cambio)="cargar()" />

      <!-- ============ Pausar la cuenta (RF-07) ============ -->
      <div class="card border-secondary mb-4"><div class="card-body">
        <h2 class="h5">Pausar mi cuenta</h2>
        @if (suspendida()) {
          <p class="small">Tu cuenta está suspendida: no puedes ofertar, aceptar trabajos ni recibir solicitudes.</p>
          <button class="btn btn-outline-primary btn-sm" type="button" [disabled]="guardando()" (click)="reactivar()">
            Reactivar mi cuenta
          </button>
          <div class="form-text">
            Si pausaste tu cuenta por 30 días, podrás reactivarla al terminar ese plazo. Si pasan 60 días sin
            reactivarla, se elimina.
          </div>
        } @else {
          <p class="small">
            ¿No puedes trabajar por un tiempo? Pausa tu cuenta 30 días: tu perfil aparecerá como «no disponible».
            Antes debes cumplir o cancelar los trabajos que tengas aceptados.
          </p>
          <button class="btn btn-outline-secondary btn-sm" type="button" [disabled]="guardando()" (click)="pausar()">
            Pausar mi cuenta 30 días
          </button>
        }
      </div></div>
    }
  `,
})
export class MiPerfil {
  private fb = inject(FormBuilder);
  private api = inject(MiPerfilService);
  private admin = inject(AdministracionService);
  private auth = inject(AuthService);

  perfil = signal<PerfilPrivado | null>(null);
  sinPerfil = signal(false);
  cargando = signal(true);
  guardando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);
  faltantes = signal<string[]>([]);

  suspendida = computed(() => this.auth.usuario()?.estado === 'suspendida');

  // Lista de lo que falta, calculada con lo que ya sabemos del perfil
  checklist = computed(() => {
    const p = this.perfil();
    if (!p) return [];
    const tipos = p.documentos.map((d) => d.tipo);
    return [
      { texto: 'Carnet de identidad (documento)', ok: tipos.includes('carnet') },
      { texto: 'Certificado de antecedentes (documento)', ok: tipos.includes('antecedentes') },
      { texto: 'Al menos un servicio', ok: p.categorias.length > 0 },
      { texto: 'Al menos una zona de cobertura', ok: p.zonas.length > 0 },
      { texto: 'Datos bancarios', ok: p.tiene_datos_bancarios },
    ];
  });
  completo = computed(() => this.checklist().every((i) => i.ok));

  formDatos = this.fb.nonNullable.group({
    carnet_identidad: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(20)]],
    anios_experiencia: [0, [Validators.min(0), Validators.max(60)]],
    descripcion: [''],
  });

  constructor() {
    this.cargar();
  }

  cargar() {
    this.api.obtener().subscribe({
      next: (p) => {
        this.perfil.set(p);
        this.sinPerfil.set(false);
        this.formDatos.patchValue({
          carnet_identidad: p.carnet_identidad,
          anios_experiencia: p.anios_experiencia,
          descripcion: p.descripcion ?? '',
        });
        this.cargando.set(false);
      },
      error: (e: HttpErrorResponse) => {
        // 404 = todavía no creó su perfil: se le muestra el formulario de creación
        if (e.status === 404) this.sinPerfil.set(true);
        else this.error.set(mensajeDeError(e));
        this.cargando.set(false);
      },
    });
  }

  crear() {
    if (this.formDatos.invalid) {
      this.formDatos.markAllAsTouched();
      return;
    }
    this.ejecutar(this.api.crear(this.datos()), 'Perfil creado. Ahora sube tus documentos y completa tus datos.');
  }

  guardarDatos() {
    if (this.formDatos.invalid) {
      this.formDatos.markAllAsTouched();
      return;
    }
    this.ejecutar(this.api.actualizar(this.datos()), 'Datos actualizados.');
  }

  enviarRevision() {
    this.faltantes.set([]);
    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    this.api.enviarRevision().subscribe({
      next: (r) => {
        this.mensaje.set(r.mensaje);
        this.guardando.set(false);
        this.cargar();
      },
      error: (e: HttpErrorResponse) => {
        const lista = e.error?.faltantes;
        if (Array.isArray(lista)) this.faltantes.set(lista);
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  pausar() {
    if (!confirm('¿Pausar tu cuenta por 30 días? No podrás ofertar ni recibir solicitudes en ese tiempo.')) return;
    this.guardando.set(true);
    this.error.set(null);
    this.admin.suspenderMiCuenta().subscribe({
      next: () => {
        this.auth.actualizarUsuarioLocal({ estado: 'suspendida' });
        this.mensaje.set('Tu cuenta quedó pausada por 30 días.');
        this.guardando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  reactivar() {
    this.guardando.set(true);
    this.error.set(null);
    this.admin.reactivarMiCuenta().subscribe({
      next: (r) => {
        this.auth.actualizarUsuarioLocal({ estado: 'activa' });
        this.mensaje.set(r.mensaje);
        this.guardando.set(false);
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }

  private datos() {
    const v = this.formDatos.getRawValue();
    return {
      carnet_identidad: v.carnet_identidad.trim(),
      anios_experiencia: Number(v.anios_experiencia) || 0,
      ...(v.descripcion.trim() ? { descripcion: v.descripcion.trim() } : {}),
    };
  }

  private ejecutar(peticion: Observable<unknown>, exito: string) {
    this.guardando.set(true);
    this.error.set(null);
    this.mensaje.set(null);
    peticion.subscribe({
      next: () => {
        this.mensaje.set(exito);
        this.guardando.set(false);
        this.cargar();
      },
      error: (e) => {
        this.error.set(mensajeDeError(e));
        this.guardando.set(false);
      },
    });
  }
}
