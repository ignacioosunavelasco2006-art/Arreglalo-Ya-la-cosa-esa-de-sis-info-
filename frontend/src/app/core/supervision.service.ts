import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import {
  CasoReclamo,
  Devolucion,
  Incidente,
  Reclamo,
  Suspension,
} from './modelos';

export interface DatosResolverReclamo {
  decision: 'desestimar' | 'devolver_dinero' | 'sancionar' | 'suspender';
  resolucion: string;
  monto_devolucion?: number;
  dias_suspension?: number;
  nuevo_puntaje?: number;
}

// Todo lo que hacen supervisor y super supervisor (los endpoints exigen el rol).
@Injectable({ providedIn: 'root' })
export class SupervisionService {
  private http = inject(HttpClient);

  // ---------- Reclamos (RF-33) ----------
  reclamos(estado?: string) {
    return this.http.get<Reclamo[]>(`${API_URL}/reclamos`, { params: estado ? { estado } : {} });
  }

  caso(id: number) {
    return this.http.get<CasoReclamo>(`${API_URL}/reclamos/${id}/caso`);
  }

  tomarReclamo(id: number) {
    return this.http.patch<Reclamo>(`${API_URL}/reclamos/${id}/revision`, {});
  }

  escalarReclamo(id: number) {
    return this.http.patch<Reclamo>(`${API_URL}/reclamos/${id}/escalar`, {});
  }

  resolverReclamo(id: number, datos: DatosResolverReclamo) {
    return this.http.patch(`${API_URL}/reclamos/${id}/resolucion`, datos);
  }

  // ---------- Devoluciones (RF-26) ----------
  devoluciones(estado?: string) {
    return this.http.get<Devolucion[]>(`${API_URL}/pagos/devoluciones`, { params: estado ? { estado } : {} });
  }

  resolverDevolucion(id: number, aprobada: boolean, motivo_rechazo?: string) {
    return this.http.patch(`${API_URL}/pagos/devoluciones/${id}/resolver`, {
      aprobada,
      ...(motivo_rechazo ? { motivo_rechazo } : {}),
    });
  }

  procesarDevolucion(id: number) {
    return this.http.patch(`${API_URL}/pagos/devoluciones/${id}/procesar`, {});
  }

  // ---------- Incidentes y suspensiones (RF-08) ----------
  incidentes(idTrabajador?: number) {
    return this.http.get<Incidente[]>(`${API_URL}/administracion/incidentes`, {
      params: idTrabajador ? { id_trabajador: idTrabajador } : {},
    });
  }

  registrarIncidente(id_trabajador: number, id_trabajo: number, tipo: string) {
    return this.http.post(`${API_URL}/administracion/incidentes`, { id_trabajador, id_trabajo, tipo });
  }

  anularIncidente(id: number) {
    return this.http.patch(`${API_URL}/administracion/incidentes/${id}/anular`, {});
  }

  suspensiones(idUsuario?: number) {
    return this.http.get<Suspension[]>(`${API_URL}/administracion/suspensiones`, {
      params: idUsuario ? { id_usuario: idUsuario } : {},
    });
  }

  sancionar(id_usuario: number, dias_duracion: number, motivo: string) {
    return this.http.post(`${API_URL}/administracion/suspensiones`, { id_usuario, dias_duracion, motivo });
  }

  levantarSuspension(id: number) {
    return this.http.patch(`${API_URL}/administracion/suspensiones/${id}/levantar`, {});
  }
}
