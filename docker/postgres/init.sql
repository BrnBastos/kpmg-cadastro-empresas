-- Roda uma única vez, na primeira subida do container. O banco principal vem
-- do POSTGRES_DB; aqui só criamos o de testes.
CREATE DATABASE kpmg_test OWNER kpmg;
