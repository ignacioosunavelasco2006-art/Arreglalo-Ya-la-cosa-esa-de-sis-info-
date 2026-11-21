import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

@Injectable()
export class CuentaActivaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { user } = context.switchToHttp().getRequest();
    if (user?.estado !== 'activa') {
      throw new ForbiddenException(
        'Tu cuenta está suspendida: no puedes realizar esta acción.',
      );
    }
    return true;
  }
}