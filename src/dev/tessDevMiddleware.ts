import type { Plugin } from 'vite';

/**
 * Plugin de DEV: serve /api/tess durante `npm run dev` (o Vite não executa as
 * Vercel Functions). Reaproveita o mesmo núcleo de api/_tess/handler.ts.
 *
 * Lê TESS_API_KEY / TESS_AGENT_ID de process.env (carregados via loadEnv no
 * vite.config). Em produção, quem responde é a Vercel Function (api/tess.ts).
 *
 * Para remover o Assistente TESS, ver api/_tess/REMOCAO.md.
 */
export function tessDevPlugin(): Plugin {
  return {
    name: 'tess-dev-middleware',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api/tess', (req, res, next) => {
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
            const { runTess } = await server.ssrLoadModule('/api/_tess/handler.ts');
            const body = raw ? JSON.parse(raw) : {};
            try {
              const result = await runTess({
                messages: body.messages,
                code: body.code,
                apiKey: process.env.TESS_API_KEY,
                agentId: process.env.TESS_AGENT_ID,
              });
              send(200, result);
            } catch (err) {
              const e = err as { name?: string; status?: number; message?: string };
              if (e?.name === 'TessError' && typeof e.status === 'number') {
                send(e.status, { error: e.message });
              } else {
                send(500, { error: 'Erro interno no Assistente TESS.' });
              }
            }
          } catch {
            send(500, { error: 'Falha ao carregar o handler da TESS.' });
          }
        });
      });
    },
  };
}
