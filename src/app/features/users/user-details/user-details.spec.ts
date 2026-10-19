import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { Subject, of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { UserDetail } from '../user.models';
import { UserService } from '../user.service';
import { UserDetails } from './user-details';

const ana: UserDetail = {
  id: 7,
  name: 'Ana Souza',
  email: 'ana@teste.com',
  phone: null,
  role: 'USER',
  status: 'ACTIVE',
  createdAt: '2026-10-01T10:00:00',
  updatedAt: '2026-10-02T15:30:00',
  createdBy: 'system',
  updatedBy: null,
  addresses: [
    {
      id: 1,
      cep: '01001000',
      street: 'Praça da Sé',
      number: '100',
      complement: 'Apto 5',
      state: 'SP',
      city: 'São Paulo',
      district: 'Sé',
      mainAddress: true,
    },
    {
      id: 2,
      cep: '20040020',
      street: 'Rua da Assembleia',
      number: '10',
      complement: null,
      state: 'RJ',
      city: 'Rio de Janeiro',
      district: null,
      mainAddress: false,
    },
  ],
};

describe('UserDetails', () => {
  const userService = { findById: vi.fn() };
  const snackBar = { open: vi.fn() };
  let fixture: ComponentFixture<UserDetails>;
  let html: HTMLElement;

  beforeEach(() => {
    vi.resetAllMocks();
    userService.findById.mockReturnValue(of(ana));
  });

  function setup(admin = true) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: '7' }) } } },
        { provide: AuthService, useValue: { isAdmin: () => admin } },
        { provide: UserService, useValue: userService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    fixture = TestBed.createComponent(UserDetails);
    html = fixture.nativeElement;
    fixture.detectChanges();
  }

  const links = () => Array.from(html.querySelectorAll('a')).map((a) => a.textContent?.trim());

  it('busca o usuário da rota assim que abre', () => {
    setup();

    expect(userService.findById).toHaveBeenCalledWith(7);
  });

  it('mostra os dados do usuário com perfil e situação em português', () => {
    setup();

    const text = html.textContent!;
    expect(text).toContain('Ana Souza');
    expect(text).toContain('ana@teste.com');
    expect(text).toContain('Usuário');
    expect(text).toContain('Ativo');
    expect(text).toContain('01/10/2026 10:00');
  });

  it('mostra traço quando não há telefone', () => {
    setup();

    expect(html.textContent).toContain('—');
  });

  it('mostra os endereços e destaca o principal', () => {
    setup();

    const cards = html.querySelectorAll('.address');
    expect(cards.length).toBe(2);
    expect(cards[0].textContent).toContain('Principal');
    expect(cards[0].textContent).toContain('Praça da Sé, 100 - Apto 5');
    expect(cards[0].textContent).toContain('Sé · São Paulo - SP');
    expect(cards[1].textContent).not.toContain('Principal');
    expect(cards[1].textContent).toContain('Rio de Janeiro - RJ');
  });

  it('avisa quando o usuário não tem endereço', () => {
    userService.findById.mockReturnValue(of({ ...ana, addresses: [] }));
    setup();

    expect(html.textContent).toContain('Nenhum endereço cadastrado.');
  });

  it('mostra a barra de carregamento enquanto espera a API', () => {
    userService.findById.mockReturnValue(new Subject());
    setup();

    expect(html.querySelector('mat-progress-bar')).not.toBeNull();
  });

  it('avisa com a mensagem da API e não mostra dados quando o carregamento falha', () => {
    userService.findById.mockReturnValue(throwError(() => ({ status: 404, error: { detail: 'Usuário não encontrado.' } })));
    setup();

    expect(snackBar.open).toHaveBeenCalledWith('Usuário não encontrado.', 'OK', { duration: 6000 });
    expect(html.querySelector('.card')).toBeNull();
    expect(html.querySelector('mat-progress-bar')).toBeNull();
  });

  it('ADMIN vê Voltar e Editar', () => {
    setup(true);

    expect(links()).toEqual(['Voltar', 'Editar']);
  });

  it('USER vê só Editar, já que não tem listagem para voltar', () => {
    setup(false);

    expect(links()).toEqual(['Editar']);
  });

  it('o botão Editar leva para a edição do mesmo usuário', () => {
    setup();

    const editar = Array.from(html.querySelectorAll('a')).find((a) => a.textContent?.includes('Editar'))!;
    expect(editar.getAttribute('href')).toBe('/users/7');
  });
});
