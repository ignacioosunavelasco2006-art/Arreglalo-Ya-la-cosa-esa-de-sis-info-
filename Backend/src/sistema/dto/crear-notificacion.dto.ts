import {
  IsInt,
  IsString,
  IsIn,
  MaxLength,
} from 'class-validator';

export class CrearNotificacionDto {
  @IsInt()
  id_usuario: number;

  @IsString()
  @MaxLength(40)
  tipo: string;

  @IsString()
  @MaxLength(300)
  mensaje: string;

  @IsIn(['web', 'correo', 'whatsapp'])
  canal: string;
}
