import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

export class CrearCategoriaDto {
  @IsString() @MinLength(2) @MaxLength(60)
  nombre: string;

  @IsOptional() @IsBoolean()
  activa?: boolean;
}