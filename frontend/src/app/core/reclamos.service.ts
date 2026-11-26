import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { Devolucion, Reclamo, ReclamoConEvidencias, ReclamoContraMi } from './modelos';

@Injectable({ providedIn: 'root' })
export class ReclamosService {
  private http = inject(HttpClient);

  // ---- Lado cliente (RF-29) ----
  mios() {
    return this.http.get<Reclamo[]>(`${API_URL}/reclamos/mios`);
  }

  obtener(id: number) {
    return this.http.get<ReclamoConEvidencias>(`${API_URL}/reclamos/${id}`);
  }

  crear(id_trabajo: number, descripcion: string, evidencias: string[]) {
    return this.http.post<Reclamo>(`${API_URL}/reclamos`, {
      id_trabajo,
      descripcion,
      ...(evidencias.length ? { evidencias } : {}),
    });
  }

  agregarEvidencia(idReclamo: number, ruta_archivo: string) {
    return this.http.post(`${API_URL}/reclamos/${idReclamo}/evidencias`, { ruta_archivo });
  }

  misDevoluciones() {
    return this.http.get<Devolucion[]>(`${API_URL}/pagos/devoluciones/mias`);
  }

  // Reclamos presentados sobre los trabajos del trabajador (sin datos del cliente)
  contraMi() {
    return this.http.get<ReclamoContraMi[]>(`${API_URL}/reclamos/contra-mi`);
  }
}
