/**
 * Vercel Serverless Function — endpoint /api/tess.
 * Recebe { messages, code } do navegador, injeta a chave do servidor e
 * delega para o núcleo runTess. A chave NUNCA chega ao cliente.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runTess, TessError } from './_tess/handler.js';

// Tempo máximo de execução da função (segundos). Necessário porque a chamada à
// TESS com wait_execution=true é síncrona e pode demorar. 60s é o teto do Hobby.
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const { messages, code, mode } = body;

    const result = await runTess({
      messages,
      code,
      mode,
      apiKey: process.env.TESS_API_KEY,
      agentId: process.env.TESS_AGENT_ID,
    });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof TessError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const detail = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Erro interno no Assistente TESS: ${detail}` });
  }
}
