export class SubirDocumentoDto {
  id_trabajador: number;
  tipo: string; // 'carnet' | 'antecedentes' | 'otro'
  ruta_archivo: string;
}