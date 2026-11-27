import { IsBoolean, IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class ResponderReprogramacionDto {
  @IsNotEmpty({ message: 'El campo aceptar es obligatorio' })
  @IsBoolean({ message: 'El campo aceptar debe ser verdadero o falso' })
  aceptar: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  motivo_rechazo?: string;
}