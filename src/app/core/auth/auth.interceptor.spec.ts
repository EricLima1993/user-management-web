import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../config/api.config';
import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let controller: HttpTestingController;
  let currentToken: string | null;
  const logout = vi.fn();

  beforeEach(() => {
    currentToken = 'token-de-teste';
    logout.mockClear();

    TestBed.configureTestingModule({
      providers: [
        // AuthService de mentira: o interceptor só precisa de token() e logout()
        { provide: AuthService, useValue: { token: () => currentToken, logout } },
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    http = TestBed.inject(HttpClient);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('cabeçalho Authorization', () => {
    it('anexa o Bearer nas chamadas para a nossa API', () => {
      http.get(`${API_URL}/users`).subscribe();

      const req = controller.expectOne(`${API_URL}/users`);
      expect(req.request.headers.get('Authorization')).toBe('Bearer token-de-teste');
      req.flush([]);
    });

    it('não envia o token para outros endereços, como o ViaCEP', () => {
      http.get('https://viacep.com.br/ws/01001000/json/').subscribe();

      const req = controller.expectOne('https://viacep.com.br/ws/01001000/json/');
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush({});
    });

    it('não anexa nada quando não há sessão válida', () => {
      currentToken = null;
      http.get(`${API_URL}/users`).subscribe();

      const req = controller.expectOne(`${API_URL}/users`);
      expect(req.request.headers.has('Authorization')).toBe(false);
      req.flush([]);
    });
  });

  describe('respostas de erro', () => {
    it('encerra a sessão quando a API responde 401', () => {
      http.get(`${API_URL}/users`).subscribe({ error: () => undefined });

      controller.expectOne(`${API_URL}/users`).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(logout).toHaveBeenCalledOnce();
    });

    it('não encerra a sessão quando o 401 vem do próprio login (senha errada)', () => {
      http.post(`${API_URL}/auth/login`, {}).subscribe({ error: () => undefined });

      controller.expectOne(`${API_URL}/auth/login`).flush(null, { status: 401, statusText: 'Unauthorized' });

      expect(logout).not.toHaveBeenCalled();
    });

    it('não encerra a sessão em outros erros, como 403 e 500', () => {
      http.get(`${API_URL}/users`).subscribe({ error: () => undefined });
      controller.expectOne(`${API_URL}/users`).flush(null, { status: 403, statusText: 'Forbidden' });

      http.get(`${API_URL}/users`).subscribe({ error: () => undefined });
      controller.expectOne(`${API_URL}/users`).flush(null, { status: 500, statusText: 'Server Error' });

      expect(logout).not.toHaveBeenCalled();
    });

    it('repassa o erro original para quem chamou', () => {
      let status: number | undefined;
      http.get(`${API_URL}/users`).subscribe({ error: (e) => (status = e.status) });

      controller.expectOne(`${API_URL}/users`).flush(null, { status: 403, statusText: 'Forbidden' });

      expect(status).toBe(403);
    });
  });
});
