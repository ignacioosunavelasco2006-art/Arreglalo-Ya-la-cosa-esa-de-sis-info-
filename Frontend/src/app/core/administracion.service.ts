import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';

@Injectable({ providedIn: 'root' })
export class AdministracionService {
  private http = inject(HttpClient);

  // RF-07: el trabajador pausa su cuenta 30 días
  suspenderMiCuenta() {
    return this.http.post(`${API_URL}/administracion/mi-suspension`, {});
  }

  reactivarMiCuenta() {
    return this.http.post<{ mensaje: string }>(`${API_URL}/administracion/mi-suspension/reactivar`, {});
  }
}
