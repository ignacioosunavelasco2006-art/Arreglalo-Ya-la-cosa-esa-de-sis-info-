import { ArrayMinSize, IsArray, IsInt } from 'class-validator';

export class AsignarZonasDto {
  @IsArray() @ArrayMinSize(1)
  @IsInt({ each: true })
  ids_zonas: number[];
}
