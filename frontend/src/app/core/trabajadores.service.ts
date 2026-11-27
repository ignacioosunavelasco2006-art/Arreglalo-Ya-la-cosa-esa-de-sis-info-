import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import {
  PerfilPublico,
  PerfilRevision,
  PerfilRevisionDetalle,
  RendimientoRespuesta,
} from './modelos';

@Injectable({ providedIn: 'root' })
export class TrabajadoresService {
  private http = inject(HttpClient);

  // Perfil público (sin carnet ni documentos)
  perfil(id: number) {
    return this.http.get<PerfilPublico>(`${API_URL}/trabajadores/${id}`);
  }

  // SUPERVISIÓN: lista de trabajadores pendientes u observados
  colaRevision(estado?: string) {
  let params = new HttpParams();

  if (estado) {
    params = params.set('estado', estado);
  }

  return this.http.get<PerfilRevision[]>(
    `${API_URL}/trabajadores/revision`,
    { params },
  );
}

  // SUPERVISIÓN: detalle privado del trabajador
  detalleRevision(id: number) {
    return this.http.get<PerfilRevisionDetalle>(
      `${API_URL}/trabajadores/${id}/detalle`,
    );
  }

  // SUPERVISIÓN: aprobar, observar o rechazar
  revisar(
    id: number,
    estado: 'aprobado' | 'observado' | 'rechazado',
    motivo_rechazo?: string,
  ) {
    return this.http.patch<PerfilRevision>(
      `${API_URL}/trabajadores/${id}/revision`,
      {
        estado_verificacion: estado,
        ...(motivo_rechazo ? { motivo_rechazo } : {}),
      },
    );
  }

  // SUPERVISIÓN: panel de rendimiento de todos los trabajadores (filtros opcionales)
  rendimiento(desde?: string, hasta?: string, idTrabajador?: number) {
    return this.http.get<RendimientoRespuesta>(`${API_URL}/trabajadores/rendimiento`, {
      params: this.paramsRendimiento(desde, hasta, idTrabajador),
    });
  }

  // TRABAJADOR: su propio panel (el backend toma el id del token)
  miRendimiento(desde?: string, hasta?: string) {
    return this.http.get<RendimientoRespuesta>(`${API_URL}/trabajadores/mi-perfil/rendimiento`, {
      params: this.paramsRendimiento(desde, hasta),
    });
  }

  // Solo se envían los parámetros con valor (el backend rechaza campos desconocidos o vacíos inválidos)
  private paramsRendimiento(desde?: string, hasta?: string, idTrabajador?: number) {
    let params = new HttpParams();
    if (desde) params = params.set('desde', desde);
    if (hasta) params = params.set('hasta', hasta);
    if (idTrabajador) params = params.set('id_trabajador', idTrabajador);
    return params;
  }
}
