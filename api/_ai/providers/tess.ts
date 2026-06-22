/**
 * Provedor TESS (enterprise) — transporte HTTP para o agente da Tess AI.
 *
 * A chave (TESS_API_KEY) e o agente (TESS_AGENT_ID) vivem SOMENTE no servidor.
 *
 * Este arquivo é a ÚNICA parte específica da TESS. Para remover o provedor:
 *   1. apague este arquivo;
 *   2. remova a linha de registro em ../registry.ts;
 *   3. limpe TESS_API_KEY / TESS_AGENT_ID das envs.
 * O motor de edição e os demais provedores continuam funcionando. Ver REMOCAO.md.
 */
import { ProviderError, type ChatInput, type ChatMessage, type LLMProvider } from '../types.js';

const TESS_BASE_URL = 'https://tess.pareto.io/api';
const CALL_TIMEOUT_MS = 50_000; // 50s — cabe no maxDuration=60s da Vercel para chamada única

/** Lê o texto da resposta da TESS, tolerando variações de formato. */
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

async function callTess(
  agentId: string,
  apiKey: string,
  messages: ChatMessage[],
  systemPrompt: string,
  timeoutMs = CALL_TIMEOUT_MS,
): Promise<string> {
  const body = {
    temperature: '0.5',
    messages: [{ role: 'system', content: systemPrompt }, ...messages],
    waitExecution: true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

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
    throw new ProviderError(504, 'Falha de rede ao contatar a TESS (timeout).');
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
      throw new ProviderError(res.status, 'Autenticação TESS inválida. Verifique TESS_API_KEY/TESS_AGENT_ID.');
    }
    if (res.status === 429) {
      throw new ProviderError(429, 'Limite de requisições da TESS atingido. Aguarde e tente novamente.');
    }
    throw new ProviderError(res.status >= 500 ? 502 : 400, detail);
  }

  let data: unknown;
  try {
    data = await res.json();
  } catch {
    throw new ProviderError(502, 'Resposta inválida da TESS.');
  }

  const reply = readOutput(data).trim();
  if (!reply) {
    throw new ProviderError(502, 'A TESS não retornou conteúdo.');
  }
  return reply;
}

export const tessProvider: LLMProvider = {
  id: 'tess',
  label: 'Tess AI',
  ensureConfigured() {
    if (!process.env.TESS_API_KEY || !process.env.TESS_AGENT_ID) {
      throw new ProviderError(503, 'Assistente TESS não configurado no servidor (TESS_API_KEY / TESS_AGENT_ID).');
    }
  },
  async chat({ systemPrompt, messages, timeoutMs }: ChatInput): Promise<string> {
    return callTess(
      process.env.TESS_AGENT_ID!,
      process.env.TESS_API_KEY!,
      messages,
      systemPrompt,
      timeoutMs,
    );
  },
};
