import { defineConfig } from 'vitest/config';

export default defineConfig({
  // o vite 8 resolve os paths do tsconfig sozinho, sem plugin
  resolve: { tsconfigPaths: true },
  test: {
    globals: true,
    root: './',
    include: ['src/**/*.spec.ts'],
  },
});
