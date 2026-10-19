import { TestBed } from '@angular/core/testing';
import {
  ActivatedRouteSnapshot,
  CanActivateFn,
  convertToParamMap,
  provideRouter,
  Router,
  RouterStateSnapshot,
  UrlTree,
} from '@angular/router';
import { Role } from './auth.models';
import { adminGuard, authGuard, selfOrAdminGuard } from './auth.guard';
import { AuthService } from './auth.service';

/** Estado do "usuário logado" que o AuthService de mentira devolve. */
interface FakeState {
  authenticated: boolean;
  session: { userId: number; role: Role } | null;
}

describe('guards de rota', () => {
  let state: FakeState;

  beforeEach(() => {
    state = { authenticated: false, session: null };

    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: AuthService,
          useValue: {
            isAuthenticated: () => state.authenticated,
            isAdmin: () => state.session?.role === 'ADMIN',
            session: () => state.session,
          },
        },
      ],
    });
  });

  const loginAs = (role: Role, userId = 7) => {
    state = { authenticated: true, session: { userId, role } };
  };

  /** Executa o guard como o Angular faria e devolve true ou o caminho do redirecionamento. */
  function run(guard: CanActivateFn, params: Record<string, string> = {}): boolean | string {
    const route = { paramMap: convertToParamMap(params) } as ActivatedRouteSnapshot;
    const result = TestBed.runInInjectionContext(() => guard(route, {} as RouterStateSnapshot));

    return result instanceof UrlTree ? TestBed.inject(Router).serializeUrl(result) : (result as boolean);
  }

  describe('authGuard', () => {
    it('libera quem tem sessão válida', () => {
      loginAs('USER');

      expect(run(authGuard)).toBe(true);
    });

    it('manda para o login quem não está autenticado', () => {
      expect(run(authGuard)).toBe('/login');
    });
  });

  describe('adminGuard', () => {
    it('libera o ADMIN', () => {
      loginAs('ADMIN');

      expect(run(adminGuard)).toBe(true);
    });

    it('leva o USER para o próprio perfil', () => {
      loginAs('USER', 7);

      expect(run(adminGuard)).toBe('/users/7/details');
    });

    it('manda para o login quando não há sessão', () => {
      expect(run(adminGuard)).toBe('/login');
    });
  });

  describe('selfOrAdminGuard', () => {
    it('libera o ADMIN em qualquer perfil', () => {
      loginAs('ADMIN', 1);

      expect(run(selfOrAdminGuard, { id: '99' })).toBe(true);
    });

    it('libera o USER no próprio perfil', () => {
      loginAs('USER', 7);

      expect(run(selfOrAdminGuard, { id: '7' })).toBe(true);
    });

    it('devolve o USER ao próprio perfil quando tenta abrir o de outra pessoa', () => {
      loginAs('USER', 7);

      expect(run(selfOrAdminGuard, { id: '8' })).toBe('/users/7/details');
    });

    it('manda para o login quando não há sessão', () => {
      expect(run(selfOrAdminGuard, { id: '7' })).toBe('/login');
    });
  });
});