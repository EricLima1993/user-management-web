import { HttpClient } from '@angular/common/http';
import { computed, inject, Injectable, signal } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { API_URL } from '../config/api.config';
import { LoginRequest, LoginResponse, Session } from './auth.models';

const STORAGE_KEY = 'um.session';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly _session = signal<Session | null>(this.restore());

  readonly session = this._session.asReadonly();
  readonly isAdmin = computed(() => this._session()?.role === 'ADMIN');

  login(credentials: LoginRequest) {
    return this.http
      .post<LoginResponse>(`${API_URL}/auth/login`, credentials)
      .pipe(tap((response) => this.startSession(response.accessToken)));
  }

  logout(): void {
    sessionStorage.removeItem(STORAGE_KEY);
    this._session.set(null);
    this.router.navigateByUrl('/login');
  }

  token(): string | null {
    return this.isAuthenticated() ? this._session()!.token : null;
  }

  isAuthenticated(): boolean {
    const session = this._session();
    return !!session && session.expiresAt > Date.now();
  }

  private startSession(token: string): void {
    const claims = this.decode(token);
    const session: Session = {
      token,
      userId: claims['userId'],
      email: claims['sub'],
      role: claims['role'],
      expiresAt: claims['exp'] * 1000,
    };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    this._session.set(session);
  }

  private restore(): Session | null {
    try {
      const raw = sessionStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      const session: Session = JSON.parse(raw);
      return session.expiresAt > Date.now() ? session : null;
    } catch {
      return null;
    }
  }

  private decode(token: string): Record<string, any> {
    const payload = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(atob(payload));
  }
}