import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_URL } from './config'; // cambia por lo que realmente exporta config.ts

export interface Ausencia {
  id_ausencia: number;
  fecha_inicio: string;
  fecha_fin: string;
  motivo: string | null;
}

@Injectable({ providedIn: 'root' })
export class AusenciasService {
  private http = inject(HttpClient);
  private base = `${API_URL}/trabajadores/mis-ausencias`;

  listar() {
    return this.http.get<Ausencia[]>(this.base);
  }

  crear(body: { fecha_inicio: string; fecha_fin: string; motivo?: string }, forzar = false) {
    return this.http.post<Ausencia>(`${this.base}${forzar ? '?forzar=true' : ''}`, body);
  }

  cancelar(id: number) {
    return this.http.delete(`${this.base}/${id}`);
  }
}