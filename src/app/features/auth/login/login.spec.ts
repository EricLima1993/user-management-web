import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { Subject, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { Login } from './login';

describe('Login', () => {
  const login = vi.fn();
  let fixture: ComponentFixture<Login>;
  let html: HTMLElement;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    login.mockReset();

    TestBed.configureTestingModule({
      providers: [provideRouter([]), { provide: AuthService, useValue: { login } }],
    });

    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(Login);
    html = fixture.nativeElement;
    fixture.detectChanges();
    await fixture.whenStable();
  });

  /** Age como o usuário: digita nos campos e clica em Entrar. */
  async function fillAndSubmit(email: string, password: string) {
    const setValue = (selector: string, value: string) => {
      const input = html.querySelector<HTMLInputElement>(selector)!;
      input.value = value;
      input.dispatchEvent(new Event('input'));
    };
    setValue('input[type="email"]', email);
    setValue('input[type="password"]', password);

    html.querySelector<HTMLButtonElement>('button[type="submit"]')!.click();
    fixture.detectChanges();
    await fixture.whenStable();
  }

  const button = () => html.querySelector<HTMLButtonElement>('button[type="submit"]')!;
  const alert = () => html.querySelector('[role="alert"]')?.textContent?.trim();

  it('não chama a API quando o formulário está vazio', async () => {
    await fillAndSubmit('', '');

    expect(login).not.toHaveBeenCalled();
    expect(html.textContent).toContain('Informe o e-mail.');
  });

  it('rejeita e-mail em formato inválido', async () => {
    await fillAndSubmit('isso-nao-e-email', 'Senha@123');

    expect(login).not.toHaveBeenCalled();
    expect(html.textContent).toContain('E-mail inválido.');
  });

  it('entra e vai para a listagem quando as credenciais estão certas', async () => {
    const response = new Subject<void>();
    login.mockReturnValue(response);

    await fillAndSubmit('admin@local.dev', 'Admin@123');

    expect(login).toHaveBeenCalledWith({ email: 'admin@local.dev', password: 'Admin@123' });
    // enquanto espera a API, o botão fica travado para evitar clique duplo
    expect(button().disabled).toBe(true);
    expect(button().textContent).toContain('Entrando...');

    response.next();
    expect(navigateByUrl).toHaveBeenCalledWith('/users');
  });

  it('mostra "E-mail ou senha inválidos." quando a API responde 401', async () => {
    login.mockReturnValue(throwError(() => ({ status: 401 })));

    await fillAndSubmit('admin@local.dev', 'errada');

    expect(alert()).toBe('E-mail ou senha inválidos.');
    expect(button().disabled).toBe(false);
    expect(navigateByUrl).not.toHaveBeenCalled();
  });

  it('avisa que o servidor está indisponível quando não há resposta (status 0)', async () => {
    login.mockReturnValue(throwError(() => ({ status: 0 })));

    await fillAndSubmit('admin@local.dev', 'Admin@123');

    expect(alert()).toBe('Servidor indisponível. Tente novamente em instantes.');
  });

  it('mostra o detalhe enviado pela API em outros erros', async () => {
    login.mockReturnValue(throwError(() => ({ status: 500, error: { detail: 'Falha interna.' } })));

    await fillAndSubmit('admin@local.dev', 'Admin@123');

    expect(alert()).toBe('Falha interna.');
  });

  it('usa uma mensagem padrão quando o erro não traz detalhe', async () => {
    login.mockReturnValue(throwError(() => ({ status: 500 })));

    await fillAndSubmit('admin@local.dev', 'Admin@123');

    expect(alert()).toBe('Não foi possível entrar. Tente novamente.');
  });
});
