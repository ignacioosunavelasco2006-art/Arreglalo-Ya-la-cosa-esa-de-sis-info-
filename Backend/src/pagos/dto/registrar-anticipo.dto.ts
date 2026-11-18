export class RegistrarAnticipoDto {
  id_trabajo: number;
  id_cliente: number;
  medio: string; // 'plataforma' | 'qr'
  referencia_pasarela?: string;
}