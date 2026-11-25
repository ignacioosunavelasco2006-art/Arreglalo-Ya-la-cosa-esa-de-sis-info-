import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, shareReplay } from 'rxjs';

import { API_URL } from './config';
import { Parametro } from './modelos';

// Los porcentajes (anticipo, comisión) los configura el super supervisor (RF-34).
// El frontend los lee para mostrarlos con transparencia, sin dejarlos fijos en el código.
@Injectable({ providedIn: 'root' })
export class ParametrosService {
  private http = inject(HttpClient);
  private cache$?: Observable<Parametro[]>;

  private todos() {
    return (this.cache$ ??= this.http
      .get<Parametro[]>(`${API_URL}/sistema/parametros`)
      .pipe(shareReplay(1)));
  }

  // Devuelve una fracción: "25" -> 0.25  |  "0.25" -> 0.25  (igual que el backend)
  porcentaje(clave: string, defecto: number) {
    return this.todos().pipe(
      map((lista) => {
        const valor = Number(lista.find((p) => p.clave === clave)?.valor.replace(',', '.'));
        const numero = Number.isFinite(valor) ? valor : defecto;
        return numero >= 1 ? numero / 100 : numero;
      }),
    );
  }
}
