import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['test/**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup-e2e.ts'],
    // Faz o AppModule ler o .env.test, que aponta para o banco separado.
    env: { NODE_ENV: 'test' },
    // Os casos compartilham a mesma tabela, então rodam em série.
    fileParallelism: false,
    sequence: { shuffle: true },
  },
});
