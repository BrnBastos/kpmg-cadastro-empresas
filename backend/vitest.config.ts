import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
    // Ordem aleatória a cada execução: se um teste depender de outro, quebra.
    sequence: { shuffle: true },
    coverage: {
      provider: 'v8',
      reporter: ['text-summary', 'lcov'],
      include: ['src/**/*.ts'],
      exclude: [
        // Client gerado pelo Prisma.
        'src/generated/**',
        '**/*.spec.ts',
        // Bootstrap e declaração de módulos: exercitados pelos testes e2e,
        // que sobem a aplicação inteira.
        'src/main.ts',
        'src/**/*.module.ts',
      ],
    },
  },
});
