import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { Calendario, Reprogramacion, Trabajo, TrabajoDetalle, VisitaPrevia } from './modelos';

export interface DatosAceptarOferta {
  id_oferta: number;
  metodo_pago: string;
  fecha_inicio_prog: string; // ISO
  fecha_fin_prog: string; // ISO
}

@Injectable({ providedIn: 'root' })
export class TrabajosService {
  private http = inject(HttpClient);

  aceptarOferta(datos: DatosAceptarOferta) {
    return this.http.post<Trabajo>(`${API_URL}/trabajos/aceptar-oferta`, datos);
  }

  misTrabajos(estado?: string) {
    return this.http.get<Trabajo[]>(`${API_URL}/trabajos/mis-trabajos`, {
      params: estado ? { estado } : {},
    });
  }

  obtener(id: number) {
    return this.http.get<TrabajoDetalle>(`${API_URL}/trabajos/${id}`);
  }

  // ---- Visitas previas ----
  visitas(idOferta: number) {
    return this.http.get<VisitaPrevia[]>(`${API_URL}/trabajos/ofertas/${idOferta}/visitas`);
  }

  responderVisita(idVisita: number, accion: 'aceptar_fecha' | 'aceptar_precio' | 'rechazar') {
    return this.http.patch<VisitaPrevia>(`${API_URL}/trabajos/visitas/${idVisita}`, { accion });
  }

  // ---- Lado trabajador ----
  proponerVisita(idOferta: number, fecha_propuesta: string) {
    return this.http.post<VisitaPrevia>(`${API_URL}/trabajos/visitas`, { id_oferta: idOferta, fecha_propuesta });
  }

  registrarResultadoVisita(idVisita: number, resultado: string, precio_definitivo: number) {
    return this.http.patch<VisitaPrevia>(`${API_URL}/trabajos/visitas/${idVisita}`, {
      accion: 'registrar_resultado',
      resultado,
      precio_definitivo,
    });
  }

  cambiarEstado(idTrabajo: number, estado: 'en_camino' | 'en_proceso') {
    return this.http.patch(`${API_URL}/trabajos/${idTrabajo}/estado`, { estado });
  }

  pedirIncremento(idTrabajo: number, monto_adicional: number, justificacion: string) {
    return this.http.post(`${API_URL}/trabajos/incrementos`, { id_trabajo: idTrabajo, monto_adicional, justificacion });
  }

  pedirFinalizacion(idTrabajo: number) {
    return this.http.post(`${API_URL}/trabajos/finalizaciones`, { id_trabajo: idTrabajo });
  }

  calendario(desde?: string, hasta?: string) {
    const params: Record<string, string> = {};
    if (desde) params['desde'] = desde;
    if (hasta) params['hasta'] = hasta;
    return this.http.get<Calendario>(`${API_URL}/trabajos/calendario`, { params });
  }

  // ---- Incrementos de precio ----
  responderIncremento(idIncremento: number, aceptar: boolean) {
    return this.http.patch(`${API_URL}/trabajos/incrementos/${idIncremento}`, { aceptar });
  }

  // ---- Finalización ----
  responderFinalizacion(idFinalizacion: number, aceptar: boolean, motivo_rechazo?: string) {
    return this.http.patch(`${API_URL}/trabajos/finalizaciones/${idFinalizacion}`, {
      aceptar,
      ...(motivo_rechazo ? { motivo_rechazo } : {}),
    });
  }

  // ---- Reprogramaciones ----
  solicitarReprogramacion(
    idTrabajo: number,
    fecha_inicio_propuesta: string,
    fecha_fin_propuesta: string,
    motivo: string,
  ) {
    return this.http.post<Reprogramacion>(`${API_URL}/trabajos/${idTrabajo}/reprogramaciones`, {
      fecha_inicio_propuesta,
      fecha_fin_propuesta,
      motivo,
    });
  }

  obtenerReprogramaciones(idTrabajo: number) {
    return this.http.get<Reprogramacion[]>(`${API_URL}/trabajos/${idTrabajo}/reprogramaciones`);
  }

  responderReprogramacion(idReprogramacion: number, aceptar: boolean, motivo_rechazo?: string) {
    return this.http.patch(`${API_URL}/trabajos/reprogramaciones/${idReprogramacion}`, {
      aceptar,
      ...(motivo_rechazo ? { motivo_rechazo } : {}),
    });
  }
}