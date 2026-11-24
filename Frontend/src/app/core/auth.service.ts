import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';

import { API_URL } from './config';
import { DatosLogin, DatosRegistro, RespuestaLogin, Usuario } from './modelos';

const CLAVE_SESION = 'arreglalo_sesion';
const CLAVE_ROL = 'arreglalo_rol_activo';

// Orden de importancia para elegir el rol con el que se entra por defecto
const ORDEN_ROLES = ['super_supervisor', 'supervisor', 'inspector', 'trabajador', 'cliente'];

interface Sesion {
  access_token: string;
  usuario: Usuario;
}

// Un 'servicio' es una clase que guarda lógica compartida por varias pantallas.
// Este recuerda quién inició sesión. Usa 'signals': variables que avisan solas a la pantalla cuando cambian.
@Injectable({ providedIn: 'root' })
export class AuthService {
  private http = inject(HttpClient);
  private router = inject(Router);

  private sesion = signal<Sesion | null>(this.leerSesionGuardada());
  private rolElegido = signal<string | null>(localStorage.getItem(CLAVE_ROL));

  readonly usuario = computed(() => this.sesion()?.usuario ?? null);
  readonly token = computed(() => this.sesion()?.access_token ?? null);
  readonly estaLogueado = computed(() => this.sesion() !== null);
  readonly roles = computed(() => this.usuario()?.roles ?? []);

  // RF-02: una persona puede ser cliente y trabajador a la vez y cambiar de función.
  // 'rolActivo' es la función con la que está usando la app ahora.
  readonly rolActivo = computed(() => {
    const roles = this.roles();
    const elegido = this.rolElegido();
    if (elegido && roles.includes(elegido)) return elegido;
    return ORDEN_ROLES.find((r) => roles.includes(r)) ?? 'cliente';
  });

  login(datos: DatosLogin) {
    return this.http
      .post<RespuestaLogin>(`${API_URL}/auth/login`, datos)
      .pipe(tap((respuesta) => this.guardarSesion(respuesta)));
  }

  registrar(datos: DatosRegistro) {
    return this.http.post<Usuario>(`${API_URL}/usuarios`, datos);
  }

  cerrarSesion(sesionExpirada = false) {
    localStorage.removeItem(CLAVE_SESION);
    localStorage.removeItem(CLAVE_ROL);
    this.sesion.set(null);
    this.rolElegido.set(null);
    this.router.navigate(['/login'], sesionExpirada ? { queryParams: { expirada: 1 } } : {});
  }

  tieneRol(...roles: string[]): boolean {
    return roles.some((rol) => this.roles().includes(rol));
  }

  cambiarRol(rol: string) {
    if (!this.roles().includes(rol)) return;
    localStorage.setItem(CLAVE_ROL, rol);
    this.rolElegido.set(rol);
    this.router.navigateByUrl('/inicio');
  }

  // Cuando el usuario edita sus datos, se refleja en el menú sin volver a entrar
  actualizarUsuarioLocal(cambios: Partial<Usuario>) {
    const actual = this.sesion();
    if (!actual) return;
    const nueva = { ...actual, usuario: { ...actual.usuario, ...cambios } };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(nueva));
    this.sesion.set(nueva);
  }

  private guardarSesion(respuesta: RespuestaLogin) {
    const sesion: Sesion = { access_token: respuesta.access_token, usuario: respuesta.usuario };
    localStorage.setItem(CLAVE_SESION, JSON.stringify(sesion));
    localStorage.removeItem(CLAVE_ROL);
    this.rolElegido.set(null);
    this.sesion.set(sesion);
  }

  // Al abrir la página, recupera la sesión si el token aún no venció
  private leerSesionGuardada(): Sesion | null {
    try {
      const texto = localStorage.getItem(CLAVE_SESION);
      if (!texto) return null;
      const sesion = JSON.parse(texto) as Sesion;
      if (this.tokenVencido(sesion.access_token)) {
        localStorage.removeItem(CLAVE_SESION);
        return null;
      }
      return sesion;
    } catch {
      return null;
    }
  }

  // Un JWT trae su fecha de vencimiento ('exp') en la parte central, codificada en base64
  private tokenVencido(token: string): boolean {
    try {
      const cuerpo = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const { exp } = JSON.parse(atob(cuerpo)) as { exp?: number };
      return exp !== undefined && exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }
}
