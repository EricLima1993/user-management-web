export type Role = 'ADMIN' | 'USER';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  accessToken: string;
  tokenType: string;
  expiresIn: number;
}

export interface Session {
  token: string;
  userId: number;
  email: string;
  role: Role;
  expiresAt: number; // epoch em ms
}