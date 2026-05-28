// Pragmatic Python evaluator for "html = ... / html += ... / return html" patterns.
// Not a full interpreter — supports string literals, assignment, augmented concat,
// f-string-free concatenation via `+`, and a single `return`.

type Stmt =
  | { kind: "assign"; name: string; expr: Expr }
  | { kind: "augadd"; name: string; expr: Expr }
  | { kind: "return"; expr: Expr };

type Expr =
  | { kind: "str"; value: string }
  | { kind: "name"; value: string }
  | { kind: "concat"; parts: Expr[] };

function unescapeString(raw: string): string {
  return raw.replace(/\\(.)/g, (_, c) => {
    switch (c) {
      case "n": return "\n";
      case "t": return "\t";
      case "r": return "\r";
      case "\\": return "\\";
      case "'": return "'";
      case '"': return '"';
      default: return c;
    }
  });
}

function parseExpr(src: string, line: number): Expr {
  const parts: Expr[] = [];
  let i = 0;
  const s = src.trim();
  while (i < s.length) {
    const ch = s[i];
    if (ch === " " || ch === "\t" || ch === "+") { i++; continue; }
    if (ch === '"' || ch === "'") {
      const quote = ch;
      let j = i + 1;
      let buf = "";
      while (j < s.length) {
        if (s[j] === "\\" && j + 1 < s.length) { buf += s[j] + s[j + 1]; j += 2; continue; }
        if (s[j] === quote) break;
        buf += s[j]; j++;
      }
      if (j >= s.length) throw new Error(`String não fechada na linha ${line}`);
      parts.push({ kind: "str", value: unescapeString(buf) });
      i = j + 1;
      continue;
    }
    if (/[A-Za-z_]/.test(ch)) {
      let j = i;
      while (j < s.length && /[A-Za-z0-9_]/.test(s[j])) j++;
      parts.push({ kind: "name", value: s.slice(i, j) });
      i = j;
      continue;
    }
    throw new Error(`Token inesperado "${ch}" na linha ${line}`);
  }
  if (parts.length === 0) throw new Error(`Expressão vazia na linha ${line}`);
  if (parts.length === 1) return parts[0];
  return { kind: "concat", parts };
}

function parse(code: string): Stmt[] {
  const stmts: Stmt[] = [];
  const lines = code.split(/\r?\n/);
  for (let n = 0; n < lines.length; n++) {
    let line = lines[n];
    const hashIdx = stripCommentIndex(line);
    if (hashIdx >= 0) line = line.slice(0, hashIdx);
    line = line.trim();
    if (!line) continue;

    if (line.startsWith("return")) {
      const expr = line.slice("return".length).trim();
      if (!expr) throw new Error(`return sem expressão na linha ${n + 1}`);
      stmts.push({ kind: "return", expr: parseExpr(expr, n + 1) });
      continue;
    }

    const augMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*\+=\s*(.+)$/);
    if (augMatch) {
      stmts.push({ kind: "augadd", name: augMatch[1], expr: parseExpr(augMatch[2], n + 1) });
      continue;
    }
    const assignMatch = line.match(/^([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+)$/);
    if (assignMatch) {
      stmts.push({ kind: "assign", name: assignMatch[1], expr: parseExpr(assignMatch[2], n + 1) });
      continue;
    }
    throw new Error(`Sintaxe não suportada na linha ${n + 1}: ${line}`);
  }
  return stmts;
}

function stripCommentIndex(line: string): number {
  let inStr: string | null = null;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inStr) {
      if (ch === "\\") { i++; continue; }
      if (ch === inStr) inStr = null;
    } else {
      if (ch === '"' || ch === "'") inStr = ch;
      else if (ch === "#") return i;
    }
  }
  return -1;
}

function evalExpr(expr: Expr, env: Record<string, string>): string {
  if (expr.kind === "str") return expr.value;
  if (expr.kind === "name") {
    if (!(expr.value in env)) throw new Error(`Variável "${expr.value}" não definida`);
    return env[expr.value];
  }
  return expr.parts.map((p) => evalExpr(p, env)).join("");
}

export function evaluatePython(code: string): string {
  const stmts = parse(code);
  const env: Record<string, string> = {};
  const order: string[] = [];
  for (const stmt of stmts) {
    if (stmt.kind === "assign") {
      if (!(stmt.name in env)) order.push(stmt.name);
      env[stmt.name] = evalExpr(stmt.expr, env);
    } else if (stmt.kind === "augadd") {
      if (!(stmt.name in env)) throw new Error(`Variável "${stmt.name}" usada em += sem atribuição prévia`);
      env[stmt.name] = env[stmt.name] + evalExpr(stmt.expr, env);
    } else {
      return evalExpr(stmt.expr, env);
    }
  }
  return order.map((k) => env[k]).join("");
}
