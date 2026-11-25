import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { CalificacionRecibida, TrabajoPendienteCalificar } from './modelos';

@Injectable({ providedIn: 'root' })
export class CalificacionesService {
  private http = inject(HttpClient);

  crear(idTrabajo: number, puntaje: number, comentario?: string) {
    return this.http.post(`${API_URL}/calificaciones`, {
      id_trabajo: idTrabajo,
      puntaje,
      ...(comentario ? { comentario } : {}),
    });
  }

  // Calificaciones que recibió un trabajador
  delTrabajador(idTrabajador: number) {
    return this.http.get<CalificacionRecibida[]>(`${API_URL}/calificaciones/trabajador/${idTrabajador}`);
  }

  responder(idCalificacion: number, respuesta: string) {
    return this.http.patch(`${API_URL}/calificaciones/${idCalificacion}/respuesta`, { respuesta });
  }

  // RF-30: calificación interna del cliente; solo la ve la administración
  calificarCliente(idTrabajo: number, puntaje: number, nota?: string) {
    return this.http.post<{ mensaje: string }>(`${API_URL}/calificaciones/internas`, {
      id_trabajo: idTrabajo,
      puntaje,
      ...(nota ? { nota } : {}),
    });
  }

  // Trabajos terminados que el cliente aún no calificó
  pendientes() {
    return this.http.get<TrabajoPendienteCalificar[]>(`${API_URL}/calificaciones/pendientes`);
  }
}
