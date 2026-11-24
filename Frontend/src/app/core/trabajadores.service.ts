import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { PerfilPublico } from './modelos';

@Injectable({ providedIn: 'root' })
export class TrabajadoresService {
  private http = inject(HttpClient);

  // Perfil público (sin carnet ni documentos)
  perfil(id: number) {
    return this.http.get<PerfilPublico>(`${API_URL}/trabajadores/${id}`);
  }
}
