
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';

export interface ClasificacionTrabajador {
  id_trabajador: number;
  cantidad_incidentes: number;
  atrasos: number;
  cancelaciones: number;
  reclamos: number;
  puntaje: number;
  umbral: number;
  es_reincidente: boolean;
  clasificacion: string;
  periodo_dias: number;
  fecha_evaluacion: string;
}

export interface HistorialClasificacion {
  id_historial: number;
  id_trabajador: number;
  puntaje: number;
  clasificacion: string;
  es_reincidente: boolean;
  cantidad_incidentes: number;
  periodo_dias: number;
  id_usuario_evaluador: number;
  fecha_evaluacion: string;
}

@Injectable({ providedIn: 'root' })
export class AdministracionService {
  private http = inject(HttpClient);

  // RF-07: el trabajador pausa su cuenta 30 días
  suspenderMiCuenta() {
    return this.http.post(`${API_URL}/administracion/mi-suspension`, {});
  }

  reactivarMiCuenta() {
    return this.http.post<{ mensaje: string }>(
      `${API_URL}/administracion/mi-suspension/reactivar`,
      {},
    );
  }

  obtenerClasificacion(id: number) {
    return this.http.get<ClasificacionTrabajador>(
      `${API_URL}/administracion/trabajadores/${id}/clasificacion`,
    );
  }

  obtenerHistorialClasificacion(id: number) {
    return this.http.get<HistorialClasificacion[]>(
      `${API_URL}/administracion/trabajadores/${id}/clasificacion/historial`,
    );
  }

  registrarEvaluacion(id: number) {
  return this.http.post<ClasificacionTrabajador>(
    `${API_URL}/administracion/trabajadores/${id}/clasificacion/evaluar`,
    {},
  );
}
}
