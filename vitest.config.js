import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    include: [
      'src/tests/**/*.test.{js,ts}',
      'e2e/**/*.test.js'
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/merged-extension/**',
      '**/chrome-extensions-samples/**'
    ],
    environment: 'jsdom',
    setupFiles: ['./jest.setup.js'],
    globals: true,
    testTimeout: 60000,
    hookTimeout: 60000,
    environmentOptions: {
      jsdom: {
        resources: 'usable',
        runScripts: 'dangerously'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  }
}); 