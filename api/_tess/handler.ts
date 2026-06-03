/**
 * Núcleo do Assistente TESS — agnóstico de framework.
 * Reutilizado pela Vercel Function (api/tess.ts) e pelo dev server local
 * (src/dev/tessDevMiddleware.ts).
 *
 * A chave (TESS_API_KEY) e o agente (TESS_AGENT_ID) vivem SOMENTE no servidor.
 *
 * Estratégia de edição: a TESS responde com blocos de busca-e-substituição
 * (SEARCH/REPLACE), não com o arquivo inteiro. O servidor aplica o patch sobre
 * o código original — assim arquivos grandes funcionam e nada é apagado por
 * engano. Ver system-prompt.ts (SEARCH_REPLACE_SPEC).
 */
import { buildSystemPrompt, type TessMode } from './system-prompt.js';

const TESS_BASE_URL = 'https://tess.pareto.io/api';
// Cada chamada tem seu próprio timeout para caber dentro do maxDuration=60s.
const CALL_TIMEOUT_MS = 24_000; // 24s por tentativa → 2 tentativas = 48s < 60s

export interface TessChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RunTessOptions {
  messages: TessChatMessage[];
  code: string;
  mode?: TessMode;
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

// ─── Parsing de blocos SEARCH/REPLACE ─────────────────────────────────────────

interface EditBlock {
  search: string;
  replace: string;
}

/** Remove linhas em branco no começo/fim de um trecho. */
function trimBlankEdges(s: string): string {
  return s.replace(/^\n+/, '').replace(/\n+$/, '');
}

/**
 * Extrai blocos no formato:
 *   <<<<<<< BUSCAR
 *   ...
 *   =======
 *   ...
 *   >>>>>>> SUBSTITUIR
 * Tolera variações no número de marcadores e espaços.
 */
function parseEditBlocks(text: string): EditBlock[] {
  const re = /<{5,9}\s*BUSCAR[^\n]*\n([\s\S]*?)\n={5,9}[^\n]*\n([\s\S]*?)\n>{5,9}\s*SUBSTITUIR/gi;
  const blocks: EditBlock[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push({ search: trimBlankEdges(m[1]), replace: trimBlankEdges(m[2]) });
  }
  return blocks;
}

/** Extrai o conteúdo de um bloco ```python ... ``` (fallback de arquivo inteiro). */
function extractFullCodeBlock(text: string): string | null {
  const fenced = text.match(/```(?:python|py)?\s*\n([\s\S]*?)\n```/i);
  if (fenced) return fenced[1].trim();
  return null;
}

/**
 * Localiza, por linhas, onde `searchLines` aparece em `codeLines`.
 * Compara ignorando espaços à direita (mais tolerante). Retorna o índice da
 * primeira linha do match, ou -1.
 */
function locate(codeLines: string[], searchLines: string[]): number {
  if (searchLines.length === 0) return -1;
  const last = codeLines.length - searchLines.length;
  for (let start = 0; start <= last; start++) {
    let ok = true;
    for (let k = 0; k < searchLines.length; k++) {
      if (codeLines[start + k].replace(/\s+$/, '') !== searchLines[k].replace(/\s+$/, '')) {
        ok = false;
        break;
      }
    }
    if (ok) return start;
  }
  return -1;
}

/** Aplica os blocos sobre o código original. Retorna o código novo e os que falharam. */
function applyEditBlocks(original: string, blocks: EditBlock[]): { code: string; failed: EditBlock[] } {
  let lines = original.split('\n');
  const failed: EditBlock[] = [];
  for (const b of blocks) {
    if (!b.search) {
      failed.push(b);
      continue;
    }
    const searchLines = b.search.split('\n');
    const at = locate(lines, searchLines);
    if (at === -1) {
      failed.push(b);
      continue;
    }
    const replaceLines = b.replace.split('\n');
    lines = [...lines.slice(0, at), ...replaceLines, ...lines.slice(at + searchLines.length)];
  }
  return { code: lines.join('\n'), failed };
}

// ─── Leitura da resposta da TESS ──────────────────────────────────────────────

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

// ─── Chamada HTTP ─────────────────────────────────────────────────────────────

/** Uma chamada à API da TESS com timeout individual. Retorna o texto bruto da resposta. */
async function callTess(
  agentId: string,
  apiKey: string,
  messages: TessChatMessage[],
  mode: TessMode,
): Promise<string> {
  const body = {
    temperature: '0.5',
    messages: [{ role: 'system', content: buildSystemPrompt(mode) }, ...messages],
    waitExecution: true,
  };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALL_TIMEOUT_MS);

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
  return reply;
}

