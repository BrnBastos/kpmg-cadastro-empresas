import { execSync } from 'node:child_process';
import { config as loadEnv } from 'dotenv';

// Aplica as migrations antes da suíte. Sem isto, o primeiro `npm run test:e2e`
// numa máquina nova falha por tabela inexistente.
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
