/**
 * Motor de edição incremental do editor "Python HTML Render".
 *
 * AGNÓSTICO DE PROVEDOR: esta é a lógica específica deste editor (Python
 * pragmático) — split de statements, merge por nome de variável, blocos
 * SEARCH/REPLACE e montagem do prompt do usuário. Independe de qual LLM
 * respondeu. Reaproveitável em qualquer projeto que use este formato de edição.
 *
 * ESTRATÉGIA (importante):
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
import type { AssistantMode, RunAssistantResult } from './types.js';

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
      const idx = nameToIdx.get(s.name)!;
      const origLen = orig[idx].text.split('\n').length;
      const newLen = s.text.split('\n').length;
      // Proteção: se a nova versão da variável for drasticamente mais curta
      // (< 50% das linhas e original com 6+ linhas), o agente provavelmente
      // truncou o valor. Ignora para não destruir conteúdo.
      if (origLen >= 6 && newLen < origLen * 0.5) {
        console.log(`[AI] merge: variável "${s.name}" ignorada (truncada: ${newLen} vs ${origLen} linhas)`);
        continue;
      }
      orig[idx] = s;
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

export interface EditBlock {
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

// ─── Montagem do prompt do usuário ────────────────────────────────────────────

/**
 * Cria uma representação compacta do código para envio ao modelo.
 *
 * - Statements que contêm palavras-chave do pedido → enviados em FULL.
 * - Statements irrelevantes grandes → só a primeira linha + comentário "N linhas".
 * - Total de linhas enviado é ≤ maxLines.
 *
 * Assim o modelo vê TODOS os nomes de variável (contexto) e o conteúdo COMPLETO
 * das variáveis relevantes ao pedido.
 */
function buildContextualCode(code: string, request: string, maxLines = 300): string {
  const stmts = splitStatements(code);
  if (stmts.length === 0) return code;

  const keywords = request
    .toLowerCase()
    .split(/\W+/)
    .filter((w) => w.length >= 3);

  const isRelevant = (text: string) => {
    const lower = text.toLowerCase();
    return keywords.some((k) => lower.includes(k));
  };

  const parts: string[] = [];
  let lineCount = 0;

  for (const s of stmts) {
    const stmtLineCount = s.text.split('\n').length;
    const relevant = isRelevant(s.text);

    if (relevant || stmtLineCount <= 3) {
      parts.push(s.text);
      lineCount += stmtLineCount;
    } else {
      const firstLine = s.text.split('\n')[0];
      const skipped = stmtLineCount - 1;
      parts.push(skipped > 0 ? `${firstLine}\n# ... (${skipped} linhas)` : firstLine);
      lineCount += 2;
    }

    if (lineCount >= maxLines) {
      parts.push(`# ... (restante do arquivo omitido)`);
      break;
    }
  }

  return parts.join('\n');
}

/**
 * Monta a mensagem do USUÁRIO com instruções + pedido + código.
 * As instruções vão aqui (e não só no system) porque alguns agentes têm persona
 * própria e dão menos peso ao system prompt — mas leem a mensagem do usuário.
 */
export function buildUserPrompt(mode: AssistantMode, content: string, code: string): string {
  if (mode === 'ask') {
    return [
      'Responda à pergunta abaixo em PT-BR. NÃO modifique o código.',
      '',
      `PERGUNTA: ${content}`,
      '',
      '```python',
      code ?? '',
      '```',
    ].join('\n');
  }

  const displayCode = buildContextualCode(code ?? '', content);
  const acao = mode === 'fix' ? 'CORRIJA' : 'ALTERE';

  return [
    `${acao} o código Python abaixo conforme o pedido.`,
    ``,
    `INSTRUÇÃO CRÍTICA: Responda com UMA frase curta + um único bloco \`\`\`python\`\`\` com APENAS as variáveis que mudaram ou serão criadas.`,
    ``,
    `REGRAS:`,
    `- Inclua o valor COMPLETO de cada variável (sem "...", sem "resto igual", sem comentários).`,
    `- NÃO inclua variáveis que não mudaram.`,
    `- NÃO devolva o arquivo inteiro.`,
    `- Sem conversas, sem perguntas, sem alternativas — apenas a resposta.`,
    ``,
    `PEDIDO: ${content}`,
    ``,
    `=== CÓDIGO ATUAL ===`,
    '```python',
    displayCode,
    '```',
  ].join('\n');
}

// ─── Conversão da resposta em código novo ─────────────────────────────────────

/** Remove qualquer marcador BUSCAR/SUBSTITUIR que tenha escapado da limpeza. */
function cleanCodeMarkers(code: string): string {
  return code
    .replace(/<{4,9}\s*BUSCAR[^\n]*\n/gi, '')
    .replace(/\n={4,9}[^\n]*\n/gi, '\n')
    .replace(/\n>{4,9}\s*SUBSTITUIR[^\n]*\n/gi, '\n')
    .replace(/\n+/g, '\n') // Normaliza múltiplas quebras de linha
    .trim();
}

/**
 * Converte a resposta do modelo em código novo:
 * 1) blocos SEARCH/REPLACE (se houver);
 * 2) bloco ```python``` ≥ 95% do original → aceita como arquivo inteiro;
 * 3) bloco menor → merge por nome de variável (preserva tudo que não mudou).
 *
 * Limiar em 0.95 (não 0.6) para evitar que o agente devolva um arquivo
 * parcialmente truncado (~60%) que seria aceito como "completo" e eliminaria
 * os 40% restantes do código original.
 */
export function buildResult(reply: string, original: string): { result: RunAssistantResult; failed: EditBlock[] } {
  const blocks = parseEditBlocks(reply);
  if (blocks.length > 0) {
    const { code, failed } = applyEditBlocks(original, blocks);
    const changed = failed.length < blocks.length && code !== original;
    const cleanedCode = changed && code ? cleanCodeMarkers(code) : null;
    return { result: { reply, code: cleanedCode }, failed };
  }

  const fence = extractCodeFence(reply);
  if (fence == null || fence === original) {
    return { result: { reply, code: null }, failed: [] };
  }

  const cleanedFence = cleanCodeMarkers(fence);
  if (cleanedFence === original) {
    return { result: { reply, code: null }, failed: [] };
  }

  const origLines = original.split('\n').filter((l) => l.trim()).length;
  const fenceLines = cleanedFence.split('\n').filter((l) => l.trim()).length;

  console.log(`[AI] fence: ${fenceLines} non-blank lines | original: ${origLines} non-blank lines | ratio: ${(fenceLines / Math.max(origLines, 1)).toFixed(2)}`);

  // Arquivo original pequeno ou agente devolveu o arquivo quase completo (≥95%).
  if (origLines < 8 || fenceLines >= origLines * 0.95) {
    console.log('[AI] → aceito como arquivo inteiro');
    return { result: { reply, code: cleanedFence }, failed: [] };
  }

  // Trecho parcial: merge por nome de variável (preserva o restante do original).
  console.log('[AI] → merge por nome de variável');
  const merged = mergeSnippet(original, cleanedFence);
  return { result: { reply, code: merged !== original ? merged : null }, failed: [] };
}
