# Cadastro de Empresas

Aplicação web para gerenciamento de empresas, com CRUD completo e envio de uma
notificação por e-mail a cada novo cadastro. O sistema não possui autenticação,
conforme solicitado no teste técnico.

![Tela de listagem de empresas](docs/listagem.png)

## Tecnologias

| Camada | Tecnologia |
|---|---|
| Frontend | React, Vite, React Router, TanStack Query, React Hook Form e Zod |
| Backend | NestJS, Prisma e Nodemailer |
| Banco de dados | PostgreSQL |
| E-mail em desenvolvimento | Mailpit |
| Testes | Vitest e Supertest |

## Como executar

### Pré-requisitos

- Docker
- Node.js 24 ou superior
- Make (opcional)

### Instalação rápida

```bash
make setup
```

Esse comando sobe o PostgreSQL e o Mailpit, cria os arquivos de ambiente a
partir dos exemplos, instala as dependências e executa as migrations.

Depois, inicie o backend e o frontend em terminais separados:

```bash
make dev-api
```

```bash
make dev-web
```

Sem `make`, execute a preparação manualmente:

```bash
docker compose up -d --wait
cp backend/.env.example backend/.env
cp backend/.env.test.example backend/.env.test
cp frontend/.env.example frontend/.env
npm --prefix backend install
npm --prefix frontend install
npm --prefix backend run migrate:deploy
```

Depois, use `npm --prefix backend run start:dev` e
`npm --prefix frontend run dev` em terminais separados.

### Serviços

| Serviço | URL |
|---|---|
| Aplicação | http://localhost:5173 |
| API | http://localhost:3000 |
| Swagger | http://localhost:3000/docs |
| Caixa de entrada do Mailpit | http://localhost:8025 |

Para testar o formulário, podem ser usados os CNPJs
`11.222.333/0001-81` ou `00.000.000/E08G-12`.

## Funcionamento

```text
React ──HTTP/JSON──> NestJS ──Prisma──> PostgreSQL
                         │
                         └──SMTP──> Mailpit
```

O frontend consome a API REST do NestJS e atualiza a listagem após operações de
cadastro, edição ou exclusão. O backend valida os dados e usa o Prisma para
persisti-los no PostgreSQL.

Depois que uma empresa é criada, o backend envia uma notificação para os
destinatários configurados em `MAIL_NOTIFICATION_RECIPIENTS`. Em desenvolvimento,
o Mailpit captura a mensagem para que ela possa ser conferida no navegador. Um
servidor SMTP real pode ser usado alterando as variáveis `MAIL_*`.

As datas de criação e alteração são preenchidas automaticamente pelo sistema.

## API

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/companies` | Cadastra uma empresa |
| `GET` | `/companies` | Lista as empresas |
| `GET` | `/companies/:id` | Busca uma empresa |
| `PATCH` | `/companies/:id` | Atualiza uma empresa |
| `DELETE` | `/companies/:id` | Exclui uma empresa |

A documentação completa dos contratos e possíveis respostas está disponível no
Swagger em http://localhost:3000/docs.

## Testes

Os testes do backend cobrem as operações de CRUD, as validações e o disparo da
notificação por e-mail.

```bash
cd backend
npm test
npm run test:e2e
npm run test:cov
```

Para executar lint, verificação de tipos, build e todos os testes dos dois
projetos:

```bash
make verify
```

Os testes end-to-end utilizam o banco `kpmg_test`, criado pelo Docker, sem
alterar os dados do ambiente de desenvolvimento.

## Decisões técnicas

- **CNPJ:** o valor é validado no frontend para feedback imediato e novamente no
  backend, que é a validação definitiva. O sistema aceita o formato numérico e o
  novo formato alfanumérico.
- **Unicidade:** o CNPJ é armazenado em formato normalizado e possui índice único
  no banco de dados.
- **E-mail:** o envio acontece após a empresa ser salva. Se o SMTP falhar, o
  cadastro é mantido e a interface informa que a notificação não foi enviada.
- **Validação:** campos desconhecidos ou inválidos são recusados pela API, que
  devolve erros em um formato consistente para o frontend.
- **Sem autenticação:** o acesso é direto, como definido no enunciado.

## Limitações

- A listagem não possui paginação ou busca.
- O envio de e-mail não possui fila nem novas tentativas.
- A exclusão é definitiva e não mantém histórico.
