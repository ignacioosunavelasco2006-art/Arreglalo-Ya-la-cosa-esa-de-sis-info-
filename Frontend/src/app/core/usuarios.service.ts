import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { DatosBancarios, Usuario } from './modelos';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private http = inject(HttpClient);

  miCuenta() {
    return this.http.get<Usuario>(`${API_URL}/usuarios/mi-cuenta`);
  }

  actualizar(datos: Partial<Pick<Usuario, 'nombres' | 'apellidos' | 'correo' | 'telefono'>>) {
    return this.http.patch<Usuario>(`${API_URL}/usuarios/mi-cuenta`, datos);
  }

  activarFuncion(rol: 'cliente' | 'trabajador') {
    return this.http.post<{ mensaje: string; roles: string[]; nota: string }>(
      `${API_URL}/usuarios/mi-cuenta/funciones/${rol}`,
      {},
    );
  }

  // RF-03: el número de cuenta se guarda cifrado y la API solo lo devuelve enmascarado
  datosBancarios() {
    return this.http.get<DatosBancarios>(`${API_URL}/usuarios/mi-cuenta/datos-bancarios`);
  }

  guardarDatosBancarios(datos: { banco: string; titular: string; numero_cuenta: string }) {
    return this.http.put<DatosBancarios>(`${API_URL}/usuarios/mi-cuenta/datos-bancarios`, datos);
  }
}
