import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      // Alias @/ → src/ dla wygody importów
      '@': path.resolve(__dirname, './src'),
      // Aliias dla packages/shared — bezpośrednio z TypeScript source
      '@np-manager/shared': path.resolve(__dirname, '../../packages/shared/src/index.ts'),
    },
  },
  server: {
    port: 5173,
    // Proxy API calls do backendu — unika problemów z CORS w dev
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
})
