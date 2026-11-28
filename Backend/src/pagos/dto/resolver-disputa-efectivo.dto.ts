
import { IsBoolean, IsString, MaxLength, MinLength } from 'class-validator';

export class ResolverDisputaEfectivoDto {
  @IsBoolean()
  recibido: boolean;

  @IsString()
  @MinLength(3)
  @MaxLength(300)
  motivo: string;
}
