import { IsBoolean, IsOptional, IsString, MaxLength } from 'class-validator';

// El supervisor sale del token.
export class ResolverDevolucionDto {
  @IsBoolean()
  aprobada: boolean;

  @IsOptional() @IsString() @MaxLength(300)
  motivo_rechazo?: string;
}
