import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'
import tailwindcss from '@tailwindcss/vite'

const dirName = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    port: 50260,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:50270',
        changeOrigin: true
      }
    }
  },
  preview: {
    port: 50260
  },
  resolve: {
    alias: {
      '@app': path.resolve(dirName, 'src'),
      '@data': path.resolve(dirName, 'data'),
      '@lib': path.resolve(dirName, 'src/lib')
    }
  },
  css: {
    modules: {
      localsConvention: 'camelCase',
      generateScopedName: '[name]__[local]'
    }
  },
  build: {
    sourcemap: false,
    cssCodeSplit: true,
    chunkSizeWarningLimit: 1000
  }
})
