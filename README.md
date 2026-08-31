# Cadastro de Empresas

Aplicação web para cadastrar empresas, com CRUD completo e notificação por e-mail
a cada novo registro. Sem autenticação: a aplicação abre direto na listagem.

![Tela de listagem de empresas](docs/listagem.png)

## Stack

| Camada | Tecnologia |
|---|---|
| Frontend | React 19, Vite 8, React Router, TanStack Query, React Hook Form + Zod |
| Backend | NestJS 12, Prisma 7, class-validator, Nodemailer |
| Banco | PostgreSQL 18 |
| E-mail (dev) | Mailpit |
| Testes | Vitest 4 + Supertest |

## Pré-requisitos

- Docker
- Node 24 (versão exata em `.nvmrc`; `engines.node` exige `>=24.0.0`)

## Início rápido

Com `make`:

```bash
make setup     # sobe Postgres e Mailpit, cria os .env, instala e migra
make dev-api   # em um terminal
make dev-web   # em outro
```

Sem `make`:

```bash
docker compose up -d --wait

cd backend
cp .env.example .env
cp .env.test.example .env.test
npm install
npx prisma migrate deploy
npm run start:dev

# em outro terminal
cd frontend
cp .env.example .env
npm install
npm run dev
```

| Serviço | URL |
|---|---|
| Aplicação | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| Mailpit | http://localhost:8025 |

CNPJs válidos para teste: `11.222.333/0001-81` (numérico) e `00.000.000/E08G-12`
(alfanumérico). Os dígitos verificadores são conferidos, então um número
inventado é recusado.

## Variáveis de ambiente

`backend/.env` — validado com Zod no boot. Faltando uma variável obrigatória, o
processo encerra apontando qual, em vez de falhar na primeira requisição.

| Variável | Exemplo | Obrigatória |
|---|---|---|
| `NODE_ENV` | `development` | não (padrão `development`) |
| `PORT` | `3000` | não (padrão `3000`) |
| `CORS_ORIGIN` | `http://localhost:5173` | sim |
| `DATABASE_URL` | `postgresql://kpmg:kpmg@localhost:5432/kpmg?schema=public` | sim |
| `MAIL_HOST` | `localhost` | sim |
| `MAIL_PORT` | `1025` | sim |
| `MAIL_SECURE` | `false` | não (padrão `false`) |
| `MAIL_USER` / `MAIL_PASSWORD` | vazios em dev | não |
| `MAIL_FROM` | `Cadastro <nao-responda@brunotransportes.local>` | sim |
| `MAIL_NOTIFICATION_RECIPIENTS` | `cadastro@x.local,financeiro@x.local` | sim |

`frontend/.env`: `VITE_API_URL=http://localhost:3000`.

Para usar um SMTP real, basta trocar as variáveis `MAIL_*`. A autenticação só é
enviada quando `MAIL_USER` está preenchido.

## Vendo o e-mail

O Mailpit é um servidor SMTP de desenvolvimento: captura o que a aplicação envia
e mostra numa caixa de entrada web, sem credenciais reais. Cadastre uma empresa e
abra http://localhost:8025.

## Arquitetura

```
React (5173) ──HTTP/JSON──> NestJS (3000) ──Prisma──> PostgreSQL (5432)
                                  │
                                  └──SMTP──> Mailpit (1025 / UI 8025)
```

O frontend conversa com a API por um único cliente HTTP (`src/api/client.ts`),
que centraliza URL base, cabeçalhos e a tradução do erro. O TanStack Query
invalida a listagem depois de cada cadastro, edição ou exclusão.

No backend, `CompaniesService` usa o `PrismaService` diretamente e chama o
`MailService` após gravar. Erros do Prisma viram erros HTTP no próprio service,
e um filtro global padroniza o corpo da resposta:

```json
{
  "statusCode": 409,
  "error": "Conflict",
  "message": "Já existe uma empresa cadastrada com o CNPJ 11.222.333/0001-81.",
  "fields": { "cnpj": "Este CNPJ já está cadastrado." },
  "path": "/companies",
  "timestamp": "2026-08-30T12:00:00.000Z"
}
```

O `fields` é o que permite ao formulário mostrar cada mensagem no input certo.

## Endpoints

| Método | Rota | Sucesso | Erros |
|---|---|---|---|
| `POST` | `/companies` | `201` | `400`, `409` CNPJ duplicado |
| `GET` | `/companies` | `200` | — |
| `GET` | `/companies/:id` | `200` | `400` id inválido, `404` |
| `PATCH` | `/companies/:id` | `200` | `400` (inclui corpo vazio), `404`, `409` |
| `DELETE` | `/companies/:id` | `204` | `400` id inválido, `404` |

