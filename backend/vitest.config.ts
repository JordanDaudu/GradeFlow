import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['test/**/*.spec.ts'],
    testTimeout: 30_000,
    hookTimeout: 60_000,
    pool: 'threads',
    poolOptions: {
      threads: { singleThread: true, minThreads: 1, maxThreads: 1 },
    },
    sequence: { concurrent: false },
    fileParallelism: false,
    reporters: ['default'],
    globalSetup: ['./test/globalSetup.ts'],
  },
  esbuild: {
    target: 'es2022',
  },
});
