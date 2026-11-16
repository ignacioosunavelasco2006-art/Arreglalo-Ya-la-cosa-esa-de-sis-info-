export class CategoriaPrecioDto {
  id_categoria: number;
  precio_estimado?: number;
}

export class AsignarCategoriasDto {
  categorias: CategoriaPrecioDto[];
}