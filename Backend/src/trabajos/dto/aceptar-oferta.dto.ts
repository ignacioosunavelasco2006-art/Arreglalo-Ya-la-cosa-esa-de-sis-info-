export class AceptarOfertaDto {
  id_oferta: number;
  id_cliente: number; // dueño de la solicitud
  metodo_pago?: string; // 'plataforma' | 'qr' | 'efectivo'
  fecha_inicio_prog?: string; // fecha ISO
  fecha_fin_prog?: string; // fecha ISO
}