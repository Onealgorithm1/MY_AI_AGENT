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
      // Only use proxy for local development (not for builderio mode)
      proxy: mode === 'development' ? {
        '/api': {
          target: 'http://localhost:3000',
          changeOrigin: true,
        },
        '/stt-stream': {
          target: 'http://localhost:3000',
          ws: true,
          changeOrigin: true,
        },
        '/voice': {
          target: 'http://localhost:3000',
          ws: true,
          changeOrigin: true,
        },
        '/ws': {
          target: 'http://localhost:3000',
          ws: true,
          changeOrigin: true,
        },
      } : undefined,
    },
    build: {
      outDir: 'dist',
      sourcemap: true,
    },
  };
});
