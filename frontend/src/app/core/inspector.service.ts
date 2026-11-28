import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { Inspeccion } from './modelos';

@Injectable({ providedIn: 'root' })
export class InspectorService {
  private http = inject(HttpClient);

  mias() {
    return this.http.get<Inspeccion[]>(`${API_URL}/trabajadores/inspecciones/mias`);
  }

  // CU-10: registra resultado y costo, o reprograma si el trabajador no estaba presente
  registrarResultado(
    idInspeccion: number,
    datos: { estado: 'realizada' | 'reprogramada'; resultado?: string; costo_transporte?: number; fecha_programada?: string },
  ) {
    return this.http.patch<Inspeccion>(`${API_URL}/trabajadores/inspecciones/${idInspeccion}/resultado`, datos);
  }
}
