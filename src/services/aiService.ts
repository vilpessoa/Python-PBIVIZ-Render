import type { TessChatMessage, TessMode } from '@/components/ai/tess/types';

export interface AssistantReply {
  reply: string;
  code: string | null;
}

/**
 * Cliente do Assistente de IA: chama a função serverless /api/ai.
 * A chave da API fica no servidor — aqui só trafegam mensagens e código.
 * O provedor de LLM ativo é definido no servidor pela env AI_PROVIDER.
 */
export async function sendAssistantMessage(opts: {
  messages: TessChatMessage[];
  code: string;
  mode: TessMode;
  signal?: AbortSignal;
}): Promise<AssistantReply> {
  const res = await fetch('/api/ai', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: opts.messages, code: opts.code, mode: opts.mode }),
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

  return (await res.json()) as AssistantReply;
}
