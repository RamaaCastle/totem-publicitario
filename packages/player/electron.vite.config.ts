import { defineConfig, externalizeDepsPlugin } from 'electron-vite';
import react from '@vitejs/plugin-react';
import { join } from 'path';

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
  },
  renderer: {
    root: join(__dirname, 'src/renderer'),
    build: {
      outDir: 'out/renderer',
    },
    plugins: [react()],
    resolve: {
      alias: { '@': join(__dirname, 'src/renderer') },
    },
  },
});
