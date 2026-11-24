import { Body, Controller, Get, Post } from '@nestjs/common';

import { AuthService } from './auth.service';
import { IniciarSesionDto } from './dto/iniciar-sesion.dto';
import { Public } from './decorators/public.decorator';
import { CurrentUser, UsuarioAutenticado } from './decorators/current-user.decorator';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login  (único endpoint público junto con el registro)
  @Public()
  @Post('login')
  iniciarSesion(@Body() dto: IniciarSesionDto) {
    return this.authService.iniciarSesion(dto);
  }

  // GET /auth/perfil  (requiere token; el guard global ya lo exige)
  @Get('perfil')
  obtenerPerfil(@CurrentUser() usuario: UsuarioAutenticado) {
    return usuario;
  }
}
