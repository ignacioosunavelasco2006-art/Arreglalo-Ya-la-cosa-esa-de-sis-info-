export interface JwtPayload {
  sub: number;
  correo: string;
  roles: string[];
}