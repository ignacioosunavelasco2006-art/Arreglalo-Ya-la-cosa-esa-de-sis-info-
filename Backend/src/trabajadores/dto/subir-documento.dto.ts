import { IsIn, IsString, MaxLength } from 'class-validator';

export class SubirDocumentoDto {
  @IsIn(['carnet', 'antecedentes', 'otro'])
  tipo: string;

  // Ruta devuelta por tu servicio de almacenamiento privado (RNF-04), no una URL pública.
  @IsString() @MaxLength(300)
  ruta_archivo: string;
}
