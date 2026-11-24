import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { Notificacion } from './modelos';

@Injectable({ providedIn: 'root' })
export class NotificacionesService {
  private http = inject(HttpClient);

  mias() {
    return this.http.get<Notificacion[]>(`${API_URL}/sistema/notificaciones/mias`);
  }

  leer(id: number) {
    return this.http.patch<Notificacion>(`${API_URL}/sistema/notificaciones/${id}/leer`, {});
  }

  leerTodas() {
    return this.http.patch<{ marcadas: number }>(`${API_URL}/sistema/notificaciones/leer-todas`, {});
  }
}
