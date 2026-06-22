/**
 * Vercel Serverless Function — endpoint /api/ai.
 * Recebe { messages, code, mode } do navegador e delega para o núcleo
 * runAssistant, que resolve o provedor ativo (AI_PROVIDER) e injeta a chave
 * do servidor. As chaves NUNCA chegam ao cliente.
 */
import type { VercelRequest, VercelResponse } from '@vercel/node';
import { runAssistant, ProviderError } from './_ai/index.js';

// Tempo máximo de execução da função (segundos). Necessário porque a chamada ao
// provedor (ex.: TESS com wait_execution=true) é síncrona e pode demorar. 60s é o
// teto do plano Hobby.
export const maxDuration = 60;

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Método não permitido.' });
    return;
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body ?? {};
    const { messages, code, mode } = body;

    const result = await runAssistant({ messages, code, mode });

    res.status(200).json(result);
  } catch (err) {
    if (err instanceof ProviderError) {
      res.status(err.status).json({ error: err.message });
      return;
    }
    const detail = err instanceof Error ? err.message : String(err);
    res.status(500).json({ error: `Erro interno no Assistente de IA: ${detail}` });
  }
}
