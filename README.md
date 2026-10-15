# User Management Web

Frontend em Angular para a [API de gerenciamento de usuários](https://github.com/EricLima1993/user-management), desenvolvido como parte de um teste técnico para a vaga de Analista de Sistemas Java Pleno.

A aplicação permite entrar com e-mail e senha, listar usuários com paginação, busca e filtros, e cadastrar, editar e excluir usuários com um ou mais endereços, com preenchimento automático pelo CEP. O que cada pessoa pode fazer depende do perfil (ADMIN ou USER).

## Status do projeto

- [x] Projeto Angular com Angular Material
- [x] Login com JWT, sessão em signals, interceptor do token e guards de rota
- [x] Listagem de usuários com paginação e ordenação no servidor, busca e filtros
- [x] Paginador em português
- [x] Exclusão de usuário com confirmação
- [x] Cadastro e edição de usuários, com múltiplos endereços e consulta de CEP
- [x] Perfil do usuário comum (edição apenas dos próprios dados)
- [x] Notificações de sucesso e erro (snackbar)
- [ ] Spinner de carregamento e layout responsivo
- [ ] Testes automatizados
- [ ] Docker e Docker Compose

> Este README é atualizado conforme o desenvolvimento avança.

## Stack

| Camada            | Tecnologias                                              |
| ----------------- | -------------------------------------------------------- |
| Framework         | Angular 22 (componentes standalone, zoneless)            |
| Interface         | Angular Material (tema Material 3)                       |
| Estado            | Signals e RxJS                                           |
| Formulários       | Reactive Forms (`FormGroup` e `FormArray`)               |
| Comunicação HTTP  | HttpClient com interceptor                               |
| Consulta de CEP   | [ViaCEP](https://viacep.com.br)                          |
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

Além do administrador, a API do perfil `dev` cadastra 12 usuários de exemplo, todos com a senha `Senha@123` (por exemplo, `ana.souza@teste.com` é ADMIN e `bruno.lima@teste.com` é USER). A lista completa está no README da API.

O banco do perfil `dev` é H2 em memória e é recriado a cada execução da API, então os usuários cadastrados por você somem ao reiniciá-la. **Depois de reiniciar a API, saia e entre de novo no frontend**, porque a sessão aberta antes aponta para ids que já não existem.

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
│   ├── cep/         # Consulta de CEP no ViaCEP
│   ├── config/      # URL da API
│   ├── layout/      # Barra de topo e área das telas internas
│   └── models/      # Tipos compartilhados (página de resultados)
├── features/
│   ├── auth/login/  # Tela de login
│   └── users/       # Serviço e tipos de usuário
│       ├── user-list/   # Listagem com paginação, busca e filtros
│       └── user-form/   # Formulário de cadastro e edição
└── shared/          # Componentes reutilizáveis (diálogo de confirmação)
```

As telas são carregadas sob demanda (`loadComponent`) e não há módulos (`NgModule`): cada componente standalone declara o que usa.

## Autenticação e autorização

- **Login:** `POST /auth/login` devolve um JWT. O `AuthService` decodifica o token, guarda a sessão (e-mail, perfil, validade) em um **signal** e a persiste no `sessionStorage`, que se perde ao fechar a aba.
- **Interceptor:** anexa `Authorization: Bearer <token>` apenas às chamadas para a nossa API (o token não é enviado ao ViaCEP). Se a API responder `401` (token ausente, inválido ou expirado), a sessão é encerrada e a pessoa volta ao login.
- **Guards:**
  - `authGuard` exige uma sessão válida.
  - `adminGuard` protege a listagem e o cadastro. Quem não é ADMIN é levado ao próprio perfil.
  - `selfOrAdminGuard` protege a edição: o ADMIN abre qualquer usuário e o USER abre apenas o próprio.
- **Validade:** a tela usa o campo `exp` do próprio token para saber se a sessão ainda vale. O backend não emite refresh token, então, ao expirar, é preciso entrar de novo.

Os guards existem para a experiência de uso. **A regra de acesso é aplicada pela API**, que responde `403` quando um USER tenta acessar dados de outra pessoa, mesmo que a tela seja contornada.

| Perfil | O que pode fazer                                                     |
| ------ | -------------------------------------------------------------------- |
| ADMIN  | Listar, criar, editar e excluir qualquer usuário                     |
| USER   | Ver e editar apenas o próprio cadastro (sem alterar perfil e status) |

## Formulário de usuário

Uma única tela atende o cadastro e a edição:

- **Cadastro (ADMIN):** nome, e-mail, telefone, senha (8 a 72 caracteres), perfil e ao menos um endereço.
- **Edição:** os dados vêm preenchidos pela API. O e-mail fica bloqueado e a senha é opcional (em branco mantém a atual). Perfil e situação (ativo ou inativo) só aparecem para o ADMIN.
- **Endereços:** lista dinâmica (`FormArray`) com adição e remoção. Sempre existe ao menos um e exatamente um é o principal.
- **CEP:** ao sair do campo, o ViaCEP preenche rua, bairro, cidade e UF. CEP inexistente bloqueia o envio. Se o ViaCEP estiver fora do ar, os campos podem ser preenchidos à mão. O backend continua sendo a fonte da verdade e revalida o CEP.
- **Erros da API:** a mensagem do Problem Details (`detail`) é exibida ao usuário, por exemplo e-mail já cadastrado.

## Decisões técnicas

| Tema                        | Decisão                                                                  | Motivo                                                                            |
| --------------------------- | ------------------------------------------------------------------------ | --------------------------------------------------------------------------------- |
| Estrutura                   | Componentes standalone, sem `NgModule`, com pastas `core`, `features` e `shared` | Padrão atual do Angular; a organização por responsabilidade se mantém      |
| Estado da sessão            | Signals no `AuthService`                                                 | Estado simples e reativo, sem biblioteca extra                                    |
| Listagem                    | Paginação, ordenação e filtros feitos no servidor                        | A API é a fonte da verdade e evita carregar todos os registros                    |
| Consulta da listagem        | Estado da consulta em um signal, convertido em fluxo com `switchMap`     | Uma nova consulta cancela a anterior e evita resposta fora de ordem               |
| Armazenamento do token      | `sessionStorage`                                                         | A sessão não sobrevive ao fechamento da aba                                       |
| Formulário                  | Um único componente para cadastro e edição                               | Evita duplicar campos e regras; o modo muda só o que é obrigatório e visível      |
| Endereços                   | `FormArray` de `FormGroup`                                               | Permite adicionar e remover endereços mantendo a validação de cada um             |
| Consulta de CEP             | O front consulta o ViaCEP direto, para dar resposta imediata             | Melhora a experiência; a API revalida o CEP e prevalece sobre o que o front enviou |
| Bairro                      | Opcional no formulário                                                   | Segue o contrato da API, que aceita endereço sem bairro                           |
| Atualização da tela         | `markForCheck` após respostas fora dos signals                           | O app é zoneless: o Angular só redesenha quando é avisado                         |
| Controle de acesso          | Guards na tela e regra real na API                                       | Os guards melhoram a navegação; a segurança não depende do front                  |
| Interface                   | Angular Material                                                         | Componentes prontos e acessíveis, com foco no que o teste pede                    |
| Testes                      | Vitest                                                                   | Runner padrão do Angular atual, com API semelhante à do Jest                      |

## Autor

Eric Lima dos Santos
