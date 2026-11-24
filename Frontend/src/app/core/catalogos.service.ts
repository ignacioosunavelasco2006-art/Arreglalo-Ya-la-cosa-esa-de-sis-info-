import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, shareReplay } from 'rxjs';

import { API_URL } from './config';
import { Categoria, Zona } from './modelos';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private cache$?: Observable<{ categorias: Categoria[]; zonas: Zona[] }>;

  categorias() {
    return this.http.get<Categoria[]>(`${API_URL}/catalogos/categorias`);
  }

  zonas() {
    return this.http.get<Zona[]>(`${API_URL}/catalogos/zonas`);
  }

  // Categorías y zonas juntas, pedidas UNA sola vez y reutilizadas (para mostrar nombres en vez de ids)
  todo() {
    return (this.cache$ ??= forkJoin({
      categorias: this.categorias(),
      zonas: this.zonas(),
    }).pipe(shareReplay(1)));
  }
}
