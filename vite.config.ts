import { defineConfig } from 'vite';

export default defineConfig({
  base: '/ui/',
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
  },
});
