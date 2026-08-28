import { execSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';

// roda uma vez, antes da suite: garante que o banco de teste existe e esta
// na ultima migration. sem isso o primeiro `npm run test:e2e` numa maquina
// nova falha por tabela inexistente.
export default function setup(): void {
  const { parsed } = loadEnv({ path: '.env.test' });
  const databaseUrl = parsed?.DATABASE_URL;

  if (!databaseUrl) {
    throw new Error(
      'Faltou o arquivo .env.test. Copie de .env.test.example antes de rodar os testes e2e.',
    );
  }

  execSync('npx prisma migrate deploy', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: databaseUrl },
  });
}
