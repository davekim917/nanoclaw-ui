import path from 'path';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  base: '/ui/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5199,
    proxy: {
      '/api': 'http://localhost:3002',
      '/ws': { target: 'ws://localhost:3002', ws: true },
    },
  },
});
