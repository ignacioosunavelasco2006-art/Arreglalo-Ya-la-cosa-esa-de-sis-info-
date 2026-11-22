import { IsDateString, IsIn, IsNumber, IsOptional, IsString, MaxLength, Min } from 'class-validator';

// CU-10 pasos 2-3: el inspector hace la visita y registra resultado y costo.
// Si el trabajador no estaba presente: estado 'reprogramada' con nueva fecha.
export class RegistrarResultadoDto {
  @IsIn(['realizada', 'reprogramada'])
  estado: string;

  @IsOptional() @IsString() @MaxLength(500)
  resultado?: string;

  @IsOptional() @IsNumber() @Min(0)
  costo_transporte?: number;

  @IsOptional() @IsDateString()
  fecha_programada?: string;
}
