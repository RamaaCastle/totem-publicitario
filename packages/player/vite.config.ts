import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { join, resolve } from 'path';
import { fileURLToPath } from 'url';

const dir = typeof __dirname !== 'undefined'
  ? __dirname
  : fileURLToPath(new URL('.', import.meta.url));

export default defineConfig({
  plugins: [react()],
  base: process.env.VITE_BASE_PATH || '/',
  root: join(dir, 'src/renderer'),
  build: {
    outDir: join(dir, 'dist/renderer'),
    emptyOutDir: true,
  },
  server: {
    port: 5173,
  },
  resolve: {
    alias: { '@': join(dir, 'src/renderer') },
  },
});
