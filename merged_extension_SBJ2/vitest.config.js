import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
    test: {
        environment: 'jsdom',
        globals: true,
        setupFiles: [resolve(__dirname, './tests/setup.js')],
        alias: {
            'webextension-polyfill': resolve(__dirname, './tests/mocks/webextension-polyfill.js')
        },
        coverage: {
            reporter: ['text', 'json', 'html'],
            exclude: [
                'node_modules/',
                'tests/',
                '**/*.d.ts',
                '**/*.test.js',
                '**/*.spec.js'
            ]
        }
    }
}); 