/**
 * Núcleo do Assistente TESS — agnóstico de framework.
 * Reutilizado pela Vercel Function (api/tess.ts) e pelo dev server local
 * (src/dev/tessDevMiddleware.ts).
 *
 * A chave (TESS_API_KEY) e o agente (TESS_AGENT_ID) vivem SOMENTE no servidor.
 *
 * ESTRATÉGIA DE EDIÇÃO (importante):
 * O editor avalia "Python pragmático" — basicamente `var = expr`, `var += expr`
 * e `return expr`. Em arquivos grandes (1000+ linhas) o agente NÃO consegue
 * reproduzir o arquivo inteiro; ele devolve apenas as ATRIBUIÇÕES que mudaram.
 * Por isso o servidor faz MERGE por nome de variável: cada atribuição devolvida
 * substitui a variável correspondente no código original (ou é inserida antes do
 * return, se for nova). Assim nada é apagado por engano.
 *
 * Também aceitamos blocos SEARCH/REPLACE e, como último recurso, um arquivo
 * inteiro (quando vier grande o suficiente).
 */
import { buildSystemPrompt, type TessMode } from './system-prompt.js';

const TESS_BASE_URL = 'https://tess.pareto.io/api';
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

// ─── Tokenização em statements de topo ────────────────────────────────────────

interface Stmt {
  name: string | null; // nome da variável atribuída (lado esquerdo), se houver
  isReturn: boolean;
  text: string;
}

/** Atualiza o estado de string/colchetes ao varrer uma linha. */
function scanLine(line: string, inTriple: string | null, depth: number): { inTriple: string | null; depth: number } {
  let i = 0;
  let inString: string | null = null; // ' ou " de linha única
  while (i < line.length) {
    const three = line.slice(i, i + 3);
    if (inTriple) {
      if (three === inTriple) { inTriple = null; i += 3; continue; }
      i++; continue;
    }
    if (inString) {
      if (line[i] === '\\') { i += 2; continue; }
      if (line[i] === inString) { inString = null; }
      i++; continue;
    }
    if (three === '"""' || three === "'''") { inTriple = three; i += 3; continue; }
    const ch = line[i];
    if (ch === '"' || ch === "'") { inString = ch; i++; continue; }
    if (ch === '#') break; // comentário até o fim da linha
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth = Math.max(0, depth - 1);
    i++;
  }
  // Strings de linha única não atravessam linhas em código bem-formado.
  return { inTriple, depth };
}

/**
 * Quebra o código em statements de topo. Uma nova statement começa numa linha
 * sem indentação, quando NÃO estamos dentro de uma triple-string nem de
 * colchetes/parênteses abertos (assim valores multi-linha ficam juntos).
 */
function splitStatements(code: string): Stmt[] {
  const lines = code.split('\n');
  const groups: string[][] = [];
  let cur: string[] | null = null;
  let inTriple: string | null = null;
  let depth = 0;

  for (const line of lines) {
    const atTopLevel = inTriple === null && depth === 0 && /^\S/.test(line);
    if (cur !== null && atTopLevel) {
      groups.push(cur);
      cur = [];
    }
    if (cur === null) cur = [];
    cur.push(line);
    ({ inTriple, depth } = scanLine(line, inTriple, depth));
  }
  if (cur && cur.length) groups.push(cur);

  return groups.map((g) => {
    const text = g.join('\n');
    const first = (g.find((l) => l.trim()) ?? '').trim();
    const m = first.match(/^([A-Za-z_]\w*)\s*\+?=(?!=)/);
    const isReturn = /^return\b/.test(first);
    return { name: m ? m[1] : null, isReturn, text };
  });
}

/**
 * Faz o merge das atribuições do `snippet` sobre o `original`:
 * - variável já existente → substitui o statement inteiro;
 * - return → substitui o return existente;
 * - variável nova → insere antes do return (ou no fim).
 */
