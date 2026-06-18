import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// === TESS (remover ao desativar) ===
import { tessDevPlugin } from './src/dev/tessDevMiddleware';
// === fim TESS ===

export default defineConfig(({ mode }) => {
  // === TESS (remover ao desativar) ===
  // Carrega TESS_API_KEY / TESS_AGENT_ID (e demais vars) em process.env para o dev server.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  // === fim TESS ===

  return {
    base: process.env.GITHUB_ACTIONS ? '/Python-PBIVIZ-Render/' : '/',
    plugins: [
      react(),
      // === TESS (remover ao desativar) ===
      tessDevPlugin(),
      // === fim TESS ===
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
