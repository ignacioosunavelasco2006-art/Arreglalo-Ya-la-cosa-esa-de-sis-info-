export class ResolverReclamoDto {
  id_supervisor: number;
  estado: string; // 'resuelto' | 'improcedente'
  resolucion: string; // desestimar, devolver dinero, sancionar o suspender
}