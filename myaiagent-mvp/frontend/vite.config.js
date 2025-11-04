import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    host: '0.0.0.0',
    port: 5000,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/planka-ui': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/build': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/favicons': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/user-avatars': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      '/background-images': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
  },
});
