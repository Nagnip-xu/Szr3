export interface JwtPayload {
  sub: string;
  email: string;
  organizationId: string;
  role: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  organizationId: string;
}
