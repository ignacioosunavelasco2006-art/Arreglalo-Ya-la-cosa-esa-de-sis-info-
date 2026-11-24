import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';

import { API_URL } from './config';
import { Pago } from './modelos';

@Injectable({ providedIn: 'root' })
export class PagosService {
  private http = inject(HttpClient);

  anticipo(idTrabajo: number, medio: 'plataforma' | 'qr') {
    return this.http.post<Pago>(`${API_URL}/pagos/anticipo`, { id_trabajo: idTrabajo, medio });
  }

  delTrabajo(idTrabajo: number) {
    return this.http.get<Pago[]>(`${API_URL}/pagos/trabajo/${idTrabajo}`);
  }

  // RF-24: el trabajador confirma si recibió el efectivo
  confirmarEfectivo(idPago: number, recibido: boolean) {
    return this.http.patch(`${API_URL}/pagos/${idPago}/efectivo`, { recibido });
  }

  cancelar(idTrabajo: number, motivo?: string) {
    return this.http.post(`${API_URL}/pagos/cancelaciones`, {
      id_trabajo: idTrabajo,
      ...(motivo ? { motivo } : {}),
    });
  }
}
