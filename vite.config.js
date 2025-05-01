import { defineConfig } from 'vite';
import { resolve } from 'path';

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        background: resolve(__dirname, 'background.js'),
        popup: resolve(__dirname, 'popup.html'),
        'service-worker-loader': resolve(__dirname, 'service-worker-loader.js'),
      },
      output: {
        entryFileNames: '[name].bundle.js',
        chunkFileNames: 'assets/chunk-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    },
    outDir: 'dist',
    sourcemap: true,
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  test: {
    globals: true,
    environment: 'jsdom',
    include: ['**/*.{test,spec}.{js,ts,jsx,tsx}'],
    setupFiles: ['./tests/setup.js'],
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