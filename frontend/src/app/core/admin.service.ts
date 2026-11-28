import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { ItemBitacora, Parametro, Reporte, UsuarioLista } from './modelos';

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

  crearStaff(datos: DatosNuevoStaff) {
    return this.http.post(`${API_URL}/usuarios/supervisores`, datos);
  }

  desactivarUsuario(id: number) {
    return this.http.patch(`${API_URL}/usuarios/${id}/desactivar`, {});
  }

  // ---------- Parámetros (RF-34) ----------
  parametros() {
    return this.http.get<Parametro[]>(`${API_URL}/sistema/parametros`);
  }

  actualizarParametro(clave: string, valor: string) {
    return this.http.patch<Parametro>(`${API_URL}/sistema/parametros/${clave}`, { valor });
  }

  crearParametro(clave: string, valor: string, descripcion: string) {
    return this.http.post<Parametro>(`${API_URL}/sistema/parametros`, { clave, valor, descripcion });
  }

  // ---------- Bitácora (solo super supervisor) ----------
  bitacora(filtros: { id_usuario?: number; accion?: string; limite?: number }) {
    const params: Record<string, string | number> = {};
    if (filtros.id_usuario) params['id_usuario'] = filtros.id_usuario;
    if (filtros.accion) params['accion'] = filtros.accion;
    if (filtros.limite) params['limite'] = filtros.limite;
    return this.http.get<ItemBitacora[]>(`${API_URL}/sistema/bitacora`, { params });
  }

  // ---------- Reportes (RF-31) ----------
  reporte(tipo: TipoReporte, desde: string, hasta: string) {
    return this.http.get<Reporte>(`${API_URL}/reportes/${tipo}`, { params: { desde, hasta } });
  }

  exportarCsv(tipo: TipoReporte, desde: string, hasta: string) {
    return this.http.get(`${API_URL}/reportes/${tipo}/exportar`, {
      params: { desde, hasta },
      responseType: 'blob',
    });
  }
}
