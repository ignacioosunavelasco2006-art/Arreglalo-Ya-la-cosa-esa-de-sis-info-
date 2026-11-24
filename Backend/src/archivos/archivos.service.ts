import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { randomUUID } from 'crypto';
import { createReadStream, existsSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';

export const TIPOS_ARCHIVO = ['documento', 'foto', 'evidencia'] as const;
export type TipoArchivo = (typeof TIPOS_ARCHIVO)[number];

export const TAMANO_MAXIMO = 5 * 1024 * 1024; // 5 MB

// Lo que Multer entrega (se define aquí para no depender de @types/multer)
export interface ArchivoSubido {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
}

interface Formato {
  ext: string;
  mime: string;
  esValido: (b: Buffer) => boolean;
}

// No se confía en el tipo que declara el navegador: se revisan los primeros bytes del archivo.
const FORMATOS: Formato[] = [
  { ext: 'jpg', mime: 'image/jpeg', esValido: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff },
  {
    ext: 'png',
    mime: 'image/png',
    esValido: (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    ext: 'webp',
    mime: 'image/webp',
    esValido: (b) => b.subarray(0, 4).toString('ascii') === 'RIFF' && b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  { ext: 'pdf', mime: 'application/pdf', esValido: (b) => b.subarray(0, 4).toString('ascii') === '%PDF' },
];

// Qué formatos admite cada tipo de archivo
const PERMITIDOS: Record<TipoArchivo, string[]> = {
  documento: ['jpg', 'png', 'webp', 'pdf'], // carnet y antecedentes
  foto: ['jpg', 'png', 'webp'], // fotos de la solicitud
  evidencia: ['jpg', 'png', 'webp', 'pdf'], // evidencias de reclamos
};

const NOMBRE_VALIDO = /^[a-zA-Z0-9-]+\.(jpg|png|webp|pdf)$/;

// Guarda archivos en disco (carpeta "uploads", fuera de cualquier ruta pública) y los entrega
// solo a través de la API, con sesión. La carpeta se puede cambiar con UPLOADS_DIR en el .env.
@Injectable()
export class ArchivosService {
  private raiz = process.env.UPLOADS_DIR ?? join(process.cwd(), 'uploads');

  async guardar(tipo: string, archivo: ArchivoSubido | undefined, idUsuario: number) {
    this.validarTipo(tipo);
    if (!archivo || !archivo.buffer?.length) {
      throw new BadRequestException('No se recibió ningún archivo (campo "archivo")');
    }
    if (archivo.size > TAMANO_MAXIMO) {
      throw new BadRequestException('El archivo supera el máximo de 5 MB');
    }

    const formato = FORMATOS.find((f) => f.esValido(archivo.buffer));
    if (!formato || !PERMITIDOS[tipo].includes(formato.ext)) {
      throw new BadRequestException(
        `Formato no permitido. Para "${tipo}" se aceptan: ${PERMITIDOS[tipo].join(', ')}`,
      );
    }

    // En los documentos el nombre lleva el id del dueño: así se sabe quién puede verlo
    const nombre =
      tipo === 'documento' ? `${idUsuario}-${randomUUID()}.${formato.ext}` : `${randomUUID()}.${formato.ext}`;

    const carpeta = join(this.raiz, tipo);
    await mkdir(carpeta, { recursive: true });
    await writeFile(join(carpeta, nombre), archivo.buffer);

    return {
      ruta: `${tipo}/${nombre}`, // esto es lo que se guarda en la base de datos
      nombre_original: archivo.originalname.slice(0, 120),
      tamano: archivo.size,
    };
  }

  obtener(tipo: string, nombre: string, usuario: { id_usuario: number; roles: string[] }) {
    this.validarTipo(tipo);
    if (!NOMBRE_VALIDO.test(nombre)) {
      throw new BadRequestException('Nombre de archivo inválido');
    }

    // Los documentos personales (carnet, antecedentes) solo los ve su dueño y la supervisión (sección 8.16)
    if (tipo === 'documento') {
      const esDueno = nombre.startsWith(`${usuario.id_usuario}-`);
      const esSupervisor = usuario.roles.includes('supervisor') || usuario.roles.includes('super_supervisor');
      if (!esDueno && !esSupervisor) {
        throw new ForbiddenException('No puedes ver este documento');
      }
    }

    const ruta = join(this.raiz, tipo, nombre);
    if (!existsSync(ruta)) throw new NotFoundException('Archivo no encontrado');

    const formato = FORMATOS.find((f) => nombre.endsWith(`.${f.ext}`))!;
    return { flujo: createReadStream(ruta), mime: formato.mime };
  }

  private validarTipo(tipo: string): asserts tipo is TipoArchivo {
    if (!(TIPOS_ARCHIVO as readonly string[]).includes(tipo)) {
      throw new BadRequestException(`tipo debe ser: ${TIPOS_ARCHIVO.join(', ')}`);
    }
  }
}
