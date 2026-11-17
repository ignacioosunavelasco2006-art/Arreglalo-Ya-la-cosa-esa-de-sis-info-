export class CrearSolicitudDto {
  id_cliente: number;
  id_categoria: number;
  id_zona: number;
  descripcion: string;
  direccion_exacta: string;
  fecha_deseada: string; // fecha ISO
  presupuesto_aproximado?: number;
  fotos?: string[]; // rutas de las fotos
}