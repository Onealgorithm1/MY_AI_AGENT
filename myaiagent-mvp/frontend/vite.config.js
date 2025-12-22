import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig(({ mode }) => {
  // Load env file based on `mode` in the current working directory.
  // Set the third parameter to '' to load all env regardless of the `VITE_` prefix.
  const env = loadEnv(mode, process.cwd(), '');

  console.log('🔧 Vite Config Mode:', mode);
  console.log('🔧 VITE_API_URL:', env.VITE_API_URL);

  // Determine backend target - use local backend if available, otherwise default to local
  const backendTarget = env.VITE_BACKEND_URL || process.env.BACKEND_URL || 'http://localhost:3000';
  console.log('🔧 Backend Target:', backendTarget);

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
      // Proxy to backend (local or production)
      proxy: {
        '/api': {
          target: backendTarget,
          changeOrigin: true,
        },
        '/stt-stream': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
        '/voice': {
          target: backendTarget,
          ws: true,
          changeOrigin: true,
        },
        '/ws': {
          target: backendTarget,
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
