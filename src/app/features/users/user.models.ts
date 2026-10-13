import { Role } from '../../core/auth/auth.models';

export type UserStatus = 'ACTIVE' | 'INACTIVE';
export type SortDirection = 'asc' | 'desc';

export interface UserSummary {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  city: string | null;
  state: string | null;
}

export interface Address {
  id: number;
  cep: string;
  street: string;
  number: string;
  complement: string | null;
  state: string;
  city: string;
  district: string | null;
  mainAddress: boolean;
}

export interface UserDetail {
  id: number;
  name: string;
  email: string;
  phone: string | null;
  role: Role;
  status: UserStatus;
  createdAt: string;
  updatedAt: string;
  createdBy: string | null;
  updatedBy: string | null;
  addresses: Address[];
}

export interface AddressRequest {
  id?: number | null;
  cep: string;
  street: string;
  number: string;
  complement?: string | null;
  state: string;
  city: string;
  district?: string | null;
  mainAddress: boolean;
}

export interface UserCreateRequest {
  name: string;
  email: string;
  phone?: string | null;
  password: string;
  role: Role;
  addresses: AddressRequest[];
}

export interface UserUpdateRequest {
  name: string;
  phone?: string | null;
  password?: string | null;
  role?: Role;
  status?: UserStatus;
  addresses: AddressRequest[];
}

export interface UserQuery {
  search: string;
  city: string;
  status: UserStatus | null;
  role: Role | null;
  page: number;
  size: number;
  sort: string;
  direction: SortDirection;
}