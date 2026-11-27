import { BadRequestException, ConflictException } from '@nestjs/common';
 
export function manejarErrorBd(error: any, mensajeDuplicado?: string): never {
  if (error?.code === '23503') {
    throw new BadRequestException('Alguno de los ids indicados no existe');
  }
  if (error?.code === '23505') {
    throw new ConflictException(mensajeDuplicado ?? 'El registro ya existe');
  }
  throw error;
}
 
export function esEnteroPositivo(n: any): boolean {
  return Number.isInteger(n) && n > 0;
}
 
export function redondear(n: number): number {
  return Math.round(n * 100) / 100;
}