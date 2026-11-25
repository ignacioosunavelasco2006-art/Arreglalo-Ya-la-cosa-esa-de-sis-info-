
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, shareReplay } from 'rxjs';

import { API_URL } from './config';
import { Categoria, Zona } from './modelos';

@Injectable({ providedIn: 'root' })
export class CatalogosService {
  private http = inject(HttpClient);
  private cache$?: Observable<{ categorias: Categoria[]; zonas: Zona[] }>;

  // ---------- CATÁLOGOS PÚBLICOS ----------

  categorias() {
    return this.http.get<Categoria[]>(`${API_URL}/catalogos/categorias`);
  }

  zonas() {
    return this.http.get<Zona[]>(`${API_URL}/catalogos/zonas`);
  }

  todo() {
    return (this.cache$ ??= forkJoin({
      categorias: this.categorias(),
      zonas: this.zonas(),
    }).pipe(shareReplay(1)));
  }

  // ---------- ADMINISTRACIÓN: SUPERVISIÓN ----------

  categoriasTodas() {
    return this.http.get<Categoria[]>(
      `${API_URL}/catalogos/categorias/todas`,
    );
  }

  zonasTodas() {
    return this.http.get<{
      id_zona: number;
      nombre: string;
      activa: boolean;
      trabajadores_asignados: number;
    }[]>(`${API_URL}/catalogos/zonas/todas`);
  }

  crearCategoria(nombre: string) {
    return this.http.post<Categoria>(
      `${API_URL}/catalogos/categorias`,
      { nombre },
    );
  }

  actualizarCategoria(
    id: number,
    datos: { nombre?: string; activa?: boolean },
  ) {
    return this.http.patch<Categoria>(
      `${API_URL}/catalogos/categorias/${id}`,
      datos,
    );
  }

  desactivarCategoria(id: number) {
    return this.http.patch<Categoria>(
      `${API_URL}/catalogos/categorias/${id}/desactivar`,
      {},
    );
  }

  crearZona(nombre: string) {
    return this.http.post<Zona>(
      `${API_URL}/catalogos/zonas`,
      { nombre },
    );
  }

  actualizarZona(
    id: number,
    datos: { nombre?: string; activa?: boolean },
  ) {
    return this.http.patch<Zona>(
      `${API_URL}/catalogos/zonas/${id}`,
      datos,
    );
  }

  desactivarZona(id: number, confirmar = false) {
    return this.http.patch<Zona>(
      `${API_URL}/catalogos/zonas/${id}/desactivar`,
      {},
      {
        params: confirmar ? { confirmar: 'true' } : {},
      },
    );
  }
}
