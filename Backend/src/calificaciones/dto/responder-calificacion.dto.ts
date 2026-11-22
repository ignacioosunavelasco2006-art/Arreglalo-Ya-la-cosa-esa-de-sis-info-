import { IsString, MaxLength, MinLength } from 'class-validator';

export class ResponderCalificacionDto {
  @IsString() @MinLength(1) @MaxLength(500)
  respuesta: string;
}
