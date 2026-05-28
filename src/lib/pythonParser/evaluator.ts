import { MOCK_USERS, MOCK_PRODUCTS, MOCK_SALES } from './mockData';
import { ParseError } from './types';

type PythonValue = string | number | boolean | null | object | PythonValue[];

interface EvalEnv {
  vars: Record<string, PythonValue>;
  warnings: string[];
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

function evaluateExpr(expr: string, env: EvalEnv, lineNum: number): PythonValue {
  expr = expr.trim();

  // None/True/False literals
  if (expr === 'None') return null;
  if (expr === 'True') return true;
  if (expr === 'False') return false;

  // Number literal
  if (/^-?\d+(\.\d+)?$/.test(expr)) return parseFloat(expr);

  // String literal (single or double quoted, possibly f-string)
  const fstrMatch = expr.match(/^f["']([\s\S]*)["']$/);
  if (fstrMatch) {
    return evaluateFString(fstrMatch[1], env, lineNum);
  }

  const strMatch = expr.match(/^["']([\s\S]*)["']$/);
  if (strMatch) return unescapeString(strMatch[1]);

  // Triple-quoted string
  const tripleDouble = expr.match(/^"""([\s\S]*)"""$/);
  if (tripleDouble) return tripleDouble[1];
  const tripleSingle = expr.match(/^'''([\s\S]*)'''$/);
  if (tripleSingle) return tripleSingle[1];

  // List literal: [...]
  if (expr.startsWith('[') && expr.endsWith(']')) {
    return evaluateList(expr.slice(1, -1), env, lineNum);
  }

  // ".join(list_expr)
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

  // List comprehension: [expr for var in iterable]
  const compMatch = expr.match(/^\[([\s\S]+?)\s+for\s+(\w+)\s+in\s+([\s\S]+)\]$/);
  if (compMatch) {
    return evaluateListComp(compMatch[1], compMatch[2], compMatch[3], env, lineNum);
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

  // Attribute access: obj.attr or obj["key"] or obj['key']
  const dotMatch = expr.match(/^(\w+)\.([\w]+)$/);
  if (dotMatch) {
    const obj = env.vars[dotMatch[1]];
    if (obj && typeof obj === 'object' && !Array.isArray(obj)) {
      const val = (obj as Record<string, PythonValue>)[dotMatch[2]];
      if (val !== undefined) return val;
    }
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
  return template.replace(/\{([^}]+)\}/g, (_, inner) => {
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
  return items.map(item => evaluateExpr(item.trim(), env, lineNum));
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
    };
    return evaluateExpr(exprStr, innerEnv, lineNum);
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
  for (let i = 0; i < expr.length; i++) {
    const ch = expr[i];
    if (inStr) {
      current += ch;
      if (ch === inStr && expr[i - 1] !== '\\') inStr = null;
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
  parts.push(current);
  return parts;
}

function splitComma(s: string): string[] {
  return splitOnOp(s, ',');
}

// Inject data-py-loc into HTML string literals
function injectLoc(value: string, loc: { start: number; end: number } | undefined): string {
  if (!loc) return value;
  const OPEN_TAG_RE = /<([a-zA-Z][a-zA-Z0-9-]*)(\s|\/|>)/;
  const m = OPEN_TAG_RE.exec(value);
  if (!m) return value;
  const insertAt = m.index + 1 + m[1].length;
  const attr = ` data-py-loc="${loc.start}-${loc.end}"`;
  return value.slice(0, insertAt) + attr + value.slice(insertAt);
}

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
    const trimmed = text.trim();
    const indent = getIndent(text);

    if (!trimmed || trimmed.startsWith('#')) { i++; continue; }
    if (indent < baseIndent) break;
    if (indent > baseIndent) { i++; continue; }

    // For loop
    const forMatch = trimmed.match(/^for\s+(\w+)\s+in\s+(.+)\s*:$/);
    if (forMatch) {
      i++;
      const bodyLines = [];
      const bodyIndent = baseIndent + 4;
      while (i < lines.length) {
        const nextIndent = getIndent(lines[i].text);
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
    if (trimmed.startsWith('return ')) {
      const expr = trimmed.slice('return '.length).trim();
      stmts.push({ kind: 'return', raw: text, lineNum, indent, expr, loc: { start: offset, end: offset + text.length } });
      i++;
      continue;
    }

    // Augmented assignment
    const augMatch = trimmed.match(/^(\w+)\s*\+=\s*(.+)$/);
    if (augMatch) {
      stmts.push({ kind: 'augadd', raw: text, lineNum, indent, varName: augMatch[1], expr: augMatch[2], loc: { start: offset, end: offset + text.length } });
      i++;
      continue;
    }

    // Regular assignment
    const assignMatch = trimmed.match(/^(\w+)\s*=\s*(.+)$/);
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

function executeStatements(stmts: Statement[], env: EvalEnv): string | null {
  for (const stmt of stmts) {
    if (stmt.kind === 'comment') continue;

    if (stmt.kind === 'return') {
      const val = evaluateExpr(stmt.expr!, env, stmt.lineNum);
      return toString(val);
    }

    if (stmt.kind === 'assign') {
      const val = evaluateExpr(stmt.expr!, env, stmt.lineNum);
      const strVal = typeof val === 'string' ? injectLoc(val, stmt.loc) : val;
      env.vars[stmt.varName!] = strVal;
      continue;
    }

    if (stmt.kind === 'augadd') {
      const existing = env.vars[stmt.varName!];
      const val = evaluateExpr(stmt.expr!, env, stmt.lineNum);
      if (typeof existing === 'string' || typeof val === 'string') {
        const injected = typeof val === 'string' ? injectLoc(val, stmt.loc) : val;
        env.vars[stmt.varName!] = toString(existing) + toString(injected);
      } else {
        env.vars[stmt.varName!] = toNumber(existing ?? 0) + toNumber(val);
      }
      continue;
    }

    if (stmt.kind === 'for') {
      const iterable = evaluateExpr(stmt.iterExpr!, env, stmt.lineNum);
      const items = Array.isArray(iterable) ? iterable : [];
      for (const item of items) {
        const innerEnv: EvalEnv = { vars: { ...env.vars, [stmt.iterVar!]: item }, warnings: env.warnings };
        const result = executeStatements(stmt.body ?? [], innerEnv);
        // Propagate variable changes back
        Object.assign(env.vars, innerEnv.vars);
        if (result !== null) return result;
      }
      continue;
    }

    if (stmt.kind === 'expr') {
      // Evaluate but discard (side effects might matter in future)
      evaluateExpr(stmt.expr!, env, stmt.lineNum);
    }
  }
  return null;
}

export function evaluatePythonCode(src: string): { html: string; warnings: string[]; error?: string; errorLine?: number; errorPos?: number } {
  const env = makeEnv();

  // Build line objects with offsets
  const rawLines = src.split(/\r?\n/);
  const lineObjects: { text: string; lineNum: number; offset: number }[] = [];
  let offset = 0;
  for (let i = 0; i < rawLines.length; i++) {
    lineObjects.push({ text: rawLines[i], lineNum: i + 1, offset });
    offset += rawLines[i].length + 1;
  }

  try {
    const stmts = parseStatements(lineObjects, 0);
    const result = executeStatements(stmts, env);

    // If there's a "return" result, use it; otherwise try to find an html variable
    const html = result ?? toString(env.vars['html'] ?? env.vars['_html'] ?? env.vars['output'] ?? '');

    return { html, warnings: env.warnings };
  } catch (e) {
    if (e instanceof ParseError) {
      return { html: '', warnings: env.warnings, error: e.message, errorPos: e.pos, errorLine: undefined };
    }
    const msg = e instanceof Error ? e.message : String(e);
    return { html: '', warnings: env.warnings, error: msg };
  }
}
