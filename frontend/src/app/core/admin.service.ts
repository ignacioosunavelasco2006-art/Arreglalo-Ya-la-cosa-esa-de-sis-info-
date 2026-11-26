import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { ItemBitacora, Parametro, UsuarioLista } from './modelos';

export type TipoReporte = 'trabajos' | 'ingresos' | 'calificaciones' | 'reclamos' | 'cancelaciones' | 'flujo-economico';

export interface DatosNuevoStaff {
  nombres: string;
  apellidos: string;
  correo: string;
  contrasena: string;
  telefono: string;
  rol: 'supervisor' | 'inspector';
}

@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);

  // ---------- Usuarios (supervisión) ----------
  usuarios(rol?: string) {
    return this.http.get<UsuarioLista[]>(`${API_URL}/usuarios`, { params: rol ? { rol } : {} });
  }

  // ---------- Bitácora (solo super supervisor) ----------
  bitacora(filtros: { id_usuario?: number; accion?: string; entidad?: string; id_entidad?: number; limite?: number }) {
    const params: Record<string, string | number> = {};
    if (filtros.id_usuario) params['id_usuario'] = filtros.id_usuario;
    if (filtros.accion) params['accion'] = filtros.accion;
    if (filtros.entidad) params['entidad'] = filtros.entidad;
    if (filtros.id_entidad) params['id_entidad'] = filtros.id_entidad;
    if (filtros.limite) params['limite'] = filtros.limite;
    return this.http.get<ItemBitacora[]>(`${API_URL}/sistema/bitacora`, { params });
  }
}
