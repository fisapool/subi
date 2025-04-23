import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'
import { crx } from '@crxjs/vite-plugin'
import manifest from './manifest.config'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    vue(),
    crx({ manifest })
  ],
  server: {
    watch: {
      ignored: [
        '**/dist/**',
        '**/node_modules/**',
        '**/.git/**',
        '**/build/**',
        '**/*.hot-update.*'
      ]
    },
    hmr: {
      // Disable HMR for Chrome extension development to prevent reload loops
      overlay: false
    }
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    // Prevent source maps in production to reduce file size
    sourcemap: process.env.NODE_ENV === 'development',
    // Optimize chunk size for extension
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: {
        popup: resolve(__dirname, 'src/popup.html'),
        main: resolve(__dirname, 'src/main.html'),
        'session-buddy': resolve(__dirname, 'src/session-buddy.html'),
        settings: resolve(__dirname, 'src/settings.html'),
        dashboard: resolve(__dirname, 'src/dashboard.html')
      },
      output: {
        entryFileNames: 'assets/[name]-[hash].js',
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const name = assetInfo.name || ''
          if (name.endsWith('.css')) {
            return 'assets/[name].[ext]'  // Keep CSS filenames consistent
          }
          if (name.endsWith('.png') || name.endsWith('.jpg') || name.endsWith('.ico')) {
            return 'assets/[name].[ext]'
          }
          return 'assets/[name]-[hash].[ext]'
        }
      }
    }
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  // Optimize for Chrome extension development
  optimizeDeps: {
    exclude: ['chrome']
  }
}) 