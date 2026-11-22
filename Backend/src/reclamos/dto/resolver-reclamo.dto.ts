import { IsIn, IsInt, IsNumber, IsOptional, IsPositive, IsString, Max, MaxLength, Min, MinLength } from 'class-validator';

// CU-33 paso 3: el supervisor decide desestimar, devolver dinero, sancionar o suspender.
export class ResolverReclamoDto {
  @IsIn(['desestimar', 'devolver_dinero', 'sancionar', 'suspender'])
  decision: string;

  @IsString() @MinLength(5) @MaxLength(500)
  resolucion: string;

  // Obligatorio con 'devolver_dinero'
  @IsOptional() @IsNumber({ maxDecimalPlaces: 2 }) @IsPositive()
  monto_devolucion?: number;

  // Obligatorio con 'suspender'
  @IsOptional() @IsInt() @Min(1) @Max(365)
  dias_suspension?: number;

  // CU-28: con el trabajo cerrado, la calificación solo se ajusta por reclamo
  @IsOptional() @IsInt() @Min(1) @Max(5)
  nuevo_puntaje?: number;
}
