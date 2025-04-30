/// <reference types="vitest" />
import { defineConfig } from 'vitest/config'
import { resolve } from 'path'

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./tests/setup.js'],
    globals: true,
    include: ['src/tests/**/*.test.{js,ts}', 'tests/**/*.test.{js,ts}'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/e2e/**',
      '**/merged-extension/**',
      '**/chrome-extensions-samples/**'
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/**',
        'tests/',
        '**/*.d.ts',
        '**/*.test.ts',
        '**/*.test.js',
        '**/dist/**',
        '**/e2e/**'
      ],
      all: true,
      clean: true,
      cleanOnRerun: true,
      skipFull: false,
      enabled: false
    },
    deps: {
      inline: [/@vitest/, /webextension-polyfill/]
    },
    testTimeout: 30000,
    environmentOptions: {
      jsdom: {
        resources: 'usable'
      }
    }
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src')
    }
  }
}) 