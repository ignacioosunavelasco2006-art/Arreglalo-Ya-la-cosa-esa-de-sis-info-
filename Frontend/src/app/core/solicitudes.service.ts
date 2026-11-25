import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { NuevaSolicitud, Oferta, OfertaPropia, Solicitud, SolicitudDisponible } from './modelos';

@Injectable({ providedIn: 'root' })
export class SolicitudesService {
  private http = inject(HttpClient);

  crear(datos: NuevaSolicitud) {
    return this.http.post<Solicitud>(`${API_URL}/solicitudes`, datos);
  }

  mias(estado?: string) {
    return this.http.get<Solicitud[]>(`${API_URL}/solicitudes/mias`, {
      params: estado ? { estado } : {},
    });
  }

  obtener(id: number) {
    return this.http.get<Solicitud>(`${API_URL}/solicitudes/${id}`);
  }

  ofertas(id: number) {
    return this.http.get<Oferta[]>(`${API_URL}/solicitudes/${id}/ofertas`);
  }

  cancelar(id: number) {
    return this.http.patch<Solicitud>(`${API_URL}/solicitudes/${id}`, { estado: 'cancelada' });
  }

  // ---- Lado trabajador ----
  disponibles(filtros: { id_categoria?: number; id_zona?: number } = {}) {
    const params: Record<string, number> = {};
    if (filtros.id_categoria) params['id_categoria'] = filtros.id_categoria;
    if (filtros.id_zona) params['id_zona'] = filtros.id_zona;
    return this.http.get<SolicitudDisponible[]>(`${API_URL}/solicitudes/disponibles`, { params });
  }

  crearOferta(idSolicitud: number, datos: { precio_estimado: number; comentario?: string; requiere_visita?: boolean }) {
    return this.http.post<OfertaPropia>(`${API_URL}/solicitudes/${idSolicitud}/ofertas`, datos);
  }

  misOfertas() {
    return this.http.get<OfertaPropia[]>(`${API_URL}/solicitudes/ofertas/mias`);
  }

  actualizarOferta(idOferta: number, datos: { precio_estimado?: number; comentario?: string; requiere_visita?: boolean }) {
    return this.http.patch<OfertaPropia>(`${API_URL}/solicitudes/ofertas/${idOferta}`, datos);
  }

  rechazarOferta(idOferta: number) {
    return this.http.patch<Oferta>(`${API_URL}/solicitudes/ofertas/${idOferta}/rechazo`, {});
  }
}
