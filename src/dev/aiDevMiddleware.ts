import type { Plugin } from 'vite';

/**
 * Plugin de DEV: serve /api/ai durante `npm run dev` (o Vite não executa as
 * Vercel Functions). Reaproveita o mesmo núcleo de api/_ai/index.ts.
 *
 * Lê as chaves dos provedores de process.env (carregadas via loadEnv no
 * vite.config). Em produção, quem responde é a Vercel Function (api/ai.ts).
 *
 * Para remover um provedor, ver api/_ai/REMOCAO.md.
 */
export function aiDevPlugin(): Plugin {
  return {
    name: 'ai-dev-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/ai', (req, res, next) => {
        if (req.method !== 'POST') return next();

        let raw = '';
        req.on('data', (chunk) => (raw += chunk));
        req.on('end', async () => {
          const send = (status: number, payload: unknown) => {
            res.statusCode = status;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(payload));
          };
          try {
            const { runAssistant } = await server.ssrLoadModule('/api/_ai/index.ts');
            const body = raw ? JSON.parse(raw) : {};
            try {
              const result = await runAssistant({
                messages: body.messages,
                code: body.code,
                mode: body.mode,
              });
              send(200, result);
            } catch (err) {
              const e = err as { name?: string; status?: number; message?: string };
              if (e?.name === 'ProviderError' && typeof e.status === 'number') {
                send(e.status, { error: e.message });
              } else {
                send(500, { error: 'Erro interno no Assistente de IA.' });
              }
            }
          } catch {
            send(500, { error: 'Falha ao carregar o núcleo do Assistente de IA.' });
          }
        });
      });
    },
  };
}
