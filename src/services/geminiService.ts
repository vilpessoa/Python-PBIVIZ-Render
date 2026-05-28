import { stripCodeFences } from '@/lib/extractCode';

export type AiAction = 'refactor' | 'indent' | 'comment' | 'fix';

export type AiError =
  | { kind: 'rate_minute' }
  | { kind: 'rate_daily' }
  | { kind: 'auth' }
  | { kind: 'network' }
  | { kind: 'empty' }
  | { kind: 'config' }
  | { kind: 'unknown'; message: string };

const ACTION_CONTEXT: Record<AiAction, string> = {
  refactor:
    'Refatore o seguinte código Python buscando performance, elimine redundâncias e use list comprehensions onde aplicável.',
  indent:
    'Apenas aplique quebras de linha e indentação adequadas conforme PEP 8 (4 espaços por nível).',
  comment:
    'Adicione comentários inline explicativos usando # mapeando os blocos funcionais do código Python.',
  fix:
    'Verifique possíveis erros de sintaxe, variáveis não definidas ou indentação incorreta e conserte-os.',
};

const SYSTEM_PROMPT = `Você é um analista sênior de Python especializado em geração de HTML dinâmico.
Retorne SOMENTE o código Python corrigido/melhorado em um bloco markdown \`\`\`python ... \`\`\`.
Sem explicações adicionais. Preserve a lógica original. Use PEP 8.`;

const MODEL = 'gemini-2.0-flash';
const TIMEOUT_MS = 15_000;

export async function runAiAction(opts: { action: AiAction; code: string }): Promise<string> {
  const { action, code } = opts;

  if (!code.trim()) {
    throw { kind: 'empty' } satisfies AiError;
  }

  const apiKey = import.meta.env.VITE_GEMINI_API_KEY as string | undefined;
  if (!apiKey) {
    throw { kind: 'config' } satisfies AiError;
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${apiKey}`;

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), TIMEOUT_MS);

  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents: [
          {
            role: 'user',
            parts: [{ text: `${ACTION_CONTEXT[action]}\n\nCódigo:\n${code}` }],
          },
        ],
      }),
      signal: controller.signal,
    });
  } catch {
    window.clearTimeout(timeoutId);
    throw { kind: 'network' } satisfies AiError;
  }
  window.clearTimeout(timeoutId);

  if (!response.ok) {
    const status = response.status;
    if (status === 429) {
      let errorText = '';
      try { errorText = await response.text(); } catch { /* ignore */ }
      const scope = /per day|daily/i.test(errorText) ? 'rate_daily' : 'rate_minute';
      throw { kind: scope } satisfies AiError;
    }
    if (status === 401 || status === 403) {
      throw { kind: 'auth' } satisfies AiError;
    }
    let message = `HTTP ${status}`;
    try {
      const body = await response.json();
      if (body?.error?.message) message = String(body.error.message);
    } catch { /* ignore */ }
    throw { kind: 'unknown', message } satisfies AiError;
  }

  let data: { candidates?: { content?: { parts?: { text?: string }[] } }[] };
  try {
    data = await response.json();
  } catch {
    throw { kind: 'unknown', message: 'Resposta inválida da API.' } satisfies AiError;
  }

  const raw =
    data?.candidates?.[0]?.content?.parts
      ?.map((p) => p.text ?? '')
      .join('') ?? '';

  return stripCodeFences(raw);
}
