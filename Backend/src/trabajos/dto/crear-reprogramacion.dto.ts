import { IsDateString, IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CrearReprogramacionDto {
  @IsNotEmpty({ message: 'La fecha de inicio propuesta es obligatoria' })
  @IsDateString({}, { message: 'La fecha de inicio debe ser válida' })
  fecha_inicio_propuesta: string;

  @IsNotEmpty({ message: 'La fecha de fin propuesta es obligatoria' })
  @IsDateString({}, { message: 'La fecha de fin debe ser válida' })
  fecha_fin_propuesta: string;

  @IsNotEmpty({ message: 'El motivo es obligatorio' })
  @IsString()
  @MaxLength(300)
  motivo: string;
}