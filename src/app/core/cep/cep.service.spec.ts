import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { CepResult, CepService } from './cep.service';

const VIACEP = 'https://viacep.com.br/ws/01001000/json/';

describe('CepService', () => {
  let service: CepService;
  let controller: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(CepService);
    controller = TestBed.inject(HttpTestingController);
  });

  afterEach(() => controller.verify());

  /** Consulta o CEP, responde como o ViaCEP e devolve o que o serviço entregou. */
  function lookupAnswering(answer: object): CepResult | null | undefined {
    let result: CepResult | null | undefined;
    service.lookup('01001000').subscribe((r) => (result = r));
    controller.expectOne(VIACEP).flush(answer);
    return result;
  }

  it('traduz a resposta do ViaCEP para os campos do endereço', () => {
    const result = lookupAnswering({
      logradouro: 'Praça da Sé',
      bairro: 'Sé',
      localidade: 'São Paulo',
      uf: 'SP',
    });

    expect(result).toEqual({
      street: 'Praça da Sé',
      district: 'Sé',
      city: 'São Paulo',
      state: 'SP',
    });
  });

  it('devolve null quando o CEP não existe', () => {
    expect(lookupAnswering({ erro: true })).toBeNull();
  });

  it('devolve texto vazio nos campos que o ViaCEP não preenche', () => {
    const result = lookupAnswering({ localidade: 'Brasília', uf: 'DF' });

    expect(result).toEqual({ street: '', district: '', city: 'Brasília', state: 'DF' });
  });

  it('repassa o erro quando o ViaCEP está fora do ar', () => {
    let status: number | undefined;
    service.lookup('01001000').subscribe({ error: (e) => (status = e.status) });

    controller.expectOne(VIACEP).flush(null, { status: 503, statusText: 'Unavailable' });

    expect(status).toBe(503);
  });
});
