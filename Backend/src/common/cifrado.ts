import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';
import { InternalServerErrorException } from '@nestjs/common';

// RNF-04 / CU-03: los datos bancarios se guardan cifrados (AES-256-GCM).
// .env:  CLAVE_CIFRADO=<64 caracteres hexadecimales>
// Generar una:  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
function obtenerClave(): Buffer {
  const hex = process.env.CLAVE_CIFRADO ?? '';
  if (!/^[0-9a-fA-F]{64}$/.test(hex)) {
    throw new InternalServerErrorException(
      'Falta CLAVE_CIFRADO en el .env (64 caracteres hexadecimales)',
    );
  }
  return Buffer.from(hex, 'hex');
}

// Resultado: iv:etiqueta:datos (todo en base64)
export function cifrar(texto: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', obtenerClave(), iv);
  const datos = Buffer.concat([cipher.update(texto, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, datos].map((b) => b.toString('base64')).join(':');
}

export function descifrar(valor: string): string {
  const [iv, tag, datos] = valor.split(':').map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', obtenerClave(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(datos), decipher.final()]).toString('utf8');
}
