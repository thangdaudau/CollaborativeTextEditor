import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    reporters: ['verbose'],
    testTimeout: 15000,
    hookTimeout: 15000,
  },
});