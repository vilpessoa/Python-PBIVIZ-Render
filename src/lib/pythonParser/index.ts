import { evaluatePythonCode } from './evaluator';
import { ParseError } from './types';
import type { ParseResult } from './types';
import { processHtml } from './htmlProcessor';
import { isPbivizScript, extractPbivizPreviewHtml } from './pbivizExtractor';
import type { PBISettings } from '../storage';

function posToLineCol(src: string, pos: number): { line: number; col: number } {
  let line = 1, col = 1;
  for (let i = 0; i < pos && i < src.length; i++) {
    if (src[i] === '\n') { line++; col = 1; } else { col++; }
  }
  return { line, col };
}

export function parsePython(src: string, pbivizSettings?: PBISettings): ParseResult {
  // Fast-path: pbiviz build scripts define CSS + JS as triple-quoted strings
  // and package them into a .pbiviz ZIP — render a visual preview instead.
  if (isPbivizScript(src)) {
    const html = extractPbivizPreviewHtml(src, pbivizSettings);
    if (html) return { html, warnings: [], isPbiviz: true };
  }

  const warnings: string[] = [];
  try {
    const result = evaluatePythonCode(src);
    warnings.push(...result.warnings);
    if (result.error) {
      const line = result.errorLine;
      const pos = result.errorPos ?? 0;
      const { line: ln, col } = posToLineCol(src, pos);
      return {
        html: '',
        warnings,
        error: result.error,
        errorPos: pos,
        errorLine: line ?? ln,
        errorCol: col,
        contributors: result.contributors,
      };
    }
    let html = result.html;
    const isPurePython = !!html.trim() && !/<[a-z][\s\S]*?>/i.test(html);
    const rawValue = isPurePython ? html.trim() : undefined;
    html = processHtml(html);
    return { html, warnings, isPurePython, rawValue, contributors: result.contributors };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (e instanceof ParseError) {
      const { line, col } = posToLineCol(src, e.pos);
      return { html: '', warnings, error: msg, errorPos: e.pos, errorEndPos: e.endPos, errorLine: line, errorCol: col };
    }
    return { html: '', warnings, error: msg };
  }
}

export type { ParseResult } from './types';
