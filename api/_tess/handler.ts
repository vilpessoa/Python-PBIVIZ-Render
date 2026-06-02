/**
 * Núcleo do Assistente TESS — agnóstico de framework.
 * Reutilizado pela Vercel Function (api/tess.ts) e pelo dev server local
 * (src/dev/tessDevMiddleware.ts).
 *
 * A chave (TESS_API_KEY) e o agente (TESS_AGENT_ID) vivem SOMENTE no servidor.
 */
import { TESS_SYSTEM_PROMPT } from './system-prompt.js';

const TESS_BASE_URL = 'https://tess.pareto.io/api';
// Abaixo do maxDuration da função (60s) para devolver erro limpo antes do timeout da plataforma.
const TIMEOUT_MS = 55_000;

export interface TessChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RunTessOptions {
  messages: TessChatMessage[];
  code: string;
  apiKey?: string;
  agentId?: string;
}

export interface RunTessResult {
  reply: string;
  code: string | null;
}

/** Erro com `status` HTTP para o chamador mapear a resposta. */
export class TessError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'TessError';
  }
}

/** Extrai o conteúdo de um bloco ```python ... ``` (ou o primeiro bloco de código). */
function extractCodeBlock(text: string): string | null {
  const fenced = text.match(/```(?:python|py)?\s*\n([\s\S]*?)\n```/i);
  if (fenced) return fenced[1].trim();
  return null;
}

/** Lê o texto de saída da execução da TESS de forma defensiva (formato varia). */
function readOutput(data: unknown): string {
  const d = data as Record<string, any>;
  const candidates = [
    d?.responses?.[0]?.output,
    d?.responses?.[0]?.content,
    d?.response?.output,
    d?.output,
    d?.message?.content,
    d?.message,
    d?.choices?.[0]?.message?.content,
  ];
  for (const c of candidates) {
    if (typeof c === 'string' && c.trim()) return c;
  }
  return '';
}

export async function runTess(opts: RunTessOptions): Promise<RunTessResult> {
  const { messages, code, apiKey, agentId } = opts;

  if (!apiKey || !agentId) {
    throw new TessError(503, 'Assistente TESS não configurado no servidor (TESS_API_KEY / TESS_AGENT_ID).');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new TessError(400, 'Nenhuma mensagem enviada.');
  }

  // Injeta o código atual do editor no último turno do usuário.
  const apiMessages: TessChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let i = apiMessages.length - 1; i >= 0; i--) {
    if (apiMessages[i].role === 'user') {
      apiMessages[i] = {
        role: 'user',
        content:
          `${apiMessages[i].content}\n\n---\nCÓDIGO ATUAL DO EDITOR:\n\`\`\`python\n${code ?? ''}\n\`\`\``,
      };
      break;
    }
  }

  const body = {
    // A TESS aceita apenas: 0, 0.25, 0.5, 0.75, 1.
    temperature: '0.5',
    messages: [{ role: 'system', content: TESS_SYSTEM_PROMPT }, ...apiMessages],
    waitExecution: true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(`${TESS_BASE_URL}/agents/${agentId}/execute?wait_execution=true`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
  } catch {
    clearTimeout(timeout);
    throw new TessError(504, 'Falha de rede ao contatar a TESS (timeout).');
  }
  clearTimeout(timeout);

  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const errBody = await res.json();
      if (errBody?.message) detail = String(errBody.message);
      else if (errBody?.error) detail = String(errBody.error);
    } catch {
      /* ignora */
    }
    if (res.status === 401 || res.status === 403) {
      throw new TessError(res.status, 'Autenticação TESS inválida. Verifique TESS_API_KEY/TESS_AGENT_ID.');
    }
    if (res.status === 429) {
      throw new TessError(429, 'Limite de requisições da TESS atingido. Aguarde e tente novamente.');
    }
    throw new TessError(res.status >= 500 ? 502 : 400, detail);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new TessError(502, 'Resposta inválida da TESS.');
  }

  const reply = readOutput(data).trim();
  if (!reply) {
    throw new TessError(502, 'A TESS não retornou conteúdo.');
  }

  return { reply, code: extractCodeBlock(reply) };
}
