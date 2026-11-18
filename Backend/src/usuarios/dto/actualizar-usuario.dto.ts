import { PartialType } from '@nestjs/mapped-types';
import { OmitType } from '@nestjs/mapped-types';
import { CrearUsuarioDto } from './crear-usuario.dto';

// Igual que crear, pero todo opcional y sin contraseña
export class ActualizarUsuarioDto extends PartialType(
  OmitType(CrearUsuarioDto, ['contrasena'] as const),
) {}