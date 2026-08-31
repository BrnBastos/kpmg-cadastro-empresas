# Atalhos para não depender de decorar a sequência de comandos.
# Tudo aqui funciona igual se digitado à mão; veja o README.

BACKEND  = npm --prefix backend
FRONTEND = npm --prefix frontend

.PHONY: setup up down dev-api dev-web test e2e cov verify clean

## Sobe a infraestrutura, prepara os .env, instala e aplica as migrations.
setup: up
	@cp -n backend/.env.example backend/.env 2>/dev/null || true
	@cp -n backend/.env.test.example backend/.env.test 2>/dev/null || true
	@cp -n frontend/.env.example frontend/.env 2>/dev/null || true
	$(BACKEND) install
	$(FRONTEND) install
	$(BACKEND) exec -- prisma migrate deploy
	@echo "Pronto. Use 'make dev-api' e 'make dev-web' em dois terminais."

## PostgreSQL e Mailpit. O --wait segura até o healthcheck do banco passar.
up:
	docker compose up -d --wait

down:
	docker compose down

dev-api:
	$(BACKEND) run start:dev

dev-web:
	$(FRONTEND) run dev

test:
	$(BACKEND) test

e2e:
	$(BACKEND) run test:e2e

cov:
	$(BACKEND) run test:cov

## Lint, tipos, build e testes dos dois projetos. Não altera arquivos.
verify:
	$(BACKEND) run lint
	$(BACKEND) run typecheck
	$(BACKEND) run build
	$(BACKEND) test
	$(BACKEND) run test:e2e
	$(FRONTEND) run lint
	$(FRONTEND) run build

clean:
	docker compose down -v
