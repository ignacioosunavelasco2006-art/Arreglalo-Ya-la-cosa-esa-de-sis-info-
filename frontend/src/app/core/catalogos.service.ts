import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, forkJoin, shareReplay } from 'rxjs';

import { API_URL } from './config';
import { Categoria, Zona, ZonaAdmin } from './modelos';

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

  // ---------- Administración (supervisor) ----------
  categoriasTodas() {
    return this.http.get<Categoria[]>(`${API_URL}/catalogos/categorias/todas`);
  }

  zonasTodas() {
    return this.http.get<ZonaAdmin[]>(`${API_URL}/catalogos/zonas/todas`);
  }

  crearCategoria(nombre: string) {
    return this.http.post<Categoria>(`${API_URL}/catalogos/categorias`, { nombre });
  }

  actualizarCategoria(id: number, datos: { nombre?: string; activa?: boolean }) {
    return this.http.patch<Categoria>(`${API_URL}/catalogos/categorias/${id}`, datos);
  }

  desactivarCategoria(id: number) {
    return this.http.patch<Categoria>(`${API_URL}/catalogos/categorias/${id}/desactivar`, {});
  }

  crearZona(nombre: string) {
    return this.http.post<Zona>(`${API_URL}/catalogos/zonas`, { nombre });
  }

  actualizarZona(id: number, datos: { nombre?: string; activa?: boolean }) {
    return this.http.patch<Zona>(`${API_URL}/catalogos/zonas/${id}`, datos);
  }

  // CU-32: si la zona tiene trabajadores, el backend responde 409 con un aviso; con confirmar=true la desactiva
  desactivarZona(id: number, confirmar = false) {
    return this.http.patch<Zona>(`${API_URL}/catalogos/zonas/${id}/desactivar`, {}, {
      params: confirmar ? { confirmar: 'true' } : {},
    });
  }

  // Categorías y zonas juntas, pedidas UNA sola vez y reutilizadas (para mostrar nombres en vez de ids)
  todo() {
    return (this.cache$ ??= forkJoin({
      categorias: this.categorias(),
      zonas: this.zonas(),
    }).pipe(shareReplay(1)));
  }
}
