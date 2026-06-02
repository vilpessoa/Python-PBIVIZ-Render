import type { TessChatMessage } from '@/components/ai/tess/types';

export interface TessReply {
  reply: string;
  code: string | null;
}

/**
 * Cliente do Assistente TESS: chama a função serverless /api/tess.
 * A chave da API fica no servidor — aqui só trafegam mensagens e código.
 */
export async function sendTessMessage(opts: {
  messages: TessChatMessage[];
  code: string;
  signal?: AbortSignal;
}): Promise<TessReply> {
  const res = await fetch('/api/tess', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: opts.messages, code: opts.code }),
    signal: opts.signal,
  });

  if (!res.ok) {
    let message = `Erro ${res.status}`;
    try {
      const body = await res.json();
      if (body?.error) message = String(body.error);
    } catch {
      /* ignora */
    }
    throw new Error(message);
  }

  return (await res.json()) as TessReply;
}
