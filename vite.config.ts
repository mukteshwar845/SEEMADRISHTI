import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig} from 'vite';

export default defineConfig(() => {
  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      host: '0.0.0.0',
      port: 3000,
      allowedHosts: true as const,
      proxy: {
        '/api': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/fixtures': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/evidence': {
          target: 'http://127.0.0.1:8000',
          changeOrigin: true,
        },
        '/ws': {
          target: 'ws://127.0.0.1:8000',
          ws: true,
        },
      },
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      hmr: process.env.DISABLE_HMR !== 'true',
      // Disable watching data, sqlite, cv_service and logs to prevent full client reload on DB writes
      watch: process.env.DISABLE_HMR === 'true' ? null : {
        ignored: ['**/data/**', '**/cv_service/**', '**/*.sqlite*', '**/*.log', '**/.system_generated/**'],
      },
    },
  };
});