A resposta do `POST` traz os dados da empresa mais `notificationSent`, indicando
se o aviso por e-mail chegou a ser enviado. Documentação completa em `/docs`.

## Testes

```bash
cd backend
npm test          # 39 testes unitários
npm run test:e2e  # 31 testes ponta a ponta
npm run test:cov  # roda os dois e mede a cobertura combinada
```

Ou `make verify`, que executa lint, checagem de tipos, build e testes dos dois
projetos sem alterar arquivos.

Os testes e2e sobem a aplicação inteira contra um PostgreSQL real (banco
`kpmg_test`, criado por `docker/postgres/init.sql`) e cobrem a integração HTTP +
Nest + Prisma. Só o `MailService` é substituído por um dublê; o comportamento do
Nodemailer é verificado nos testes unitários, e a entrega efetiva no Mailpit é
uma conferência manual.

As duas suítes rodam em ordem aleatória (`sequence.shuffle`) e as tabelas são
limpas antes de cada caso.

Cobertura medida sobre `src`, excluindo o client gerado pelo Prisma, o `main.ts`
e os arquivos de módulo (declarativos, exercitados pelo e2e):

| Métrica | Valor |
|---|---|
| Statements | 96,7% |
| Lines | 96,7% |
| Functions | 100% |
| Branches | 68,4% |

## Decisões técnicas

**CNPJ numérico e alfanumérico.** Desde julho de 2026 o CNPJ pode conter letras
nas doze primeiras posições, mantendo dois dígitos verificadores numéricos. O
cálculo segue a Nota Técnica COCAD/SUARA/RFB nº 49/2024: cada caractere entra no
módulo 11 pelo seu código ASCII menos 48. A normalização remove apenas os
separadores `.`, `/` e `-` e converte para maiúsculas; qualquer outro caractere
faz o valor ser recusado. Isso corrige um problema da versão anterior, em que
limpar tudo que não fosse dígito transformava `11abc222.333/0001-81` no CNPJ
válido `11222333000181`.

**Unicidade no banco.** Não há consulta de "esse CNPJ já existe" antes de gravar:
entre o `SELECT` e o `INSERT` cabe outra requisição com o mesmo valor. O índice
único do PostgreSQL é a garantia, e o erro `P2002` do Prisma vira `409`. Como a
coluna guarda a forma canônica, versões mascarada e sem máscara colidem.

**Datas controladas pelo sistema.** `createdAt` e `updatedAt` são preenchidos
pelo Prisma e nunca aceitos pela API.

**Notificação síncrona e best-effort.** A empresa já está gravada quando o e-mail
sai, então uma falha de SMTP não invalida o cadastro. O envio é tentado na mesma
requisição, com timeouts explícitos, e o resultado volta em `notificationSent`
para a tela dizer o que de fato aconteceu, em vez de afirmar que o e-mail foi
enviado. Para um ambiente que exija garantia de entrega, o caminho seria uma fila
ou um outbox — desnecessário neste escopo.

**PATCH com campos alterados.** O formulário usa os campos marcados como
modificados pelo React Hook Form e envia só eles. Se nada mudou, nenhuma
requisição é feita. No backend, um `PATCH` de corpo vazio é recusado com `400`,
pela mesma razão que campos desconhecidos são recusados: esconder o problema
ajuda menos do que apontá-lo.

**Prisma direto no service.** Para um CRUD de uma entidade, uma interface de
repositório só moveria as chamadas de lugar. O Prisma já é a camada de acesso.

**Validação nos dois lados.** As regras de CNPJ existem no frontend para o erro
aparecer enquanto a pessoa digita, e no backend como autoridade final. Cada
aplicação tem uma única implementação (`backend/src/common/validation/cnpj.ts` e
`frontend/src/lib/cnpj.ts`).

## Limitações e possíveis evoluções

- **Sem autenticação**, conforme o enunciado. Em produção, a API precisaria ao
  menos de autenticação e rate limiting antes de ficar exposta.
- **Sem paginação.** A listagem devolve todas as empresas; passaria a exigir
  paginação e busca a partir de algumas centenas de registros.
- **E-mail sem garantia de entrega.** Uma falha é registrada em log e informada
  na tela, mas não há nova tentativa. Fila ou outbox resolveriam.
- **Exclusão definitiva**, sem histórico de alterações.
- **Sem testes automatizados no frontend**, que o enunciado dispensa.
