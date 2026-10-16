import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MatDialog } from '@angular/material/dialog';
import { PageEvent } from '@angular/material/paginator';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Sort } from '@angular/material/sort';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthService } from '../../../core/auth/auth.service';
import { PageResponse } from '../../../core/models/page.model';
import { UserSummary } from '../user.models';
import { UserService } from '../user.service';
import { UserList } from './user-list';

const ana: UserSummary = {
  id: 1,
  name: 'Ana Souza',
  email: 'ana@teste.com',
  phone: null,
  role: 'ADMIN',
  status: 'ACTIVE',
  city: 'São Paulo',
  state: 'SP',
};

const bruno: UserSummary = {
  id: 2,
  name: 'Bruno Lima',
  email: 'bruno@teste.com',
  phone: '11999990000',
  role: 'USER',
  status: 'INACTIVE',
  city: null,
  state: null,
};

function pageOf(content: UserSummary[], page = 0): PageResponse<UserSummary> {
  return { content, page, size: 10, totalElements: content.length, totalPages: 1, first: page === 0, last: true };
}

/** Os membros da tela são `protected`; este tipo dá ao teste acesso a eles, como se fosse o template. */
interface Internals {
  filters: { patchValue(value: object): void };
  onPage(event: Partial<PageEvent>): void;
  onSort(sort: Sort): void;
  clearFilters(): void;
  remove(user: UserSummary): void;
}

