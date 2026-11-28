
import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { BloqueDisponibilidad, DocumentoTrabajador, PerfilPrivado } from './modelos';

export interface DatosPerfil {
  carnet_identidad: string;
  descripcion?: string;
  anios_experiencia?: number;
}

@Injectable({ providedIn: 'root' })
export class MiPerfilService {
  private http = inject(HttpClient);
  private base = `${API_URL}/trabajadores/mi-perfil`;

  obtener() {
    return this.http.get<PerfilPrivado>(this.base);
  }

  crear(datos: DatosPerfil) {
    return this.http.post(this.base, datos);
  }

  actualizar(datos: Partial<DatosPerfil>) {
    return this.http.patch(this.base, datos);
  }

  subirFotoPerfil(foto: File) {
    const formData = new FormData();
    formData.append('foto', foto);

    return this.http.post<PerfilPrivado>(
      `${this.base}/foto-perfil`,
      formData
    );
  }

  fotoUrl(ruta: string | null): string {
    if (!ruta) return '';

    if (ruta.startsWith('http')) return ruta;

    return `${API_URL.replace(/\/$/, '')}${ruta}`;
  }

  subirDocumento(tipo: string, ruta_archivo: string) {
    return this.http.post<DocumentoTrabajador>(
      `${this.base}/documentos`,
      { tipo, ruta_archivo }
    );
  }

  asignarCategorias(categorias: { id_categoria: number; precio_estimado?: number }[]) {
    return this.http.put(`${this.base}/categorias`, { categorias });
  }

  asignarZonas(ids_zonas: number[]) {
    return this.http.put(`${this.base}/zonas`, { ids_zonas });
  }

  enviarRevision() {
    return this.http.post<{ mensaje: string; estado_verificacion: string }>(
      `${this.base}/enviar-revision`,
      {}
    );
  }

  disponibilidad() {
    return this.http.get<BloqueDisponibilidad[]>(`${this.base}/disponibilidad`);
  }

  crearBloque(datos: { dia_semana: number; hora_inicio: string; hora_fin: string }) {
    return this.http.post<BloqueDisponibilidad>(
      `${this.base}/disponibilidad`,
      datos
    );
  }

  actualizarBloque(id: number, datos: { activa: boolean }) {
    return this.http.patch<BloqueDisponibilidad>(
      `${this.base}/disponibilidad/${id}`,
      datos
    );
  }
}