function mergeSnippet(original: string, snippet: string): string {
  const orig = splitStatements(original);
  const snip = splitStatements(snippet).filter((s) => s.name || s.isReturn);
  if (snip.length === 0) return original;

  const nameToIdx = new Map<string, number>();
  let returnIdx = -1;
  orig.forEach((s, i) => {
    if (s.isReturn && returnIdx === -1) returnIdx = i;
    if (s.name && !nameToIdx.has(s.name)) nameToIdx.set(s.name, i);
  });

  const additions: Stmt[] = [];
  for (const s of snip) {
    if (s.isReturn) {
      if (returnIdx >= 0) orig[returnIdx] = s;
      else additions.push(s);
    } else if (s.name && nameToIdx.has(s.name)) {
      orig[nameToIdx.get(s.name)!] = s;
    } else {
      additions.push(s);
    }
  }

  let result = orig;
  if (additions.length) {
    const ri = result.findIndex((s) => s.isReturn);
    const at = ri >= 0 ? ri : result.length;
    result = [...result.slice(0, at), ...additions, ...result.slice(at)];
  }
  return result.map((s) => s.text).join('\n');
}

// ─── Parsing de blocos SEARCH/REPLACE ─────────────────────────────────────────

interface EditBlock {
  search: string;
  replace: string;
}

function trimBlankEdges(s: string): string {
  return s.replace(/^\n+/, '').replace(/\n+$/, '');
}

function parseEditBlocks(text: string): EditBlock[] {
  const re = /<{5,9}\s*BUSCAR[^\n]*\n([\s\S]*?)\n={5,9}[^\n]*\n([\s\S]*?)\n>{5,9}\s*SUBSTITUIR/gi;
  const blocks: EditBlock[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    blocks.push({ search: trimBlankEdges(m[1]), replace: trimBlankEdges(m[2]) });
  }
  return blocks;
}

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

function applyEditBlocks(original: string, blocks: EditBlock[]): { code: string; failed: EditBlock[] } {
  let lines = original.split('\n');
  const failed: EditBlock[] = [];
  for (const b of blocks) {
    if (!b.search) { failed.push(b); continue; }
    const searchLines = b.search.split('\n');
    const at = locate(lines, searchLines);
    if (at === -1) { failed.push(b); continue; }
    const replaceLines = b.replace.split('\n');
    lines = [...lines.slice(0, at), ...replaceLines, ...lines.slice(at + searchLines.length)];
  }
  return { code: lines.join('\n'), failed };
}

/** Extrai o conteúdo de um bloco ```python ... ```. */
function extractCodeFence(text: string): string | null {
  const fenced = text.match(/```(?:python|py)?\s*\n([\s\S]*?)\n```/i);
  if (fenced) return fenced[1].trim();
  return null;
}

// ─── Leitura da resposta da TESS ──────────────────────────────────────────────

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

/**
 * Monta a mensagem do USUÁRIO com instruções + pedido + código.
 * As instruções vão aqui (e não só no role:system) porque o agente da TESS
 * tem persona própria e costuma IGNORAR o system prompt — mas lê a mensagem
 * do usuário. Repetir aqui aumenta muito a aderência ao formato.
 */
function buildUserPrompt(mode: TessMode, content: string, code: string): string {
  const lineCount = (code ?? '').split('\n').length;

  if (mode === 'ask') {
    return [
      'Responda à pergunta abaixo de forma objetiva, em PT-BR. NÃO modifique o código.',
      '',
      '=== PERGUNTA ===',
      content,
      '',
      `=== CÓDIGO ATUAL (${lineCount} linhas) ===`,
      '```python',
      code ?? '',
      '```',
    ].join('\n');
  }

  const acao = mode === 'fix' ? 'CORRIJA' : 'MODIFIQUE';
  return [
    `Você é um editor de código. ${acao} o código Python abaixo conforme o pedido. Não converse, não faça perguntas, não dê alternativas.`,
    '',
    'COMO RESPONDER (OBRIGATÓRIO):',
    '- Responda com UMA frase curta + um único bloco ```python``` contendo APENAS as atribuições que mudaram.',
    '- Devolva a ATRIBUIÇÃO PYTHON COMPLETA de cada variável que você alterou: `nome_da_variavel = <novo valor completo>`.',
    '- Use EXATAMENTE o mesmo nome de variável que já existe no código.',
    '- Mesmo que a mudança seja em CSS/JS DENTRO de uma string Python, devolva a variável Python INTEIRA (do `nome =` até o fechamento), já com a alteração — NUNCA devolva só o trecho de CSS/JS solto.',
    '- Inclua todo o valor, mesmo multi-linha. NUNCA use "# ...", reticências ou "resto igual".',
    '- NÃO inclua variáveis que não mudaram. NÃO devolva o arquivo inteiro.',
    '',
    '=== PEDIDO ===',
    content,
    '',
    `=== CÓDIGO ATUAL DO EDITOR (${lineCount} linhas) ===`,
    '```python',
    code ?? '',
    '```',
  ].join('\n');
}

