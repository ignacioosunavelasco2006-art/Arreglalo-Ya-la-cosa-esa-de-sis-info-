import { HttpClient, HttpParams } from '@angular/common/http';

import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import {
  PerfilPublico,
  PerfilRevision,
  PerfilRevisionDetalle,
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
}
