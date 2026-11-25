import { HttpErrorResponse } from '@angular/common/http';

// Convierte cualquier error del servidor en un texto legible para mostrar al usuario.
// NestJS responde { statusCode, message: string | string[], error }.
export function mensajeDeError(error: unknown): string {
  if (error instanceof HttpErrorResponse) {
    if (error.status === 0) {
      return 'No se pudo conectar con el servidor. ¿Está encendido el backend?';
    }
    const mensaje = error.error?.message;
    if (Array.isArray(mensaje)) return mensaje.join('. ');
    if (typeof mensaje === 'string') return mensaje;
    if (error.status === 403) return 'No tienes permiso para hacer esto.';
    if (error.status === 404) return 'No se encontró lo que buscabas.';
  }
  return 'Ocurrió un error inesperado. Inténtalo de nuevo.';
}