/**
 * Converte a resposta da TESS em código novo:
 * 1) blocos SEARCH/REPLACE (se houver);
 * 2) bloco ```python``` grande (>= 60% do original) → arquivo inteiro;
 * 3) bloco ```python``` pequeno → merge por nome de variável.
 */
function buildResult(reply: string, original: string): { result: RunTessResult; failed: EditBlock[] } {
  const blocks = parseEditBlocks(reply);
  if (blocks.length > 0) {
    const { code, failed } = applyEditBlocks(original, blocks);
    const changed = failed.length < blocks.length && code !== original;
    return { result: { reply, code: changed ? code : null }, failed };
  }

  const fence = extractCodeFence(reply);
  if (fence == null || fence === original) {
    return { result: { reply, code: null }, failed: [] };
  }

  const origLines = original.split('\n').filter((l) => l.trim()).length;
  const fenceLines = fence.split('\n').filter((l) => l.trim()).length;

  // Arquivo inteiro (raro em arquivos grandes): aceita direto.
  if (origLines < 8 || fenceLines >= origLines * 0.6) {
    return { result: { reply, code: fence }, failed: [] };
  }

  // Trecho pequeno: merge por nome de variável.
  const merged = mergeSnippet(original, fence);
  return { result: { reply, code: merged !== original ? merged : null }, failed: [] };
}

export async function runTess(opts: RunTessOptions): Promise<RunTessResult> {
  const { messages, code, mode = 'edit', apiKey, agentId } = opts;

  if (!apiKey || !agentId) {
    throw new TessError(503, 'Assistente TESS não configurado no servidor (TESS_API_KEY / TESS_AGENT_ID).');
  }
  if (!Array.isArray(messages) || messages.length === 0) {
    throw new TessError(400, 'Nenhuma mensagem enviada.');
  }

  const apiMessages: TessChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let i = apiMessages.length - 1; i >= 0; i--) {
    if (apiMessages[i].role === 'user') {
      apiMessages[i] = { role: 'user', content: buildUserPrompt(mode, apiMessages[i].content, code) };
      break;
    }
  }

  const firstReply = await callTess(agentId, apiKey, apiMessages, mode);

  if (mode === 'ask') {
    return { reply: firstReply, code: null };
  }

  const { result, failed } = buildResult(firstReply, code);

  // Sucesso direto.
  if (result.code != null && failed.length === 0) {
    return result;
  }

  // Retry apenas quando blocos SEARCH/REPLACE não casaram.
  if (failed.length > 0) {
    const failedSnippets = failed
      .map((b, i) => `Bloco ${i + 1} — BUSCAR não encontrado:\n${b.search}`)
      .join('\n\n');
    const retryMessages: TessChatMessage[] = [
      ...apiMessages,
      { role: 'assistant', content: firstReply },
      {
        role: 'user',
        content: buildUserPrompt(
          mode,
          `Alguns blocos não foram localizados (BUSCAR precisa ser cópia EXATA do código atual). ` +
            `Refaça SOMENTE esses blocos copiando o trecho exatamente.\n\n${failedSnippets}`,
          code,
        ),
      },
    ];
    const retryReply = await callTess(agentId, apiKey, retryMessages, mode);
    const retry = buildResult(retryReply, code);
    if (retry.result.code != null) return retry.result;
  }

  return result;
}
