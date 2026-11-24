import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { ArchivoSubido } from './modelos';

export type TipoArchivo = 'documento' | 'foto' | 'evidencia';

@Injectable({ providedIn: 'root' })
export class ArchivosService {
  private http = inject(HttpClient);

  // Sube un archivo y devuelve su "ruta", que luego se guarda en la solicitud, el documento, etc.
  subir(tipo: TipoArchivo, archivo: File) {
    const formulario = new FormData();
    formulario.append('archivo', archivo);
    return this.http.post<ArchivoSubido>(`${API_URL}/archivos`, formulario, { params: { tipo } });
  }

  // Los archivos NO son públicos: se piden con sesión y llegan como "blob".
  descargar(ruta: string) {
    return this.http.get(`${API_URL}/archivos/${ruta}`, { responseType: 'blob' });
  }

  // Abre el archivo en una pestaña nueva (la pestaña se abre primero para que el navegador no la bloquee)
  abrir(ruta: string, alFallar?: () => void) {
    const ventana = window.open('', '_blank');
    this.descargar(ruta).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        if (ventana) ventana.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => {
        ventana?.close();
        alFallar?.();
      },
    });
  }
}
