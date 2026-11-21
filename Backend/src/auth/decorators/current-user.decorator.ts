import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface UsuarioAutenticado {
  id_usuario: number;
  correo: string;
  nombres: string;
  apellidos: string;
  estado: string;
  roles: string[];
}

// Devuelve el usuario del token (lo que retorna JwtStrategy.validate).
// Uso: @CurrentUser() usuario   |   @CurrentUser('id_usuario') idUsuario
export const CurrentUser = createParamDecorator(
  (campo: keyof UsuarioAutenticado | undefined, ctx: ExecutionContext) => {
    const usuario = ctx.switchToHttp().getRequest().user as UsuarioAutenticado;
    return campo ? usuario?.[campo] : usuario;
  },
);