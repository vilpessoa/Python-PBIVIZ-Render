import type { VELocateTokens } from './visualEdits';

export interface VEMatch {
  /** display label shown in the menu */
  label: string;
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
      results.push({
        label: trimmed.length > 60 ? trimmed.slice(0, 58) + '…' : trimmed,
        start: lineStart,
        end: lineEnd,
        line: i + 1,
        score,
      });
    }
  }

  results.sort((a, b) => b.score - a.score);
  return results.slice(0, 8); // keep top-8
}
