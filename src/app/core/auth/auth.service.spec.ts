import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { API_URL } from '../config/api.config';
import { Role, Session } from './auth.models';
import { AuthService } from './auth.service';

const STORAGE_KEY = 'um.session';

/** Monta um JWT de mentira: só o payload importa, a assinatura não é conferida no front. */
function fakeToken(claims: { userId: number; sub: string; role: Role; exp: number }): string {
  const encode = (value: object) => btoa(JSON.stringify(value));
  return `${encode({ alg: 'HS256' })}.${encode(claims)}.assinatura`;
}

const inOneHour = () => Math.floor(Date.now() / 1000) + 3600;

describe('AuthService', () => {
  beforeEach(() => {
    sessionStorage.clear();
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
  });

  afterEach(() => sessionStorage.clear());

  function loginAs(role: Role) {
    const auth = TestBed.inject(AuthService);
    const http = TestBed.inject(HttpTestingController);
    const token = fakeToken({ userId: 7, sub: 'ana@teste.com', role, exp: inOneHour() });

    auth.login({ email: 'ana@teste.com', password: 'Senha@123' }).subscribe();
    http.expectOne(`${API_URL}/auth/login`).flush({ accessToken: token, tokenType: 'Bearer', expiresIn: 3600 });

    return { auth, token };
  }

  it('guarda a sessão com os dados do token depois do login', () => {
    const { auth, token } = loginAs('USER');

    expect(auth.session()).toMatchObject({ token, userId: 7, email: 'ana@teste.com', role: 'USER' });
    expect(auth.isAuthenticated()).toBe(true);
    expect(auth.token()).toBe(token);
  });

  it('persiste a sessão no sessionStorage', () => {
    loginAs('USER');

    const saved: Session = JSON.parse(sessionStorage.getItem(STORAGE_KEY)!);
    expect(saved.email).toBe('ana@teste.com');
  });

  it('isAdmin é verdadeiro só para o perfil ADMIN', () => {
    expect(loginAs('ADMIN').auth.isAdmin()).toBe(true);
  });

  it('isAdmin é falso para o perfil USER', () => {
    expect(loginAs('USER').auth.isAdmin()).toBe(false);
  });

  it('logout limpa a sessão e volta para o login', () => {
    const { auth } = loginAs('ADMIN');
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);

    auth.logout();

    expect(auth.session()).toBeNull();
    expect(auth.token()).toBeNull();
    expect(sessionStorage.getItem(STORAGE_KEY)).toBeNull();
    expect(navigate).toHaveBeenCalledWith('/login');
  });

  it('token() devolve null quando a sessão já expirou', () => {
    const { auth } = loginAs('USER');
    vi.useFakeTimers();
    vi.setSystemTime(Date.now() + 2 * 3600 * 1000); // duas horas depois

    expect(auth.isAuthenticated()).toBe(false);
    expect(auth.token()).toBeNull();

    vi.useRealTimers();
  });

  describe('restauração da sessão ao abrir o app', () => {
    function restoreWith(raw: string) {
      sessionStorage.setItem(STORAGE_KEY, raw);
      TestBed.resetTestingModule();
      TestBed.configureTestingModule({
        providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
      });
      return TestBed.inject(AuthService);
    }

    const session = (expiresAt: number): Session => ({
      token: 't',
      userId: 1,
      email: 'admin@local.dev',
      role: 'ADMIN',
      expiresAt,
    });

    it('recupera uma sessão válida guardada', () => {
      const auth = restoreWith(JSON.stringify(session(Date.now() + 60_000)));

      expect(auth.session()?.email).toBe('admin@local.dev');
      expect(auth.isAdmin()).toBe(true);
    });

    it('ignora uma sessão guardada que já expirou', () => {
      const auth = restoreWith(JSON.stringify(session(Date.now() - 1000)));

      expect(auth.session()).toBeNull();
    });

    it('ignora um conteúdo corrompido, sem quebrar o app', () => {
      const auth = restoreWith('isto não é json');

      expect(auth.session()).toBeNull();
    });
  });
});
