# Cadastro de Empresas

Aplicação web para gerenciar o cadastro de empresas, com as quatro operações de CRUD e
notificação por e-mail a cada nova empresa registrada.

Frontend em **React**, backend em **NestJS**, dados em **PostgreSQL** e envio de e-mail por
**SMTP**. Não há autenticação: a aplicação abre direto na listagem.

---

## Sumário

1. [Como rodar](#como-rodar)
2. [Variáveis de ambiente](#variáveis-de-ambiente)
3. [Arquitetura](#arquitetura)
4. [Decisões técnicas](#decisões-técnicas)
5. [Como os requisitos foram atendidos](#como-os-requisitos-foram-atendidos)
6. [Testes](#testes)
7. [Possíveis evoluções](#possíveis-evoluções)

---

## Como rodar

**Pré-requisitos:** Docker e Node 24 (a versão exata está no `.nvmrc`).

### 1. Suba o banco e o servidor de e-mail

```bash
docker compose up -d
```

Isso levanta o PostgreSQL na porta `5432` e o [Mailpit](https://mailpit.axllent.org/) nas portas
`1025` (SMTP) e `8025` (interface web). O Mailpit é um servidor SMTP de desenvolvimento: ele
captura tudo que a aplicação envia e mostra numa caixa de entrada no navegador, sem precisar de
nenhuma credencial de e-mail real.

### 2. Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate deploy
npm run start:dev
```

A API sobe em `http://localhost:3000` e a documentação Swagger fica em
**`http://localhost:3000/docs`**.

### 3. Frontend

Em outro terminal:

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
```

A aplicação abre em **`http://localhost:5173`**.

### 4. Veja o e-mail chegar

Cadastre uma empresa pela tela e abra **`http://localhost:8025`**. O aviso estará na caixa de
entrada do Mailpit, endereçado ao grupo definido em `MAIL_NOTIFICATION_RECIPIENTS`.

> Para um CNPJ de teste válido: `11.222.333/0001-81` ou `11.444.777/0001-61`. Os dígitos
> verificadores são conferidos de verdade, então um número qualquer é recusado.

### 5. Testes

```bash
cd backend
cp .env.test.example .env.test
npm test        # unitários
npm run test:e2e  # ponta a ponta, contra o banco kpmg_test
```

---

## Variáveis de ambiente

### `backend/.env`

| Variável | Exemplo | O que acontece se faltar |
|---|---|---|
| `NODE_ENV` | `development` | Assume `development` |
| `PORT` | `3000` | Assume `3000` |
| `CORS_ORIGIN` | `http://localhost:5173` | **A API não sobe** |
| `DATABASE_URL` | `postgresql://kpmg:kpmg@localhost:5432/kpmg?schema=public` | **A API não sobe** |
| `MAIL_HOST` | `localhost` | **A API não sobe** |
| `MAIL_PORT` | `1025` | **A API não sobe** |
| `MAIL_SECURE` | `false` | Assume `false` |
| `MAIL_USER` | *(vazio)* | Assume vazio, e nenhuma autenticação é enviada |
| `MAIL_PASSWORD` | *(vazio)* | Assume vazio |
| `MAIL_FROM` | `Cadastro <nao-responda@kpmg-teste.local>` | **A API não sobe** |
| `MAIL_NOTIFICATION_RECIPIENTS` | `cadastro@x.com,financeiro@x.com` | **A API não sobe** |

O arquivo é validado com [zod](https://zod.dev) durante o boot. Se faltar qualquer variável
obrigatória, o processo encerra apontando exatamente quais são, em vez de a aplicação subir e
quebrar na primeira requisição.

### `frontend/.env`

| Variável | Exemplo |
|---|---|
| `VITE_API_URL` | `http://localhost:3000` |

### Usando um SMTP real

Basta trocar as variáveis `MAIL_*`, sem alterar código. Para Gmail, por exemplo:

```env
MAIL_HOST=smtp.gmail.com
MAIL_PORT=465
MAIL_SECURE=true
MAIL_USER=seu-usuario@gmail.com
MAIL_PASSWORD=sua-senha-de-app
```

Quando `MAIL_USER` está preenchido, a autenticação passa a ser enviada; quando está vazio, não —
o Mailpit recusa o handshake se receber autenticação sem esperá-la.

---

## Arquitetura

```
┌──────────────────┐        HTTP/JSON        ┌──────────────────┐
│  React + Vite    │ ──────────────────────▶ │  NestJS          │
│  localhost:5173  │ ◀────────────────────── │  localhost:3000  │
└──────────────────┘                         └────────┬─────────┘
                                                      │
                                    Prisma ORM        │        SMTP
                                 ┌────────────────────┴───────────────┐
                                 ▼                                    ▼
                        ┌──────────────────┐              ┌──────────────────┐
                        │  PostgreSQL 18   │              │  Mailpit         │
                        │  localhost:5432  │              │  localhost:8025  │
                        └──────────────────┘              └──────────────────┘
```

### Como as partes conversam

**Frontend → Backend.** O React fala com a API por HTTP/JSON, através de um único cliente
(`frontend/src/api/client.ts`) que centraliza a URL base, os cabeçalhos e a tradução de erro. O
TanStack Query cuida do cache e de refazer a busca da listagem depois de cada cadastro, edição ou
exclusão, de modo que a tabela nunca fica exibindo dado velho.

**Backend → Banco.** O NestJS acessa o PostgreSQL pelo Prisma. O `PrismaService` estende o
`PrismaClient` e se conecta no boot do módulo, encerrando o pool no desligamento da aplicação.
O schema fica em `backend/prisma/schema.prisma` e as migrations em `backend/prisma/migrations`.

**Backend → E-mail.** O `MailService` monta um transporte SMTP com Nodemailer a partir das
variáveis de ambiente e envia a notificação. Em desenvolvimento o destino é o Mailpit; em produção,
basta apontar para o SMTP real.

### O fluxo do cadastro, ponta a ponta

```mermaid
sequenceDiagram
    autonumber
    participant U as Navegador (React)
    participant A as API (NestJS)
    participant D as PostgreSQL
    participant S as SMTP

    U->>A: POST /companies
    Note over A: valida os campos e os<br/>dígitos verificadores do CNPJ
    A->>D: INSERT em companies

    alt CNPJ já cadastrado
        D-->>A: violação de unicidade (P2002)
        A-->>U: 409 apontando o campo cnpj
    else gravou com sucesso
        D-->>A: empresa criada
        A->>S: envia o aviso ao grupo
        alt SMTP indisponível
            S--xA: falha no envio
            Note over A: registra no log e segue
        end
        A-->>U: 201 com a empresa
        U->>A: GET /companies (lista atualizada)
    end
```

### Estrutura de pastas

```
kpmg/
├── docker-compose.yml          # postgres + mailpit
├── backend/
│   ├── prisma/                 # schema e migrations
│   └── src/
│       ├── companies/          # controller, service, dtos
│       ├── mail/               # transporte smtp e template
│       ├── prisma/             # conexao com o banco
│       ├── config/             # validacao do .env
│       ├── common/             # filtro de erro, validacao de cnpj
│       └── setup-app.ts        # pipes e filtros, usados pelo main e pelos testes
└── frontend/
    └── src/
        ├── api/                # cliente http e tipos
        ├── pages/              # listagem e formulario
        ├── components/         # campo, dialogo, aviso
        └── lib/                # cnpj e datas
```

---

## Decisões técnicas

### CNPJ validado pelos dígitos verificadores, não por formato

Quatorze números aleatórios passam em qualquer expressão regular, mas não formam um CNPJ real. A
validação (`backend/src/common/validation/cnpj.ts`) calcula os dois dígitos verificadores e recusa
também as sequências repetidas, que passariam na conta. A mesma regra existe no frontend, para que
o erro apareça enquanto a pessoa digita — mas quem decide continua sendo a API.

### CNPJ guardado sem máscara

A coluna guarda apenas os quatorze dígitos, independentemente de o cliente ter enviado
`11.222.333/0001-81` ou `11222333000181`. A máscara é aplicada na exibição. Sem isso, o mesmo CNPJ
entraria duas vezes com formatações diferentes e o índice de unicidade não perceberia.

### Unicidade garantida pelo banco, não por consulta prévia

Não existe um `SELECT` para checar se o CNPJ já existe antes de gravar. Entre essa consulta e o
`INSERT` cabe outra requisição gravando o mesmo CNPJ, e o problema voltaria de forma intermitente.
Quem garante a unicidade é o índice do PostgreSQL; o erro `P2002` do Prisma é traduzido para
**409 Conflict**.

### Falha no e-mail não invalida o cadastro

Quando o e-mail é enviado, a empresa **já está gravada**. Derrubar a requisição nesse ponto
significaria devolver erro para uma operação que deu certo, e a pessoa tentaria cadastrar de novo.
Então a falha é registrada no log e a resposta continua sendo `201`.

Essa regra vive no `CompaniesService`, e não dentro do `MailService`: é uma decisão sobre o
cadastro, não sobre o envio. O `MailService` apenas envia e deixa o erro subir.

O tempo de espera do SMTP também é limitado explicitamente. Sem isso, o Nodemailer passaria minutos
tentando alcançar um servidor fora do ar, e a requisição do cadastro ficaria esperando junto.

### Um único formato de erro

Toda resposta de erro sai no mesmo formato, com um mapa opcional por campo:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Já existe uma empresa cadastrada com o CNPJ 11.222.333/0001-81.",
  "fields": { "cnpj": "Este CNPJ já está cadastrado." },
  "path": "/companies",
  "timestamp": "2026-08-28T15:24:40.461Z"
}
```

O campo `fields` é o que permite ao formulário colocar cada mensagem no input a que ela pertence,
em vez de exibir um alerta solto no topo da tela. O `error` é o rótulo técnico do status HTTP, em
inglês; o `message` é o texto que a pessoa lê, em português.

Erros inesperados são registrados com o stack completo no log e respondidos com uma mensagem
genérica, para não vazar detalhe interno.

### Ambiente validado no boot

As variáveis de ambiente passam por um schema zod antes de qualquer módulo subir. Faltando uma
variável obrigatória, a aplicação encerra dizendo qual — em vez de subir e falhar na primeira
requisição, quando o problema já está longe da causa.

### `PATCH` em vez de `PUT`

A edição envia apenas os campos alterados. Com `PUT`, o cliente precisaria reenviar o registro
inteiro e um campo esquecido apagaria o valor existente.

### `CriadoEm` e `AlteradoEm` controlados pelo banco

São preenchidos pelo Prisma (`@default(now())` e `@updatedAt`) e nunca aceitos pela API. Datas de
auditoria que o cliente pode escrever não servem para auditar nada.

### Mailpit no lugar do MailHog

O MailHog está arquivado desde 2021, com a última versão publicada em 2020. O Mailpit é mantido,
cumpre o mesmo papel e usa as mesmas portas.

### Prisma 7 e TypeScript 6

`prisma@latest` resolve hoje para uma versão candidata (`8.0.0-rc`), e `typescript@latest` para a
linha 7, enquanto o próprio `@nestjs/cli` depende de TypeScript 6. As versões foram fixadas nas
linhas estáveis e compatíveis com o framework.

### Sem biblioteca de componentes no frontend

O requisito pede uma interface simples e objetiva. Para duas telas e quatro campos, um conjunto
pequeno de tokens CSS e estilos próprios cobre o necessário sem trazer a configuração e o peso de
uma biblioteca inteira.

### Tipos escritos à mão no frontend

`frontend/src/api/types.ts` espelha os DTOs do backend. São dois projetos independentes, e um passo
de geração de tipos custaria mais a quem for rodar o projeto do que este arquivo custa para manter.

---

## Como os requisitos foram atendidos

| Requisito | Onde está |
|---|---|
| Cadastro com Nome, CNPJ, Nome Fantasia, Endereço, CriadoEm, AlteradoEm | `backend/prisma/schema.prisma`, `backend/src/companies/dto/` |
| **Criar** empresa | `POST /companies` — `companies.controller.ts` |
| **Ler** / listar empresas | `GET /companies` — ordenado da mais recente para a mais antiga |
| **Atualizar** empresa | `PATCH /companies/:id` |
| **Excluir** empresa | `DELETE /companies/:id` |
| Tela de listagem com os dados | `frontend/src/pages/CompanyListPage.tsx` |
| Botão "Cadastrar Nova Empresa" levando à tela de cadastro | Mesmo arquivo, rota `/companies/new` |
| E-mail para um grupo previamente configurado | `MAIL_NOTIFICATION_RECIPIENTS` → `backend/src/mail/mail.service.ts` |
| Envio automático ao criar | `CompaniesService.create` dispara o aviso após gravar |
| Frontend em React | React 19 + Vite 8 |
| Backend em NestJS com API REST | NestJS 12, documentada em `/docs` |
| Banco relacional | PostgreSQL 18 via Prisma |
| Testes automatizados de CRUD no backend | `backend/src/**/*.spec.ts` e `backend/test/companies.e2e-spec.ts` |
| Testes cobrindo o envio de e-mail | `mail.service.spec.ts`, `companies.service.spec.ts` e o e2e |
| Sem autenticação | Nenhuma rota protegida, nenhum login |

### Endpoints

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| `POST` | `/companies` | `201` | `400` validação, `409` CNPJ duplicado |
| `GET` | `/companies` | `200` | — |
| `GET` | `/companies/:id` | `200` | `400` id inválido, `404` |
| `PATCH` | `/companies/:id` | `200` | `400`, `404`, `409` |
| `DELETE` | `/companies/:id` | `204` | `400` id inválido, `404` |

---

## Testes

São **54 testes** no backend, em duas camadas, ambos rodando com Vitest.

### Unitários (32)

```bash
cd backend && npm test
```

| Arquivo | O que cobre |
|---|---|
| `common/validation/cnpj.spec.ts` | Dígitos verificadores, sequências repetidas, máscara |
| `companies/companies.service.spec.ts` | As quatro operações, o disparo do e-mail e a tradução dos erros do Prisma |
| `mail/mail.service.spec.ts` | Destinatários, assunto, corpo, autenticação condicional e propagação da falha |
| `mail/company-created.template.spec.ts` | Conteúdo do e-mail e escape de HTML |

### Ponta a ponta (22)

```bash
cd backend && npm run test:e2e
```

Sobem a aplicação inteira e batem na API por HTTP, com um banco PostgreSQL de verdade
(`kpmg_test`, criado por `docker/postgres/init.sql`). Só o `MailService` é substituído por um
dublê — o envio em si tem teste próprio.

Cobrem o ciclo completo (cadastrar, listar, editar, excluir), as validações, o CNPJ duplicado, os
`404` e o comportamento do e-mail.

### Sobre a qualidade dos testes

- **O e-mail é verificado pelo conteúdo, não pela chamada.** As asserções conferem os
  destinatários, o assunto e o CNPJ formatado no corpo — verificar apenas que "o método foi
  chamado" não provaria que a mensagem certa saiu.
- **Existe um teste para o SMTP fora do ar**, garantindo que o cadastro continua respondendo `201`.
- **As tabelas são limpas antes de cada caso**, e não depois: um teste que quebra no meio ainda
  deixa a tabela limpa para o próximo.
- **A suíte passa em ordem aleatória** (`--sequence.shuffle`) e numa segunda execução seguida, sem
  nenhum reset. Se a ordem importasse, o teste é que estaria errado.
- **O banco de testes é separado do de desenvolvimento**, então rodar a suíte nunca apaga dados.

---

## Possíveis evoluções

Ficaram de fora por não fazerem parte do escopo pedido, mas seriam os próximos passos naturais:

- **Fila para o envio de e-mail.** Hoje o envio acontece dentro da requisição. Com volume, o
  caminho seria publicar o evento numa fila e entregar em segundo plano, com novas tentativas.
- **Paginação e busca na listagem**, necessárias assim que o cadastro passar de algumas centenas de
  empresas.
- **Exclusão lógica e histórico de alterações**, se o cadastro precisar de auditoria.
- **Consulta de endereço por CEP**, para reduzir digitação e padronizar o endereço.
- **Pipeline de CI** executando lint, build e as duas suítes de teste a cada push.
