import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { PerfilPublico, RendimientoRespuesta } from './modelos';

@Injectable({ providedIn: 'root' })
export class TrabajadoresService {
  private http = inject(HttpClient);

  // Perfil público (sin carnet ni documentos)
  perfil(id: number) {
    return this.http.get<PerfilPublico>(`${API_URL}/trabajadores/${id}`);
  }

  // Panel de rendimiento del propio trabajador (el id sale del token)
  miRendimiento(desde?: string | null, hasta?: string | null) {
    return this.http.get<RendimientoRespuesta>(`${API_URL}/trabajadores/mi-perfil/rendimiento`, {
      params: this.filtrosFecha(desde, hasta),
    });
  }

  // Panel de rendimiento de todos los trabajadores (solo supervisión)
  rendimiento(desde?: string | null, hasta?: string | null) {
    return this.http.get<RendimientoRespuesta>(`${API_URL}/trabajadores/rendimiento`, {
      params: this.filtrosFecha(desde, hasta),
    });
  }

  // Solo envía los filtros que tienen valor
  private filtrosFecha(desde?: string | null, hasta?: string | null) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    return params;
  }
}