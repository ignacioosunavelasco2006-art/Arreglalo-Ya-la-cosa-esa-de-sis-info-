import { ArrayMaxSize, IsArray, IsInt, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// El cliente sale del token.
export class CrearReclamoDto {
  @IsInt()
  id_trabajo: number;

  @IsString() @MinLength(10) @MaxLength(2000)
  descripcion: string;

  @IsOptional() @IsArray() @ArrayMaxSize(10)
  @IsString({ each: true }) @MaxLength(300, { each: true })
  evidencias?: string[];
}
