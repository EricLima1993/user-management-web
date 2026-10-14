import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map } from 'rxjs';

export interface CepResult {
    street: string;
    district: string;
    city: string;
    state: string;
}

interface ViaCepResponse {
    logradouro?: string;
    bairro?: string;
    localidade?: string;
    uf?: string;
    erro?: boolean | string;
}

@Injectable({ providedIn: 'root' })
export class CepService {
    private readonly http = inject(HttpClient);

    /** Devolve os dados do CEP, ou null quando o CEP não existe. */
    lookup(cep: string): Observable<CepResult | null> {
        return this.http.get<ViaCepResponse>(`https://viacep.com.br/ws/${cep}/json/`).pipe(
            map((r) =>
                r.erro
                    ? null
                    : {
                        street: r.logradouro ?? '',
                        district: r.bairro ?? '',
                        city: r.localidade ?? '',
                        state: r.uf ?? '',
                    },
            ),
        );
    }
}