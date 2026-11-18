import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearZonaDto {
  @IsString() @MinLength(2) @MaxLength(100)
  nombre: string;

  @IsOptional() @IsBoolean()
  activa?: boolean;
}