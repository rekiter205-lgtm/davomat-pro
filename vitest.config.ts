import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['tests/**/*.test.ts'],
    globals: true,
    // Dummy values so modules that import `lib/env` load in isolation.
    env: {
      DATABASE_URL: 'postgresql://test:test@localhost:5432/test',
      JWT_SECRET: 'test-secret-that-is-long-enough-32chars!!',
    },
  },
  resolve: {
    alias: { '@': resolve(__dirname, '.') },
  },
});
