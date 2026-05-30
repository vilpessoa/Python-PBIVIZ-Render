import type { VELocateTokens } from './visualEdits';

export type VEMatchKind = 'var' | 'html' | 'text' | 'css' | 'json';

export interface VEMatch {
  /** friendly label shown in the menu */
  label: string;
  /** kind of source line (drives the badge color) */
  kind: VEMatchKind;
  /** 0-based char offset of start of matching line in src */
  start: number;
  /** 0-based char offset of end of matching line in src */
  end: number;
  /** 1-based line number */
  line: number;
  /** match confidence 0-100 (higher = better) */
  score: number;
}

// Normalize a string for fuzzy comparison: lowercase, collapse whitespace.
function norm(s: string): string {
  return s.toLowerCase().replace(/\s+/g, ' ').trim();
}

// Check whether `needle` appears as a substring of `haystack` (case-insensitive).
function contains(haystack: string, needle: string): boolean {
  if (!needle) return false;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

// Compute similarity score between a source line and the element tokens.
// Returns 0-100.
function scoreLine(lineText: string, tokens: VELocateTokens): number {
  const t = norm(lineText);
  let score = 0;

  // Class names match — each class worth up to 30 pts split equally
  if (tokens.classes.length > 0) {
    const classHits = tokens.classes.filter(c => c.length > 2 && contains(t, c));
    score += Math.round((classHits.length / tokens.classes.length) * 30);
  }

  // ID match — very strong signal (25 pts)
  if (tokens.id && contains(t, tokens.id)) score += 25;

  // Tag name — weak signal (5 pts)
  if (tokens.tag && tokens.tag !== 'div' && tokens.tag !== 'span' && contains(t, tokens.tag)) score += 5;

  // Attribute values (name/placeholder/type/href/etc.) — 15 pts each, cap 30
  let attrPts = 0;
  for (const a of tokens.attrs) {
    if (a.value.length > 2 && contains(t, a.value)) attrPts += 15;
  }
  score += Math.min(30, attrPts);

  // Text content match — find any word > 3 chars from text in the line
  if (tokens.text) {
    const words = tokens.text.split(/\s+/).filter(w => w.length > 3);
    const wordHits = words.filter(w => contains(t, w));
    if (words.length > 0) score += Math.round((wordHits.length / words.length) * 20);
  }

  return Math.min(100, score);
}

// Extracts a friendly label from an HTML/JSX-ish snippet (inspired by
// DAX-HTML-Render's htmlLabel): first CSS property of style="", else the
// value of the first attribute, else `<tag>`.
function htmlLabel(text: string): string {
  const tagMatch = /<([a-zA-Z][a-zA-Z0-9-]*)/.exec(text);
  if (!tagMatch) return text;
  const tag = tagMatch[1];
  const rest = text.slice(tagMatch.index + tagMatch[0].length);
  const styleMatch = /\bstyle\s*=\s*['"]\s*([a-zA-Z-]+)/.exec(rest);
  if (styleMatch) return styleMatch[1];
  const attrMatch = /\s+[a-zA-Z][a-zA-Z0-9-]*\s*=\s*['"]([^'"]+)['"]/.exec(rest);
  if (attrMatch) return attrMatch[1].trim();
  return `<${tag}>`;
}

// Classify a raw source line and return a friendly label + kind.
function friendlyLabel(raw: string): { label: string; kind: VEMatchKind } {
  const t = raw.trim();

  // CSS rule: ".foo { ..." or "#foo, .bar {" or "@media (...) {"
  const cssMatch = /^([.#@][^\s{,]+(?:\s*,\s*[.#@][^\s{,]+)*)\s*\{/.exec(t);
  if (cssMatch) return { kind: 'css', label: cssMatch[1].trim() };

  // CSS property inside a rule: "color: #fff;" or "font-size: 14px;"
  const cssPropMatch = /^([a-zA-Z-]+)\s*:\s*([^;]+);?\s*$/.exec(t);
  if (cssPropMatch && !cssPropMatch[2].startsWith('"') && !cssPropMatch[2].startsWith("'")) {
    return { kind: 'css', label: `${cssPropMatch[1]}: ${cssPropMatch[2].trim()}` };
  }

  // JSON/dict pair: '"key": "value",' or 'key: value,'
  const jsonMatch = /^['"]?([\w-]+)['"]?\s*:\s*(.+?),?\s*$/.exec(t);
  if (jsonMatch && /^['"{[]|^(true|false|\d)/.test(jsonMatch[2])) {
    const val = jsonMatch[2].replace(/[,]$/, '').trim();
    const shortVal = val.length > 30 ? val.slice(0, 28) + '…' : val;
    return { kind: 'json', label: `${jsonMatch[1]}: ${shortVal}` };
  }

  // Python assignment: "VAR = ..." or "var_name = ..."
  const pyAssign = /^([A-Za-z_][\w]*)\s*(?:\+?=)\s*(.+)$/.exec(t);
  if (pyAssign) {
    const name = pyAssign[1];
    const val = pyAssign[2].trim();
    // If RHS is a simple string literal, show its content
    const strMatch = /^["']([^"']{1,40})["']/.exec(val);
    if (strMatch) return { kind: 'var', label: `${name} = "${strMatch[1]}"` };
    return { kind: 'var', label: name };
  }

  // JS property assignment: "el.textContent = 'Enviar'" or "btn.style.color='red'"
  const jsAssign = /^([\w.[\]'"]+)\s*=\s*(.+)$/.exec(t);
  if (jsAssign && jsAssign[1].includes('.')) {
    const strMatch = /^["']([^"']{1,40})["']/.exec(jsAssign[2]);
    if (strMatch) return { kind: 'text', label: `${jsAssign[1]} = "${strMatch[1]}"` };
    return { kind: 'var', label: jsAssign[1] };
  }

  // HTML/JSX tag in the line
  if (/<[a-zA-Z]/.test(t)) {
    return { kind: 'html', label: htmlLabel(t) };
  }

  // Quoted string content
  const strOnly = /^["']([^"']{2,60})["']/.exec(t);
  if (strOnly) return { kind: 'text', label: strOnly[1] };

  // Fallback: trimmed line
  return { kind: 'text', label: t.length > 60 ? t.slice(0, 58) + '…' : t };
}

/**
 * Search Python `src` for lines that likely correspond to the clicked element.
 * Returns matches sorted by score descending.
 */
export function searchPythonSource(src: string, tokens: VELocateTokens): VEMatch[] {
  const lines = src.split(/\r?\n/);
  const results: VEMatch[] = [];
  let offset = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineStart = offset;
    const lineEnd = offset + line.length;
    offset += line.length + 1; // +1 for \n

    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    const score = scoreLine(line, tokens);
    if (score >= 10) {
      const { label, kind } = friendlyLabel(line);
      results.push({ label, kind, start: lineStart, end: lineEnd, line: i + 1, score });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8); // keep top-8
}
