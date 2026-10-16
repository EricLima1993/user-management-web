import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { API_URL } from '../../core/config/api.config';
import { UserCreateRequest, UserQuery, UserUpdateRequest } from './user.models';
import { UserService } from './user.service';

const URL = `${API_URL}/users`;

/** Consulta "limpa": sem filtros, primeira página, ordenada por nome. */
const baseQuery: UserQuery = {
  search: '',
  city: '',
  status: null,
  role: null,
  page: 0,
  size: 10,
  sort: 'name',
  direction: 'asc',
};

const address = {
  cep: '01001000',
  street: 'Praça da Sé',
  number: '100',
  state: 'SP',
  city: 'São Paulo',
  mainAddress: true,
};

describe('UserService', () => {
  let service: UserService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(UserService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  describe('list', () => {
    /** Dispara a listagem e devolve a requisição capturada, já respondida. */
    function listWith(query: UserQuery) {
      service.list(query).subscribe();
      const req = controller.expectOne((r) => r.url === URL);
      req.flush({});
      return req.request;
    }

    it('chama GET /users com página, tamanho e ordenação', () => {
      const request = listWith({ ...baseQuery, page: 2, size: 20, sort: 'email', direction: 'desc' });

      expect(request.method).toBe('GET');
      expect(request.params.get('page')).toBe('2');
      expect(request.params.get('size')).toBe('20');
      expect(request.params.get('sort')).toBe('email,desc');
    });

    it('não envia os filtros que estão vazios', () => {
      const request = listWith(baseQuery);

      ['search', 'city', 'status', 'role'].forEach((name) =>
        expect(request.params.has(name)).toBe(false),
      );
    });

    it('envia os filtros preenchidos', () => {
      const request = listWith({
        ...baseQuery,
        search: 'ana',
        city: 'São Paulo',
        status: 'ACTIVE',
        role: 'ADMIN',
      });

      expect(request.params.get('search')).toBe('ana');
      expect(request.params.get('city')).toBe('São Paulo');
      expect(request.params.get('status')).toBe('ACTIVE');
      expect(request.params.get('role')).toBe('ADMIN');
    });
  });

  it('findById chama GET /users/{id}', () => {
    service.findById(5).subscribe();

    const req = controller.expectOne(`${URL}/5`);
    expect(req.request.method).toBe('GET');
    req.flush({});
  });

  it('create chama POST /users com o corpo enviado', () => {
    const body: UserCreateRequest = {
      name: 'Ana',
      email: 'ana@teste.com',
      password: 'Senha@123',
      role: 'USER',
      addresses: [address],
    };

    service.create(body).subscribe();

    const req = controller.expectOne(URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('update chama PUT /users/{id} com o corpo enviado', () => {
    const body: UserUpdateRequest = { name: 'Ana Souza', addresses: [address] };

    service.update(5, body).subscribe();

    const req = controller.expectOne(`${URL}/5`);
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(body);
    req.flush({});
  });

  it('delete chama DELETE /users/{id}', () => {
    service.delete(5).subscribe();

    const req = controller.expectOne(`${URL}/5`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
