import { MOCK_USERS, MOCK_PRODUCTS, MOCK_SALES } from './mockData';
import { ParseError } from './types';
import type { Contributor, ContributorIndex, SourceLoc } from './types';

type PythonValue = string | number | boolean | null | object | PythonValue[];

interface EvalEnv {
  vars: Record<string, PythonValue>;
  warnings: string[];
  contributors: ContributorIndex;
  locMap: Map<string, { varName?: string; lineNum: number; stmt: string }>;
}

function makeEnv(): EvalEnv {
  return {
    vars: {
      usuarios: MOCK_USERS,
      users: MOCK_USERS,
      produtos: MOCK_PRODUCTS,
      products: MOCK_PRODUCTS,
      vendas: MOCK_SALES,
      sales: MOCK_SALES,
      True: true,
      False: false,
      None: null,
    },
    warnings: [],
    contributors: {},
    locMap: new Map(),
  };
}

function toString(v: PythonValue): string {
  if (v === null || v === undefined) return '';
  if (typeof v === 'string') return v;
  if (typeof v === 'number') return String(v);
  if (typeof v === 'boolean') return v ? 'True' : 'False';
  if (Array.isArray(v)) return str_list(v);
  if (typeof v === 'object') return JSON.stringify(v);
  return String(v);
}

function str_list(arr: PythonValue[]): string {
  return '[' + arr.map(x => typeof x === 'string' ? `'${x}'` : toString(x)).join(', ') + ']';
}

function toNumber(v: PythonValue): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') return parseFloat(v) || 0;
  if (typeof v === 'boolean') return v ? 1 : 0;
  return 0;
}

// ---------- Chained access: var["key"], var[0], var.attr, var["key"][0].attr ----------

function evaluateChained(expr: string, env: EvalEnv, lineNum: number): PythonValue | undefined {
  const firstWord = expr.match(/^(\w+)/)?.[1];
  if (!firstWord || !(firstWord in env.vars)) return undefined;

  let current: PythonValue = env.vars[firstWord];
  let pos = firstWord.length;

  while (pos < expr.length) {
    const ch = expr[pos];
    if (ch === '.') {
      const m = expr.slice(pos).match(/^\.(\w+)/);
      if (!m) return undefined;
      if (current && typeof current === 'object' && !Array.isArray(current)) {
        current = (current as Record<string, PythonValue>)[m[1]] ?? null;
      } else {
        current = null;
      }
      pos += m[0].length;
    } else if (ch === '[') {
      let depth = 0, end = -1;
      let inStr: string | null = null;
      for (let i = pos; i < expr.length; i++) {
        const c = expr[i];
        if (inStr) {
          if (c === '\\') { i++; continue; }
          if (c === inStr) inStr = null;
        } else if (c === '"' || c === "'") {
          inStr = c;
        } else if (c === '[') {
          depth++;
        } else if (c === ']') {
          depth--;
          if (depth === 0) { end = i; break; }
        }
      }
      if (end < 0) return undefined;
      const idxExpr = expr.slice(pos + 1, end);
      const idx = evaluateExpr(idxExpr, env, lineNum);
      if (Array.isArray(current)) {
        const n = toNumber(idx);
        current = (current[n < 0 ? current.length + n : n] ?? null) as PythonValue;
      } else if (typeof current === 'string') {
        const n = toNumber(idx);
        current = (current[n < 0 ? current.length + n : n] ?? null) as PythonValue;
      } else if (current && typeof current === 'object') {
        current = (current as Record<string, PythonValue>)[toString(idx)] ?? null;
      } else {
        current = null;
      }
      pos = end + 1;
    } else {
      return undefined;
    }
  }

  return current;
}

// ---------- Dict literal ----------

function evaluateDict(content: string, env: EvalEnv, lineNum: number): Record<string, PythonValue> {
  const result: Record<string, PythonValue> = {};
  if (!content.trim()) return result;
  const items = splitComma(content);
  for (const item of items) {
    const trimmed = item.trim();
    if (!trimmed) continue;
    const colonIdx = findTopLevelColon(trimmed);
    if (colonIdx < 0) continue;
    const keyExpr = trimmed.slice(0, colonIdx).trim();
    const valExpr = trimmed.slice(colonIdx + 1).trim();
    const key = toString(evaluateExpr(keyExpr, env, lineNum));
    result[key] = evaluateExpr(valExpr, env, lineNum);
  }
  return result;
}

