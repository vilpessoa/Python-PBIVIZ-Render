export type EnhancedErrorKind =
  | 'SyntaxError'
  | 'NameError'
  | 'TypeError'
  | 'IndentationError'
  | 'Unknown';

export interface EnhancedError {
  kind: EnhancedErrorKind;
  title: string;
  message: string;
  snippet?: string;
  suggestion?: string;
}

function buildSnippet(raw: string | undefined, pos: number | undefined, line?: number): string | undefined {
  if (!raw) return undefined;
  if (typeof line === 'number' && line > 0) {
    const lines = raw.split(/\r?\n/);
    const idx = line - 1;
    if (idx >= 0 && idx < lines.length) {
      const cur = lines[idx];
      const prev = lines[idx - 1];
      const trimmed = cur.trim();
      if (trimmed) return prev ? `${prev.trim()}\n${trimmed}` : trimmed;
    }
  }
  if (typeof pos === 'number' && pos >= 0 && pos <= (raw?.length ?? 0)) {
    const start = Math.max(0, pos - 40);
    const end = Math.min(raw.length, pos + 40);
    return (start > 0 ? '…' : '') + raw.slice(start, end) + (end < raw.length ? '…' : '');
  }
  return undefined;
}

export function enhancePythonError(
  rawMessage: string,
  raw?: string,
  pos?: number,
  line?: number,
): EnhancedError {
  const msg = rawMessage || '';
  const snippet = buildSnippet(raw, pos, line);

  if (/indentation/i.test(msg)) {
    return {
      kind: 'IndentationError',
      title: 'Erro de indentação',
      message: 'Indentação inconsistente no código Python.',
      snippet,
      suggestion: 'Use 4 espaços ou 1 tab por nível de indentação.',
    };
  }

  if (/name.*not defined|variável.*não definida/i.test(msg)) {
    return {
      kind: 'NameError',
      title: 'Variável não definida',
      message: msg,
      snippet,
      suggestion: 'Verifique se a variável foi definida antes de ser usada.',
    };
  }

  if (/syntax error|token inesperado/i.test(msg)) {
    return {
      kind: 'SyntaxError',
      title: 'Erro de sintaxe',
      message: msg,
      snippet,
      suggestion: 'Verifique a sintaxe próxima à posição indicada.',
    };
  }

  if (/type error|tipos incompatíveis/i.test(msg)) {
    return {
      kind: 'TypeError',
      title: 'Erro de tipo',
      message: msg,
      snippet,
      suggestion: 'Verifique os tipos das variáveis sendo usadas.',
    };
  }

  return {
    kind: 'Unknown',
    title: 'Erro de execução',
    message: msg || 'Erro inesperado detectado.',
    snippet,
    suggestion: 'Verifique o código na posição indicada.',
  };
}