describe('UserList', () => {
  const userService = { list: vi.fn(), delete: vi.fn() };
  const dialog = { open: vi.fn() };
  const snackBar = { open: vi.fn() };
  let fixture: ComponentFixture<UserList>;
  let html: HTMLElement;

  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetAllMocks();
    userService.list.mockReturnValue(of(pageOf([ana, bruno])));
    userService.delete.mockReturnValue(of(undefined));
    dialog.open.mockReturnValue({ afterClosed: () => of(true) });
  });

  afterEach(() => vi.useRealTimers());

  /** Monta a tela com o usuário `loggedUserId` logado e deixa a primeira busca acontecer. */
  function setup(loggedUserId = 1) {
    TestBed.configureTestingModule({
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: { session: () => ({ userId: loggedUserId }) } },
        { provide: UserService, useValue: userService },
        { provide: MatSnackBar, useValue: snackBar },
      ],
    });
    // o MatDialog é usado pelo componente, então precisa ser trocado no próprio componente
    TestBed.overrideComponent(UserList, {
      add: { providers: [{ provide: MatDialog, useValue: dialog }] },
    });

    fixture = TestBed.createComponent(UserList);
    html = fixture.nativeElement;
    flush();
  }

  /** Deixa os efeitos do Angular rodarem e atualiza a tela. */
  function flush() {
    fixture.detectChanges();
    TestBed.tick();
    fixture.detectChanges();
  }

  const internals = () => fixture.componentInstance as unknown as Internals;
  const lastQuery = () => userService.list.mock.calls.at(-1)![0];
  // a linha "Nenhum usuário encontrado" também tem a classe mat-mdc-row, por isso é excluída aqui
  const rows = () => Array.from(html.querySelectorAll('tr.mat-mdc-row:not(.mat-mdc-no-data-row)'));
  const deleteButtons = () =>
    Array.from(html.querySelectorAll<HTMLButtonElement>('td button')).filter((b) => b.textContent?.includes('Excluir'));

  describe('listagem', () => {
    it('busca a primeira página ordenada por nome assim que abre', () => {
      setup();

      expect(userService.list).toHaveBeenCalledOnce();
      expect(lastQuery()).toMatchObject({ page: 0, size: 10, sort: 'name', direction: 'asc', search: '', city: '' });
    });

    it('mostra uma linha por usuário, com perfil e status em português', () => {
      setup();

      expect(rows().length).toBe(2);
      expect(rows()[0].textContent).toContain('Ana Souza');
      expect(rows()[0].textContent).toContain('São Paulo - SP');
      expect(rows()[0].textContent).toContain('Administrador');
      expect(rows()[0].textContent).toContain('Ativo');
      expect(rows()[1].textContent).toContain('Usuário');
      expect(rows()[1].textContent).toContain('Inativo');
    });

    it('mostra traço quando o usuário não tem telefone nem cidade', () => {
      setup();

      const bruno = rows()[1].textContent!;
      expect(bruno).toContain('11999990000');
      expect(bruno).toContain('—'); // cidade vazia
      expect(rows()[0].textContent).toContain('—'); // telefone vazio
    });

    it('avisa quando não há nenhum usuário', () => {
      userService.list.mockReturnValue(of(pageOf([])));
      setup();

      expect(rows().length).toBe(0);
      expect(html.textContent).toContain('Nenhum usuário encontrado.');
    });

    it('não deixa o usuário excluir a si mesmo', () => {
      setup(1);

      const [excluirAna, excluirBruno] = deleteButtons();
      expect(excluirAna.disabled).toBe(true);
      expect(excluirBruno.disabled).toBe(false);
    });
  });

  describe('erros ao carregar', () => {
    it.each([
      [0, {}, 'Servidor indisponível. Tente novamente em instantes.'],
      [403, {}, 'Você não tem permissão para esta ação.'],
      [500, { detail: 'Falha interna.' }, 'Falha interna.'],
      [500, undefined, 'Não foi possível concluir a operação.'],
    ])('status %s mostra a mensagem certa', (status, body, message) => {
      userService.list.mockReturnValue(throwError(() => ({ status, error: body })));
      setup();

      expect(html.querySelector('[role="alert"]')?.textContent?.trim()).toBe(message);
      expect(rows().length).toBe(0);
    });
  });

  describe('filtros, página e ordenação', () => {
    it('espera o usuário parar de digitar (300 ms) e busca de novo, sem espaços e na página 0', () => {
      setup();
      userService.list.mockClear();

      internals().filters.patchValue({ search: '  ana  ', city: ' Recife ', status: 'ACTIVE', role: 'ADMIN' });
      vi.advanceTimersByTime(200);
      flush();
      expect(userService.list).not.toHaveBeenCalled(); // ainda dentro do debounce

      vi.advanceTimersByTime(150);
      flush();
      expect(userService.list).toHaveBeenCalledOnce();
      expect(lastQuery()).toMatchObject({
        search: 'ana',
        city: 'Recife',
        status: 'ACTIVE',
        role: 'ADMIN',
        page: 0,
      });
    });

    it('volta à página 0 quando um filtro muda', () => {
      setup();
      internals().onPage({ pageIndex: 3, pageSize: 10 });
      flush();
      expect(lastQuery().page).toBe(3);

      internals().filters.patchValue({ search: 'bruno' });
      vi.advanceTimersByTime(350);
      flush();

      expect(lastQuery().page).toBe(0);
    });

    it('"Limpar" zera os filtros e busca tudo de novo', () => {
      setup();
      internals().filters.patchValue({ search: 'ana', status: 'ACTIVE' });
      vi.advanceTimersByTime(350);
      flush();

      internals().clearFilters();
      vi.advanceTimersByTime(350);
      flush();

      expect(lastQuery()).toMatchObject({ search: '', city: '', status: null, role: null });
    });

    it('troca de página e de tamanho pelo paginador', () => {
      setup();

      internals().onPage({ pageIndex: 2, pageSize: 20 });
      flush();

      expect(lastQuery()).toMatchObject({ page: 2, size: 20 });
    });

    it('ordena pela coluna clicada e volta para a primeira página', () => {
      setup();
      internals().onPage({ pageIndex: 2, pageSize: 10 });
      flush();

      internals().onSort({ active: 'email', direction: 'desc' });
      flush();

      expect(lastQuery()).toMatchObject({ sort: 'email', direction: 'desc', page: 0 });
    });

    it('usa ordem crescente quando o Material devolve direção vazia', () => {
      setup();

      internals().onSort({ active: 'city', direction: '' });
      flush();

      expect(lastQuery()).toMatchObject({ sort: 'city', direction: 'asc' });
    });
  });

  describe('exclusão', () => {
    it('pede confirmação, exclui, avisa e recarrega a lista', () => {
      setup();
      userService.list.mockClear();

      internals().remove(bruno);
      flush();

      expect(dialog.open).toHaveBeenCalledOnce();
      expect(dialog.open.mock.calls[0][1].data.message).toContain('Bruno Lima');
      expect(userService.delete).toHaveBeenCalledWith(2);
      expect(snackBar.open).toHaveBeenCalledWith('Usuário excluído.', 'Fechar', { duration: 4000 });
      expect(userService.list).toHaveBeenCalledOnce();
    });

    it('não exclui nada quando o usuário cancela', () => {
      setup();
      dialog.open.mockReturnValue({ afterClosed: () => of(false) });

      internals().remove(bruno);
      flush();

      expect(userService.delete).not.toHaveBeenCalled();
      expect(snackBar.open).not.toHaveBeenCalled();
    });

    it('volta uma página quando o último item da página é excluído', () => {
      userService.list.mockReturnValue(of(pageOf([bruno], 2)));
      setup();
      userService.list.mockClear();
      internals().onPage({ pageIndex: 2, pageSize: 10 });
      flush();
      userService.list.mockClear();

      internals().remove(bruno);
      flush();

      expect(lastQuery().page).toBe(1);
    });

    it('mostra a mensagem da API quando a exclusão falha', () => {
      setup();
      userService.delete.mockReturnValue(throwError(() => ({ status: 403, error: {} })));

      internals().remove(bruno);
      flush();

      expect(snackBar.open).toHaveBeenCalledWith('Você não tem permissão para esta ação.', 'Fechar', {
        duration: 5000,
      });
    });
  });
});
