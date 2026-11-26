import { UsuarioLista } from './modelos';

// Las listas del backend traen solo ids. Con la lista de usuarios se muestran los nombres.
export function mapaNombres(usuarios: UsuarioLista[]): Map<number, string> {
  return new Map(usuarios.map((u) => [u.id_usuario, `${u.nombres} ${u.apellidos}`]));
}
