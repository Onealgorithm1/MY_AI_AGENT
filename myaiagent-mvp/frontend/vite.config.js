import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  console.log('🔧 Vite Config Mode:', mode);
  console.log('🔧 VITE_API_URL:', env.VITE_API_URL);

  return {
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
      // Proxy to werkules.com backend (EC2)
      proxy: {
        '/api': {
          target: 'https://werkules.com',
          changeOrigin: true,
        },
        '/stt-stream': {
          target: 'https://werkules.com',
          ws: true,
          changeOrigin: true,
        },
        '/voice': {
          target: 'https://werkules.com',
          ws: true,
          changeOrigin: true,
        },
        '/ws': {
          target: 'https://werkules.com',
          ws: true,
          changeOrigin: true,
        },
      },
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
