import { defineConfig } from 'vite';

export default defineConfig(({ command }) => ({
  base: command === 'serve' ? '/' : '/ui/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    host: true,
    port: 5173,
    proxy: {
      '/api': 'http://localhost:3002',
      '/ws': {
        target: 'http://localhost:3002',
        ws: true,
      },
    },
  },
}));
