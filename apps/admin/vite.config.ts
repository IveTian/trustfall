import { fileURLToPath } from 'node:url';
import stylex from '@stylexjs/unplugin';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const workspaceRoot = fileURLToPath(new URL('../..', import.meta.url));

export default defineConfig({
  base: '/admin/',
  plugins: [
    stylex.vite({
      useCSSLayers: true,
      unstable_moduleResolution: {
        type: 'commonJS',
        rootDir: workspaceRoot,
      },
    }),
    react(),
  ],
  resolve: {
    dedupe: ['react', 'react-dom'],
  },
  build: {
    outDir: '../web/public/admin',
    emptyOutDir: true,
  },
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:4321',
    },
  },
});
