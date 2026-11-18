export class CrearReclamoDto {
  id_trabajo: number;
  id_cliente: number;
  descripcion: string;
  evidencias?: string[]; // rutas de archivo
}