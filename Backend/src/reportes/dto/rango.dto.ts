import { IsDateString, IsOptional } from 'class-validator';

// ?desde=2026-11-01&hasta=2026-11-30  (si se omiten: últimos 30 días)
export class RangoDto {
  @IsOptional()
  @IsDateString()
  desde?: string;

  @IsOptional()
  @IsDateString()
  hasta?: string;
}