// ─── Orquestração ─────────────────────────────────────────────────────────────

/** Monta a mensagem do usuário com o código atual anexado como contexto. */
function withCodeContext(content: string, code: string): string {
  const lineCount = (code ?? '').split('\n').length;
  return `${content}\n\n---\nCÓDIGO ATUAL DO EDITOR (${lineCount} linhas) — use-o como base para os blocos BUSCAR:\n\`\`\`python\n${code ?? ''}\n\`\`\``;
}

/**
 * Converte a resposta da TESS em código novo aplicando os blocos sobre o
 * original. Retorna `code: null` se não houver edição aplicável.
 */
function buildResult(reply: string, original: string): { result: RunTessResult; failed: EditBlock[] } {
  const blocks = parseEditBlocks(reply);

  if (blocks.length > 0) {
    const { code, failed } = applyEditBlocks(original, blocks);
    // Só consideramos "alterado" se algum bloco aplicou.
    const changed = failed.length < blocks.length && code !== original;
    return { result: { reply, code: changed ? code : null }, failed };
  }

  // Fallback: a TESS devolveu o arquivo inteiro num bloco ```python```.
  const full = extractFullCodeBlock(reply);
  if (full != null && full !== original) {
    return { result: { reply, code: full }, failed: [] };
  }

  return { result: { reply, code: null }, failed: [] };
}

export async function runTess(opts: RunTessOptions): Promise<RunTessResult> {
  const { messages, code, mode = 'edit', apiKey, agentId } = opts;

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
      apiMessages[i] = { role: 'user', content: withCodeContext(apiMessages[i].content, code) };
      break;
    }
  }

  // ── Primeira chamada ──────────────────────────────────────────────────────
  const firstReply = await callTess(agentId, apiKey, apiMessages, mode);

  // Modo conversacional: nada a aplicar.
  if (mode === 'ask') {
    return { reply: firstReply, code: null };
  }

  const { result, failed } = buildResult(firstReply, code);

  // Sucesso (todos ou parte dos blocos aplicaram) ou fallback de arquivo inteiro.
  if (result.code != null && failed.length === 0) {
    return result;
  }

  // ── Retry: algum bloco BUSCAR não bateu com o código atual ──────────────────
  // Reenviamos o código (a TESS não retém contexto entre execuções) e pedimos
  // que recopie os trechos exatamente.
  const failedSnippets = failed
    .map((b, i) => `Bloco ${i + 1} — BUSCAR não encontrado:\n${b.search}`)
    .join('\n\n');

  const retryMessages: TessChatMessage[] = [
    ...apiMessages,
    { role: 'assistant', content: firstReply },
    {
      role: 'user',
      content: withCodeContext(
        `Alguns blocos de edição NÃO foram localizados no código (o trecho BUSCAR precisa ser uma cópia EXATA do código atual). ` +
          `Refaça SOMENTE esses blocos, copiando o trecho BUSCAR caractere por caractere do código abaixo e incluindo mais linhas de contexto.\n\n${failedSnippets}`,
        code,
      ),
    },
  ];

  const retryReply = await callTess(agentId, apiKey, retryMessages, mode);
  const retry = buildResult(retryReply, code);

  // Se o retry aplicou algo, usa-o; senão devolve a 1ª resposta (parcial ou nula).
  if (retry.result.code != null) {
    return retry.result;
  }
  return result;
}
