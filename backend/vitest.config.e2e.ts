import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['**/*.e2e-spec.ts'],
    globalSetup: ['./test/setup-e2e.ts'],
    // manda o AppModule ler o .env.test, que aponta pro banco separado
    env: { NODE_ENV: 'test' },
    // os casos compartilham a mesma tabela, entao rodam em serie
    fileParallelism: false,
  },
});
