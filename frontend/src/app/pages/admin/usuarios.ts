import { DatePipe } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { Observable } from 'rxjs';

import { AdminService } from '../../core/admin.service';
import { AuthService } from '../../core/auth.service';
import { mensajeDeError } from '../../core/errores';
import { NOMBRE_ROL } from '../../core/menu';
import { UsuarioLista } from '../../core/modelos';

// RF-34: el super supervisor crea supervisores e inspectores y puede desactivar cuentas.
@Component({
  selector: 'app-usuarios',
  imports: [DatePipe, FormsModule, ReactiveFormsModule],
  template: `
    <h1 class="h3 mb-3">Usuarios</h1>

    @if (mensaje()) { <div class="alert alert-success py-2">{{ mensaje() }}</div> }
    @if (error()) { <div class="alert alert-danger py-2">{{ error() }}</div> }

    <div class="row g-4">
      <div class="col-12 col-xl-8">
        <div class="mb-3" style="max-width: 16rem">
          <select class="form-select form-select-sm" aria-label="Filtrar por rol" [ngModel]="filtro()" (ngModelChange)="cambiarFiltro($event)">
            <option value="">Todos los roles</option>
            @for (r of roles; track r) { <option [value]="r">{{ nombreRol(r) }}</option> }
          </select>
        </div>

        <div class="table-responsive">
          <table class="table table-sm align-middle bg-white">
            <thead><tr><th>Nombre</th><th>Correo</th><th>Roles</th><th>Estado</th><th>Registro</th><th></th></tr></thead>
            <tbody>
              @for (u of usuarios(); track u.id_usuario) {
                <tr [class.text-muted]="u.estado === 'eliminada'">
                  <td>{{ u.nombres }} {{ u.apellidos }}</td>
                  <td class="small">{{ u.correo }}<div class="text-muted">{{ u.telefono }}</div></td>
                  <td>@for (r of u.roles; track r) { <span class="badge text-bg-secondary me-1">{{ nombreRol(r) }}</span> }</td>
                  <td>{{ u.estado }}</td>
                  <td class="small">{{ u.fecha_registro | date: 'dd/MM/yyyy' }}</td>
                  <td class="text-end">
                    @if (u.estado !== 'eliminada' && u.id_usuario !== yo()) {
                      <button class="btn btn-outline-danger btn-sm" type="button" [disabled]="procesando()" (click)="desactivar(u)">Desactivar</button>
                    }
                  </td>
                </tr>
              } @empty { <tr><td colspan="6" class="text-muted text-center">Sin usuarios.</td></tr> }
            </tbody>
          </table>
        </div>
      </div>

      <div class="col-12 col-xl-4">
        <div class="card"><div class="card-body">
          <h2 class="h5">Crear supervisor o inspector</h2>
          <form [formGroup]="form" (ngSubmit)="crear()" novalidate>
            <div class="mb-2">
              <select class="form-select form-select-sm" formControlName="rol" aria-label="Rol">
                <option value="supervisor">Supervisor</option>
                <option value="inspector">Inspector</option>
              </select>
            </div>
            <div class="row g-2 mb-2">
              <div class="col-6"><input class="form-control form-control-sm" formControlName="nombres" placeholder="Nombres" /></div>
              <div class="col-6"><input class="form-control form-control-sm" formControlName="apellidos" placeholder="Apellidos" /></div>
            </div>
            <div class="mb-2"><input type="email" class="form-control form-control-sm" formControlName="correo" placeholder="Correo" autocomplete="off" /></div>
            <div class="mb-2"><input class="form-control form-control-sm" formControlName="telefono" placeholder="Teléfono" /></div>
            <div class="mb-2">
              <input type="password" class="form-control form-control-sm" formControlName="contrasena"
                     placeholder="Contraseña inicial (mín. 8)" autocomplete="new-password" />
              <div class="form-text">Compártela por un canal seguro y pídele que la cambie.</div>
            </div>
            <button class="btn btn-primary btn-sm w-100" type="submit" [disabled]="procesando()">Crear cuenta</button>
          </form>
        </div></div>
      </div>
    </div>
  `,
})
export class UsuariosAdmin {
  private fb = inject(FormBuilder);
  private api = inject(AdminService);
  private auth = inject(AuthService);

  roles = ['cliente', 'trabajador', 'inspector', 'supervisor', 'super_supervisor'];
  filtro = signal('');
  usuarios = signal<UsuarioLista[]>([]);
  procesando = signal(false);
  error = signal<string | null>(null);
  mensaje = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    rol: ['supervisor' as 'supervisor' | 'inspector'],
    nombres: ['', Validators.required],
    apellidos: ['', Validators.required],
    correo: ['', [Validators.required, Validators.email]],
    telefono: ['', Validators.required],
    contrasena: ['', [Validators.required, Validators.minLength(8)]],
  });

  constructor() {
    this.cargar();
  }

  yo() {
    return this.auth.usuario()?.id_usuario;
  }

  nombreRol(rol: string) {
    return NOMBRE_ROL[rol] ?? rol;
  }

  cambiarFiltro(valor: string) {
    this.filtro.set(valor);
    this.cargar();
  }

  crear() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Completa todos los campos (contraseña de al menos 8 caracteres).');
      return;
    }
    this.ejecutar(this.api.crearStaff(this.form.getRawValue()), 'Cuenta creada.', () =>
      this.form.reset({ rol: 'supervisor', nombres: '', apellidos: '', correo: '', telefono: '', contrasena: '' }),
    );
  }

  desactivar(u: UsuarioLista) {
    if (!confirm(`¿Desactivar la cuenta de ${u.nombres} ${u.apellidos}? Ya no podrá iniciar sesión.`)) return;
    this.ejecutar(this.api.desactivarUsuario(u.id_usuario), 'Cuenta desactivada.');
  }

  private cargar() {
    this.api.usuarios(this.filtro() || undefined).subscribe({
      next: (lista) => this.usuarios.set(lista),
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
