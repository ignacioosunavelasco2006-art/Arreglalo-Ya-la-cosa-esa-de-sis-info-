import { PartialType } from '@nestjs/mapped-types';
import { CrearZonaDto } from './crear-zona.dto';

export class ActualizarZonaDto extends PartialType(CrearZonaDto) {}