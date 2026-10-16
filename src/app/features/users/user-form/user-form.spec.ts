import { TestBed } from '@angular/core/testing';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { CepService } from '../../../core/cep/cep.service';
import { UserDetail } from '../user.models';
import { UserService } from '../user.service';
import { UserForm } from './user-form';

const validAddress = {
  cep: '01001000',
  street: 'Praça da Sé',
  number: '100',
  district: 'Sé',
  city: 'São Paulo',
  state: 'SP',
};

const savedUser: UserDetail = {
  id: 7,
  name: 'Ana Souza',
  email: 'ana@teste.com',
  phone: null,
  role: 'USER',
  status: 'ACTIVE',
  createdAt: '2026-10-01T10:00:00',
  updatedAt: '2026-10-01T10:00:00',
  createdBy: 'system',
  updatedBy: null,
  addresses: [
    {
      id: 1,
      cep: '01001000',
      street: 'Praça da Sé',
      number: '100',
      complement: null,
      state: 'SP',
      city: 'São Paulo',
      district: null,
      mainAddress: true,
    },
  ],
};

describe('UserForm', () => {
  const userService = { create: vi.fn(), update: vi.fn(), findById: vi.fn() };
  const cepService = { lookup: vi.fn() };
  const snackBar = { open: vi.fn() };

  beforeEach(() => {
    vi.resetAllMocks();
    userService.create.mockReturnValue(of(savedUser));
    userService.update.mockReturnValue(of(savedUser));
    userService.findById.mockReturnValue(of(savedUser));
  });

  /** Monta o formulário como o Angular faria: `id` define a edição, `admin` define quem está logado. */
  function setup({ id, admin = true }: { id?: string; admin?: boolean } = {}) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap(id ? { id } : {}) } },
        },
        { provide: AuthService, useValue: { isAdmin: () => admin } },
        { provide: UserService, useValue: userService },
        { provide: CepService, useValue: cepService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });

    // O espião precisa existir ANTES de criar o componente: na edição, o load() roda no construtor.
    const navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    const fixture = TestBed.createComponent(UserForm);
    return { fixture, component: fixture.componentInstance, navigate };
  }

  /** Preenche tudo o que é obrigatório no cadastro. */
  function fillValid(component: UserForm) {
    component.form.patchValue({ name: 'Ana Souza', email: 'ana@teste.com', password: 'Senha@123' });
    component.addresses.at(0).patchValue(validAddress);
  }

  describe('cadastro', () => {
    it('começa inválido, com um endereço já marcado como principal', () => {
      const { component } = setup();

      expect(component.isEdit).toBe(false);
      expect(component.form.invalid).toBe(true);
      expect(component.addresses.length).toBe(1);
      expect(component.addresses.at(0).controls.mainAddress.value).toBe(true);
    });

    it('exige senha de pelo menos 8 caracteres', () => {
      const { component } = setup();
      const password = component.form.controls.password;

      password.setValue('curta');
      expect(password.hasError('minlength')).toBe(true);

      password.setValue('Senha@123');
      expect(password.valid).toBe(true);
    });

    it('aceita endereço sem bairro, como a API', () => {
      const { component } = setup();
      fillValid(component);
      component.addresses.at(0).patchValue({ district: '' });

      expect(component.form.valid).toBe(true);
    });

    it('rejeita CEP que não tem 8 dígitos e UF em minúsculas', () => {
      const { component } = setup();
      const address = component.addresses.at(0);

      address.patchValue({ cep: '123', state: 'sp' });

      expect(address.controls.cep.hasError('pattern')).toBe(true);
      expect(address.controls.state.hasError('pattern')).toBe(true);
    });

    describe('endereços', () => {
      it('adiciona um endereço novo, que não nasce como principal', () => {
        const { component } = setup();

        component.addAddress();

        expect(component.addresses.length).toBe(2);
        expect(component.addresses.at(1).controls.mainAddress.value).toBe(false);
      });

      it('mantém só um endereço principal por vez', () => {
        const { component } = setup();
        component.addAddress();

        component.setMain(1);

        expect(component.addresses.controls.map((a) => a.controls.mainAddress.value)).toEqual([false, true]);
      });

      it('passa o principal para o primeiro quando o principal é removido', () => {
        const { component } = setup();
        component.addAddress();
        component.setMain(1);

        component.removeAddress(1);

        expect(component.addresses.length).toBe(1);
        expect(component.addresses.at(0).controls.mainAddress.value).toBe(true);
      });

      it('nunca remove o último endereço', () => {
        const { component } = setup();

        component.removeAddress(0);

        expect(component.addresses.length).toBe(1);
      });
    });

    describe('consulta de CEP', () => {
      it('preenche rua, bairro, cidade e UF quando o CEP existe', () => {
        const { component } = setup();
        cepService.lookup.mockReturnValue(
          of({ street: 'Praça da Sé', district: 'Sé', city: 'São Paulo', state: 'SP' }),
        );
        component.addresses.at(0).patchValue({ cep: '01001000' });

        component.lookupCep(0);

        expect(cepService.lookup).toHaveBeenCalledWith('01001000');
        expect(component.addresses.at(0).value).toMatchObject({
          street: 'Praça da Sé',
          district: 'Sé',
          city: 'São Paulo',
          state: 'SP',
        });
      });

      it('marca o CEP como não encontrado quando ele não existe', () => {
        const { component } = setup();
        cepService.lookup.mockReturnValue(of(null));
        component.addresses.at(0).patchValue({ cep: '99999999' });

        component.lookupCep(0);

        expect(component.addresses.at(0).controls.cep.hasError('notFound')).toBe(true);
      });

      it('nem consulta quando o CEP ainda não tem 8 dígitos', () => {
        const { component } = setup();
        component.addresses.at(0).patchValue({ cep: '0100' });

        component.lookupCep(0);

        expect(cepService.lookup).not.toHaveBeenCalled();
      });

      it('deixa o usuário digitar à mão quando o ViaCEP está fora do ar', () => {
        const { component } = setup();
        cepService.lookup.mockReturnValue(throwError(() => new Error('fora do ar')));
        component.addresses.at(0).patchValue({ cep: '01001000' });

        component.lookupCep(0);

        expect(component.addresses.at(0).controls.cep.hasError('notFound')).toBe(false);
      });
    });

    describe('salvar', () => {
      it('não envia nada quando o formulário está inválido', () => {
        const { component } = setup();

        component.save();

        expect(userService.create).not.toHaveBeenCalled();
        expect(component.saving()).toBe(false);
      });

      it('cria o usuário, avisa e volta para a listagem (ADMIN)', () => {
        const { component, navigate } = setup();
        fillValid(component);

        component.save();

        expect(userService.create).toHaveBeenCalledOnce();
        const body = userService.create.mock.calls[0][0];
        expect(body).toMatchObject({ name: 'Ana Souza', email: 'ana@teste.com', role: 'USER' });
        expect(body.phone).toBeUndefined(); // telefone vazio não vai como texto vazio
        expect(snackBar.open).toHaveBeenCalledWith('Usuário criado com sucesso.', 'OK', { duration: 3000 });
        expect(navigate).toHaveBeenCalledWith(['/users']);
      });

      it('mostra a mensagem da API e libera o botão quando o cadastro falha', () => {
        const { component, navigate } = setup();
        fillValid(component);
        userService.create.mockReturnValue(
          throwError(() => ({ status: 409, error: { detail: 'E-mail já cadastrado.' } })),
        );

        component.save();

        expect(snackBar.open).toHaveBeenCalledWith('E-mail já cadastrado.', 'OK', { duration: 6000 });
        expect(component.saving()).toBe(false);
        expect(navigate).not.toHaveBeenCalled();
      });
    });
  });

  describe('edição', () => {
    it('carrega o usuário na ficha e bloqueia o e-mail', () => {
      const { component } = setup({ id: '7' });

      expect(userService.findById).toHaveBeenCalledWith(7);
      expect(component.isEdit).toBe(true);
      expect(component.form.controls.name.value).toBe('Ana Souza');
      expect(component.form.controls.email.disabled).toBe(true);
      expect(component.addresses.at(0).controls.cep.value).toBe('01001000');
      expect(component.loading()).toBe(false);
    });

    it('torna a senha opcional', () => {
      const { component } = setup({ id: '7' });

      expect(component.form.controls.password.value).toBe('');
      expect(component.form.valid).toBe(true);
    });

    it('ADMIN envia perfil e situação junto com os dados', () => {
      const { component, navigate } = setup({ id: '7', admin: true });

      component.save();

      expect(userService.update).toHaveBeenCalledOnce();
      const [id, body] = userService.update.mock.calls[0];
      expect(id).toBe(7);
      expect(body).toMatchObject({ name: 'Ana Souza', role: 'USER', status: 'ACTIVE' });
      expect(body.password).toBeUndefined(); // senha em branco mantém a atual
      expect(navigate).toHaveBeenCalledWith(['/users']);
    });

    it('USER não envia perfil nem situação e continua na tela', () => {
      const { component, navigate } = setup({ id: '7', admin: false });

      component.save();

      const body = userService.update.mock.calls[0][1];
      expect('role' in body).toBe(false);
      expect('status' in body).toBe(false);
      expect(navigate).not.toHaveBeenCalled();
    });

    it('mostra o erro e volta à listagem quando o usuário não carrega (ADMIN)', () => {
      userService.findById.mockReturnValue(
        throwError(() => ({ status: 404, error: { detail: 'Usuário não encontrado.' } })),
      );

      const { component, navigate } = setup({ id: '999', admin: true });

      expect(snackBar.open).toHaveBeenCalledWith('Usuário não encontrado.', 'OK', { duration: 6000 });
      expect(component.loading()).toBe(false);
      expect(navigate).toHaveBeenCalledWith(['/users']);
    });

    it('não redireciona o USER quando o carregamento falha, para não criar um ciclo', () => {
      userService.findById.mockReturnValue(throwError(() => ({ status: 403, error: {} })));

      const { navigate } = setup({ id: '7', admin: false });

      expect(navigate).not.toHaveBeenCalled();
    });
  });

  describe('tela', () => {
    it('mostra o título e o campo Perfil para o ADMIN no cadastro', async () => {
      const { fixture } = setup();
      fixture.detectChanges();
      await fixture.whenStable();

      const html: HTMLElement = fixture.nativeElement;
      expect(html.querySelector('h2')?.textContent).toContain('Novo usuário');
      expect(html.textContent).toContain('Perfil');
    });

    it('esconde Perfil e Situação para o USER na edição', async () => {
      const { fixture } = setup({ id: '7', admin: false });
      fixture.detectChanges();
      await fixture.whenStable();

      const html: HTMLElement = fixture.nativeElement;
      expect(html.querySelector('h2')?.textContent).toContain('Editar usuário');
      expect(html.textContent).not.toContain('Perfil');
      expect(html.textContent).not.toContain('Situação');
    });
  });
});
