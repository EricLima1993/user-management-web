# User Management Web

Frontend em Angular para a [API de gerenciamento de usuários](https://github.com/EricLima1993/user-management), desenvolvido como parte de um teste técnico para a vaga de Analista de Sistemas Java Pleno.

A aplicação permite entrar com e-mail e senha, listar usuários com paginação, busca e filtros, e cadastrar, editar e excluir usuários com um ou mais endereços. O que cada pessoa pode fazer depende do perfil (ADMIN ou USER).

## Status do projeto

- [x] Projeto Angular com Angular Material
- [x] Login com JWT, sessão em signals, interceptor do token e guards de rota
- [x] Listagem de usuários com paginação e ordenação no servidor, busca e filtros
- [x] Exclusão de usuário com confirmação
- [ ] Cadastro e edição de usuários, com múltiplos endereços e consulta de CEP
- [ ] Perfil do usuário comum (edição apenas dos próprios dados)
- [ ] Feedback visual (spinner e notificações) e layout responsivo
- [ ] Testes automatizados
- [ ] Docker e Docker Compose

> Este README é atualizado conforme o desenvolvimento avança.

## Stack

| Camada            | Tecnologias                                              |
| ----------------- | -------------------------------------------------------- |
| Framework         | Angular 22 (componentes standalone, zoneless)            |
| Interface         | Angular Material (tema Material 3)                       |
| Estado            | Signals e RxJS                                           |
| Formulários       | Reactive Forms                                           |
| Comunicação HTTP  | HttpClient com interceptor                               |
| Testes            | Vitest (runner padrão do Angular)                        |
| Ferramentas       | Node.js 24, npm 11, Angular CLI 22                       |

## Como executar

### Pré-requisitos

- Node.js 20 ou superior (testado com 24)
- Angular CLI (`npm install -g @angular/cli`)
- A [API](https://github.com/EricLima1993/user-management) rodando em `http://localhost:8080`

### Passo a passo

```
npm install
ng serve
```

A aplicação sobe em <http://localhost:4200>.

No perfil `dev`, a API cria um administrador inicial:

| E-mail            | Senha       | Perfil |
| ----------------- | ----------- | ------ |
| `admin@local.dev` | `Admin@123` | ADMIN  |

O banco do perfil `dev` é H2 em memória e é recriado a cada execução da API, então os usuários cadastrados somem ao reiniciá-la.

### Endereço da API

A URL base da API fica em `src/app/core/config/api.config.ts` (padrão `http://localhost:8080/api/v1`). Para o navegador conseguir chamar a API, a origem do front precisa estar liberada no CORS do backend. No perfil `dev` o `http://localhost:4200` já vem liberado. Em outros ambientes, use a variável `CORS_ALLOWED_ORIGINS` da API.

### Testes

```
ng test
```

*Os testes serão documentados quando forem escritos.*

### Docker

*Será documentado após a conclusão do Docker Compose.*

## Estrutura do projeto

```
src/app/
├── core/
│   ├── auth/        # AuthService (sessão em signals), interceptor e guards
│   ├── config/      # URL da API
│   ├── layout/      # Barra de topo e área das telas internas
│   └── models/      # Tipos compartilhados (página de resultados)
├── features/
│   ├── auth/login/  # Tela de login
│   └── users/       # Listagem, serviço e tipos de usuário
└── shared/          # Componentes reutilizáveis (diálogo de confirmação)
```

## Autenticação e autorização

- **Login:** `POST /auth/login` devolve um JWT. O `AuthService` decodifica o token, guarda a sessão (e-mail, perfil, validade) em um **signal** e a persiste no `sessionStorage`, que se perde ao fechar a aba.
- **Interceptor:** anexa `Authorization: Bearer <token>` apenas às chamadas para a nossa API. Se a API responder `401` (token ausente, inválido ou expirado), a sessão é encerrada e a pessoa volta ao login.
- **Guards:** `authGuard` exige uma sessão válida e `adminGuard` restringe as telas de administração. Quem não é ADMIN é levado ao próprio perfil.
- **Validade:** a tela usa o campo `exp` do próprio token para saber se a sessão ainda vale. O backend não emite refresh token, então, ao expirar, é preciso entrar de novo.

| Perfil | O que pode fazer                                                   |
| ------ | ------------------------------------------------------------------ |
| ADMIN  | Listar, criar, editar e excluir qualquer usuário                   |
| USER   | Ver e editar apenas o próprio cadastro (sem alterar perfil e status) |

## Decisões técnicas

| Tema                        | Decisão                                                                  | Motivo                                                                            |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Estado da sessão            | Signals no `AuthService`                                                 | Estado simples e reativo, sem biblioteca extra                                    |
| Listagem                    | Paginação, ordenação e filtros feitos no servidor                        | A API é a fonte da verdade e evita carregar todos os registros                    |
| Consulta da listagem        | Estado da consulta em um signal, convertido em fluxo com `switchMap`     | Uma nova consulta cancela a anterior e evita resposta fora de ordem               |
| Armazenamento do token      | `sessionStorage`                                                         | A sessão não sobrevive ao fechamento da aba                                       |
| Interface                   | Angular Material                                                         | Componentes prontos e acessíveis, com foco no que o teste pede                    |
| Testes                      | Vitest                                                                   | Runner padrão do Angular atual, com API semelhante à do Jest                      |

## Autor

Eric Lima dos Santos
