import { IsDateString, IsIn, IsInt, IsOptional } from 'class-validator';

// El cliente sale del token. Las fechas programadas permiten validar cruces de agenda (RN-11).
export class AceptarOfertaDto {
  @IsInt()
  id_oferta: number;

  @IsOptional() @IsIn(['plataforma', 'qr', 'efectivo'])
  metodo_pago?: string;

  @IsOptional() @IsDateString()
  fecha_inicio_prog?: string;

  @IsOptional() @IsDateString()
  fecha_fin_prog?: string;
}
