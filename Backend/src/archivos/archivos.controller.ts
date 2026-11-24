import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';

import { ArchivoSubido, ArchivosService, TAMANO_MAXIMO } from './archivos.service';
import { CurrentUser, UsuarioAutenticado } from '../auth/decorators/current-user.decorator';

// Sin @Public(): el guard global exige sesión para subir y para descargar.
@Controller('archivos')
export class ArchivosController {
  constructor(private readonly archivosService: ArchivosService) {}

  // POST /archivos?tipo=documento|foto|evidencia   (multipart/form-data, campo "archivo")
  @Post()
  @UseInterceptors(FileInterceptor('archivo', { limits: { fileSize: TAMANO_MAXIMO, files: 1 } }))
  subir(
    @UploadedFile() archivo: ArchivoSubido | undefined,
    @Query('tipo') tipo: string,
    @CurrentUser('id_usuario') idUsuario: number,
  ) {
    return this.archivosService.guardar(tipo, archivo, idUsuario);
  }

  // GET /archivos/documento/12-uuid.pdf
  @Get(':tipo/:nombre')
  descargar(
    @Param('tipo') tipo: string,
    @Param('nombre') nombre: string,
    @CurrentUser() usuario: UsuarioAutenticado,
  ) {
    const { flujo, mime } = this.archivosService.obtener(tipo, nombre, usuario);
    return new StreamableFile(flujo, {
      type: mime,
      disposition: 'inline',
    });
  }
}
