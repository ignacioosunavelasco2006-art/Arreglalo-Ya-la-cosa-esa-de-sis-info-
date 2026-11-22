import { IsString, MaxLength, MinLength } from 'class-validator';

export class AgregarFotoSolicitudDto {
  @IsString() @MinLength(1) @MaxLength(300)
  ruta_archivo: string;
}
