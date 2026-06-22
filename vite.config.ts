import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';
// === Assistente IA (remover ao desativar) ===
import { aiDevPlugin } from './src/dev/aiDevMiddleware';
// === fim Assistente IA ===

export default defineConfig(({ mode }) => {
  // === Assistente IA (remover ao desativar) ===
  // Carrega as chaves dos provedores (AI_PROVIDER, TESS_API_KEY, etc.) em process.env para o dev server.
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  // === fim Assistente IA ===

  return {
    base: process.env.GITHUB_ACTIONS ? '/Python-PBIVIZ-Render/' : '/',
    plugins: [
      react(),
      // === Assistente IA (remover ao desativar) ===
      aiDevPlugin(),
      // === fim Assistente IA ===
    ],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
  };
});
