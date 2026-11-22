import { Type } from 'class-transformer';
import { ArrayMinSize, IsArray, IsInt, IsNumber, IsOptional, Min, ValidateNested } from 'class-validator';

export class CategoriaPrecioDto {
  @IsInt()
  id_categoria: number;

  @IsOptional() @IsNumber() @Min(0)
  precio_estimado?: number;
}

export class AsignarCategoriasDto {
  @IsArray() @ArrayMinSize(1)
  @ValidateNested({ each: true })
  @Type(() => CategoriaPrecioDto)
  categorias: CategoriaPrecioDto[];
}