function findTopLevelColon(s: string): number {
  let depth = 0;
  let inStr: string | null = null;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (inStr) {
      if (ch === '\\') { i++; continue; }
      if (ch === inStr) inStr = null;
    } else if (ch === '"' || ch === "'") {
      inStr = ch;
    } else if (ch === '(' || ch === '[' || ch === '{') {
      depth++;
    } else if (ch === ')' || ch === ']' || ch === '}') {
      depth--;
    } else if (ch === ':' && depth === 0) {
      return i;
    }
  }
  return -1;
}

// ---------- evaluateExpr ----------

function evaluateExpr(expr: string, env: EvalEnv, lineNum: number): PythonValue {
  expr = expr.trim();

  // None/True/False literals
  if (expr === 'None') return null;
  if (expr === 'True') return true;
  if (expr === 'False') return false;

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);

  // f-string with triple quotes (must check before single-char triple check)
  const fstrTripleD = expr.match(/^f"""([\s\S]*)"""$/);
  if (fstrTripleD) return evaluateFString(fstrTripleD[1], env, lineNum);
  const fstrTripleS = expr.match(/^f'''([\s\S]*)'''$/);
  if (fstrTripleS) return evaluateFString(fstrTripleS[1], env, lineNum);

  // Regular f-string (single/double quoted)
  const fstrMatch = expr.match(/^f["']([\s\S]*)["']$/);
  if (fstrMatch) return evaluateFString(fstrMatch[1], env, lineNum);

  // Triple-quoted string
  const tripleDouble = expr.match(/^"""([\s\S]*)"""$/);
  if (tripleDouble) return tripleDouble[1];
  const tripleSingle = expr.match(/^'''([\s\S]*)'''$/);
  if (tripleSingle) return tripleSingle[1];

  // String literal (single or double quoted)
  const strMatch = expr.match(/^["']([\s\S]*)["']$/);
  if (strMatch) return unescapeString(strMatch[1]);

  // Dict literal: {key: value, ...}
  if (expr.startsWith('{') && expr.endsWith('}')) {
    return evaluateDict(expr.slice(1, -1), env, lineNum);
  }

  // List comprehension: [expr for var in iterable]
  const compMatch = expr.match(/^\[([\s\S]+?)\s+for\s+(\w+)\s+in\s+([\s\S]+)\]$/);
  if (compMatch) {
    return evaluateListComp(compMatch[1], compMatch[2], compMatch[3], env, lineNum);
  }

  // List literal: [...]
  if (expr.startsWith('[') && expr.endsWith(']')) {
    return evaluateList(expr.slice(1, -1), env, lineNum);
  }

  // "sep".join(list_expr)
  const joinMatch = expr.match(/^["'](.*?)["']\s*\.\s*join\s*\(\s*([\s\S]+)\s*\)$/);
  if (joinMatch) {
    const sep = joinMatch[1];
    const listVal = evaluateExpr(joinMatch[2], env, lineNum);
    if (Array.isArray(listVal)) {
      return listVal.map(x => toString(x)).join(sep);
    }
  }

  // var.join(list_expr)
  const varJoinMatch = expr.match(/^(\w+)\s*\.\s*join\s*\(\s*([\s\S]+)\s*\)$/);
  if (varJoinMatch) {
    const sepVar = env.vars[varJoinMatch[1]];
    const sep = typeof sepVar === 'string' ? sepVar : toString(sepVar);
    const listVal = evaluateExpr(varJoinMatch[2], env, lineNum);
    if (Array.isArray(listVal)) {
      return listVal.map(x => toString(x)).join(sep);
    }
  }

  // String concatenation: expr + expr
  const concatParts = splitOnOp(expr, '+');
  if (concatParts.length > 1) {
    const parts = concatParts.map(p => evaluateExpr(p, env, lineNum));
    if (parts.some(p => typeof p === 'string')) {
      return parts.map(p => toString(p)).join('');
    }
    return parts.reduce<number>((acc, p) => acc + toNumber(p), 0);
  }

  // Chained access: var["key"], var[0], var.attr, var["key"][0] etc.
  if (/^\w+[\[.]/.test(expr)) {
    const chained = evaluateChained(expr, env, lineNum);
    if (chained !== undefined) return chained;
  }

  // Variable reference
  if (/^\w+$/.test(expr)) {
    if (expr in env.vars) return env.vars[expr];
    if (!env.vars['_warned_' + expr]) {
      env.warnings.push(`Variável '${expr}' não definida na linha ${lineNum}.`);
      env.vars['_warned_' + expr] = true;
    }
    return null;
  }

  // Function calls
  const funcMatch = expr.match(/^(\w+)\s*\(([\s\S]*)\)$/);
  if (funcMatch) {
    return evaluateFunc(funcMatch[1], funcMatch[2], env, lineNum);
  }

  return null;
}

function evaluateFString(template: string, env: EvalEnv, lineNum: number): string {
  return template.replace(/\{([^{}]+)\}/g, (_, inner) => {
    try {
      const val = evaluateExpr(inner.trim(), env, lineNum);
      return toString(val);
    } catch {
      return '';
    }
  });
}

function unescapeString(s: string): string {
  return s.replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r')
    .replace(/\\'/g, "'").replace(/\\"/g, '"').replace(/\\\\/g, '\\');
}

function evaluateList(content: string, env: EvalEnv, lineNum: number): PythonValue[] {
  if (!content.trim()) return [];
  const items = splitComma(content);
  return items.filter(item => item.trim()).map(item => evaluateExpr(item.trim(), env, lineNum));
}

function evaluateListComp(
  exprStr: string,
  varName: string,
  iterableStr: string,
  env: EvalEnv,
  lineNum: number,
): PythonValue[] {
  const iterable = evaluateExpr(iterableStr.trim(), env, lineNum);
  if (!Array.isArray(iterable)) return [];
  return iterable.map(item => {
    const innerEnv: EvalEnv = {
      vars: { ...env.vars, [varName]: item },
      warnings: env.warnings,
      contributors: env.contributors,
      locMap: env.locMap,
    };
    return evaluateExpr(exprStr.trim(), innerEnv, lineNum);
  });
}

function evaluateFunc(name: string, argsStr: string, env: EvalEnv, lineNum: number): PythonValue {
  const args = splitComma(argsStr).map(a => evaluateExpr(a.trim(), env, lineNum));
  switch (name.toLowerCase()) {
    case 'str': return toString(args[0] ?? null);
    case 'int': return Math.trunc(toNumber(args[0] ?? 0));
    case 'float': return toNumber(args[0] ?? 0);
    case 'len': {
      const v = args[0];
      if (typeof v === 'string') return v.length;
      if (Array.isArray(v)) return v.length;
      return 0;
    }
    case 'range': {
      const start = args.length >= 2 ? toNumber(args[0]) : 0;
      const end = args.length >= 2 ? toNumber(args[1]) : toNumber(args[0] ?? 0);
      const step = args.length >= 3 ? toNumber(args[2]) : 1;
      const result: PythonValue[] = [];
      for (let i = start; step > 0 ? i < end : i > end; i += step) result.push(i);
      return result;
    }
    case 'list': {
      const v = args[0];
      if (Array.isArray(v)) return v;
      return [];
    }
    case 'enumerate': {
      const v = args[0];
      if (!Array.isArray(v)) return [];
      return v.map((item, i) => [i, item] as PythonValue);
    }
    case 'zip': {
      const lists = args.filter(Array.isArray) as PythonValue[][];
      if (!lists.length) return [];
      const minLen = Math.min(...lists.map(l => l.length));
      return Array.from({ length: minLen }, (_, i) => lists.map(l => l[i]) as PythonValue);
    }
    case 'sorted': {
      const v = args[0];
      if (!Array.isArray(v)) return [];
      return [...v].sort((a, b) => toString(a).localeCompare(toString(b)));
    }
    case 'reversed': {
      const v = args[0];
      if (!Array.isArray(v)) return [];
      return [...v].reverse();
    }
    case 'sum': {
      const v = args[0];
      if (!Array.isArray(v)) return 0;
      return v.reduce<number>((acc, x) => acc + toNumber(x), 0);
    }
    case 'max': {
      if (args.length > 1) return Math.max(...args.map(toNumber));
      const v = args[0];
      if (!Array.isArray(v)) return 0;
      return Math.max(...v.map(toNumber));
    }
    case 'min': {
      if (args.length > 1) return Math.min(...args.map(toNumber));
      const v = args[0];
      if (!Array.isArray(v)) return 0;
      return Math.min(...v.map(toNumber));
    }
    case 'round': return Math.round(toNumber(args[0] ?? 0) * Math.pow(10, toNumber(args[1] ?? 0))) / Math.pow(10, toNumber(args[1] ?? 0));
    case 'abs': return Math.abs(toNumber(args[0] ?? 0));
    case 'print': return null;
    default: {
      if (!env.vars['_warnfn_' + name]) {
        env.warnings.push(`Função '${name}' não implementada — linha ${lineNum}.`);
        env.vars['_warnfn_' + name] = true;
      }
      return null;
    }
  }
}

function splitOnOp(expr: string, op: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  let inStr: string | null = null;
  let inTriple: string | null = null;
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inTriple) {
      current += ch;
      if (expr.slice(i, i + 3) === inTriple) {
        current += expr[i + 1] + expr[i + 2];
        i += 2;
        inTriple = null;
      }
    } else if (inStr) {
      current += ch;
      if (ch === '\\') { current += expr[++i] || ''; }
      else if (ch === inStr) inStr = null;
    } else {
      // Check for triple quotes
      const q3 = expr.slice(i, i + 3);
      if (q3 === '"""' || q3 === "'''") {
        inTriple = q3;
        current += q3;
        i += 2;
      } else if (ch === '"' || ch === "'") {
        inStr = ch;
        current += ch;
      } else if (ch === '(' || ch === '[' || ch === '{') {
        depth++;
        current += ch;
      } else if (ch === ')' || ch === ']' || ch === '}') {
        depth--;
        current += ch;
      } else if (depth === 0 && expr.slice(i, i + op.length) === op) {
        parts.push(current);
        current = '';
        i += op.length - 1;
      } else {
        current += ch;
      }
    }
  }
  parts.push(current);
  return parts;
}

function splitComma(s: string): string[] {
  return splitOnOp(s, ',');
}

// ---------- data-py-loc injection ----------

// Inject data-py-loc into every opening HTML tag in the string.
// Skips if the string already has any data-py-loc (avoids double-injection
// when a variable is reused in return statements or concatenations).
function injectLoc(value: string, loc: { start: number; end: number } | undefined): string {
  if (!loc || !value || typeof value !== 'string') return value;
  if (value.includes('data-py-loc=')) return value;
  const attr = ` data-py-loc="${loc.start}-${loc.end}"`;
  return value.replace(/<([a-zA-Z][a-zA-Z0-9-]*)(\s|\/|>)/g, (_, tag, sep) => `<${tag}${attr}${sep}`);
}

function trackLocation(env: EvalEnv, html: string, loc: SourceLoc | undefined, lineNum: number, varName?: string) {
  if (!loc || !html || typeof html !== 'string') return;
  const locKey = `${loc.start}-${loc.end}`;
  env.locMap.set(locKey, { varName, lineNum, stmt: html.substring(0, 100) });
}

// ---------- Statements ----------

interface Statement {
  kind: 'assign' | 'augadd' | 'augmul' | 'return' | 'for' | 'comment' | 'expr';
  raw: string;
  lineNum: number;
  indent: number;
  varName?: string;
  expr?: string;
  iterVar?: string;
  iterExpr?: string;
  body?: Statement[];
  loc?: { start: number; end: number };
}

function getIndent(line: string): number {
  let n = 0;
  for (const ch of line) {
    if (ch === ' ') n++;
    else if (ch === '\t') n += 4;
    else break;
  }
  return n;
}

function parseStatements(lines: { text: string; lineNum: number; offset: number }[], baseIndent: number): Statement[] {
  const stmts: Statement[] = [];
  let i = 0;
  while (i < lines.length) {
    const { text, lineNum, offset } = lines[i];
    // Use the first line of possibly-multi-line text for indent detection
    const firstLine = text.split('\n')[0];
    const trimmed = text.trim();
    const indent = getIndent(firstLine);

    if (!trimmed || trimmed.startsWith('#')) { i++; continue; }
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }

    // For loop (only applies to single-line for declarations)
    const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+([\s\S]+?)\s*:(?:\s*#.*)?$/);
    if (forMatch) {
      i++;
      const bodyLines = [];
      const bodyIndent = baseIndent + 4;
      while (i < lines.length) {
        const nextIndent = getIndent(lines[i].text.split('\n')[0]);
        if (!lines[i].text.trim() || nextIndent >= bodyIndent) {
          bodyLines.push(lines[i]);
          i++;
        } else break;
      }
      const body = parseStatements(bodyLines, bodyIndent);
      stmts.push({ kind: 'for', raw: text, lineNum, indent, iterVar: forMatch[1], iterExpr: forMatch[2], body, loc: { start: offset, end: offset + text.length } });
      continue;
    }

    // Return
    if (trimmed.startsWith('return ') || trimmed === 'return') {
      const expr = trimmed.slice('return'.length).trim();
      stmts.push({ kind: 'return', raw: text, lineNum, indent, expr, loc: { start: offset, end: offset + text.length } });
      i++;
      continue;
    }

    // Augmented assignment
    const augMatch = trimmed.match(/^(\w+)\s*\+=\s*([\s\S]+)$/);
    if (augMatch) {
      stmts.push({ kind: 'augadd', raw: text, lineNum, indent, varName: augMatch[1], expr: augMatch[2], loc: { start: offset, end: offset + text.length } });
      i++;
      continue;
    }

    // Regular assignment ([\s\S]+ to handle multi-line expressions)
    const assignMatch = trimmed.match(/^(\w+)\s*=\s*([\s\S]+)$/);
    if (assignMatch) {
      stmts.push({ kind: 'assign', raw: text, lineNum, indent, varName: assignMatch[1], expr: assignMatch[2], loc: { start: offset, end: offset + text.length } });
      i++;
      continue;
    }

    stmts.push({ kind: 'expr', raw: text, lineNum, indent, expr: trimmed, loc: { start: offset, end: offset + text.length } });
    i++;
  }
  return stmts;
}

function buildContributorsFromHtml(html: string, env: EvalEnv) {
  const locRegex = /data-py-loc="(\d+)-(\d+)"/g;
  let match;
  const seen = new Set<string>();
  while ((match = locRegex.exec(html)) !== null) {
    const locStr = `${match[1]}-${match[2]}`;
    if (seen.has(locStr)) continue;
    seen.add(locStr);
    const info = env.locMap.get(locStr);
    if (!info) continue;

    const rootLoc = { start: parseInt(match[1], 10), end: parseInt(match[2], 10) };
    if (!env.contributors[locStr]) {
      env.contributors[locStr] = {
        rootLoc,
        rootLine: info.lineNum,
        items: [],
      };
    }

    const existing = env.contributors[locStr].items.find(
      (c) => c.kind === 'var' && c.name === (info.varName || '(result)')
    );
    if (!existing) {
      env.contributors[locStr].items.push({
        kind: 'var',
        name: info.varName || '(result)',
        refLoc: rootLoc,
        declLoc: rootLoc,
        line: info.lineNum,
        snippet: info.stmt.substring(0, 50),
      });
    }
  }
}

function executeStatements(stmts: Statement[], env: EvalEnv): string | null {
  for (const stmt of stmts) {
    if (stmt.kind === 'comment') continue;

    if (stmt.kind === 'return') {
      const val = evaluateExpr(stmt.expr!, env, stmt.lineNum);
      // Don't re-inject if value already has loc tracking from prior statements.
      // Only inject if this return produces fresh HTML with no existing loc.
      const strVal = typeof val === 'string' ? injectLoc(val, stmt.loc) : val;
      if (typeof strVal === 'string') {
        trackLocation(env, strVal, stmt.loc, stmt.lineNum);
      }
      return toString(strVal);
    }

    if (stmt.kind === 'assign') {
      const val = evaluateExpr(stmt.expr!, env, stmt.lineNum);
      const strVal = typeof val === 'string' ? injectLoc(val, stmt.loc) : val;
      env.vars[stmt.varName!] = strVal;
      if (typeof strVal === 'string') {
        trackLocation(env, strVal, stmt.loc, stmt.lineNum, stmt.varName);
      }
      continue;
    }

    if (stmt.kind === 'augadd') {
      const existing = env.vars[stmt.varName!];
      const val = evaluateExpr(stmt.expr!, env, stmt.lineNum);
      if (typeof existing === 'string' || typeof val === 'string') {
        const injected = typeof val === 'string' ? injectLoc(val, stmt.loc) : val;
        const result = toString(existing) + toString(injected);
        env.vars[stmt.varName!] = result;
        trackLocation(env, result, stmt.loc, stmt.lineNum, stmt.varName);
      } else {
        env.vars[stmt.varName!] = toNumber(existing ?? 0) + toNumber(val);
      }
      continue;
    }

    if (stmt.kind === 'for') {
      const iterable = evaluateExpr(stmt.iterExpr!, env, stmt.lineNum);
      const items = Array.isArray(iterable) ? iterable : [];
      for (const item of items) {
        const innerEnv: EvalEnv = {
          vars: { ...env.vars, [stmt.iterVar!]: item },
          warnings: env.warnings,
          contributors: env.contributors,
          locMap: env.locMap,
        };
        const result = executeStatements(stmt.body ?? [], innerEnv);
        Object.assign(env.vars, innerEnv.vars);
        if (result !== null) return result;
      }
      continue;
    }

    if (stmt.kind === 'expr') {
      evaluateExpr(stmt.expr!, env, stmt.lineNum);
    }
  }
  return null;
}

// ---------- Multi-line expression joining ----------

// Returns true if src has unclosed brackets or an unclosed triple-quoted string.
function isExpressionIncomplete(src: string): boolean {
  let depth = 0;
  let inTriple: string | null = null;
  let inStr: string | null = null;
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (inTriple) {
      if (src.slice(i, i + 3) === inTriple) { inTriple = null; i += 3; } else { i++; }
      continue;
    }
    if (inStr) {
      if (ch === '\\') { i += 2; continue; }
      if (ch === inStr) inStr = null;
      i++;
      continue;
    }
    // f/r/b prefix before triple quote
    const pfx = (ch === 'f' || ch === 'r' || ch === 'b') ? 1 : 0;
    const q3 = src.slice(i + pfx, i + pfx + 3);
    if (q3 === '"""' || q3 === "'''") { inTriple = q3; i += pfx + 3; continue; }
    if (ch === '"' || ch === "'") { inStr = ch; i++; continue; }
    if (ch === '#' && !inStr && !inTriple) break; // comment — rest of line
    if (ch === '(' || ch === '[' || ch === '{') depth++;
    else if (ch === ')' || ch === ']' || ch === '}') depth--;
    i++;
  }
  return depth > 0 || inTriple !== null;
}

// Joins raw source lines into logical statement lines, handling multi-line
// strings (triple quotes) and multi-line expressions (unclosed brackets).
function joinMultiLineStatements(rawLines: string[]): { text: string; lineNum: number; offset: number }[] {
  const result: { text: string; lineNum: number; offset: number }[] = [];
  let rawOffset = 0;
  let i = 0;

  while (i < rawLines.length) {
    const startOffset = rawOffset;
    const startLineNum = i + 1;
    let combined = rawLines[i];
    rawOffset += rawLines[i].length + 1;
    i++;

    while (i < rawLines.length && isExpressionIncomplete(combined)) {
      combined += '\n' + rawLines[i];
      rawOffset += rawLines[i].length + 1;
      i++;
    }

    result.push({ text: combined, lineNum: startLineNum, offset: startOffset });
  }

  return result;
}

// ---------- Public entry point ----------

export function evaluatePythonCode(src: string): { html: string; warnings: string[]; contributors: ContributorIndex; error?: string; errorLine?: number; errorPos?: number } {
  const env = makeEnv();

  const rawLines = src.split(/\r?\n/);
  const lineObjects = joinMultiLineStatements(rawLines);

  try {
    const stmts = parseStatements(lineObjects, 0);
    const result = executeStatements(stmts, env);

    const html = result ?? toString(env.vars['html'] ?? env.vars['_html'] ?? env.vars['output'] ?? '');

    buildContributorsFromHtml(html, env);

    return { html, warnings: env.warnings, contributors: env.contributors };
  } catch (e) {
    if (e instanceof ParseError) {
      return { html: '', warnings: env.warnings, contributors: {}, error: e.message, errorPos: e.pos, errorLine: undefined };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { html: '', warnings: env.warnings, contributors: {}, error: msg };
  }
}
