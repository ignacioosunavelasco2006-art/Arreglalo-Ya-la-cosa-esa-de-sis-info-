import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { ReclamoContraMi } from './modelos';

@Injectable({ providedIn: 'root' })
export class ReclamosService {
  private http = inject(HttpClient);

  // Reclamos presentados sobre los trabajos del trabajador (sin datos del cliente)
  contraMi() {
    return this.http.get<ReclamoContraMi[]>(`${API_URL}/reclamos/contra-mi`);
  }
}
