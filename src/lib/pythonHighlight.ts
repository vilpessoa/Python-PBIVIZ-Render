import { StreamLanguage, type StreamParser } from '@codemirror/language';

const KEYWORDS = new Set([
  'and', 'as', 'assert', 'async', 'await', 'break', 'class', 'continue',
  'def', 'del', 'elif', 'else', 'except', 'finally', 'for', 'from',
  'global', 'if', 'import', 'in', 'is', 'lambda', 'nonlocal', 'not',
  'or', 'pass', 'raise', 'return', 'try', 'while', 'with', 'yield',
  'True', 'False', 'None',
]);

const BUILTINS = new Set([
  'abs', 'all', 'any', 'ascii', 'bin', 'bool', 'bytearray', 'bytes',
  'callable', 'chr', 'compile', 'complex', 'delattr', 'dict', 'dir',
  'divmod', 'enumerate', 'eval', 'exec', 'filter', 'float', 'format',
  'frozenset', 'getattr', 'globals', 'hasattr', 'hash', 'help', 'hex',
  'id', 'input', 'int', 'isinstance', 'issubclass', 'iter', 'len',
  'list', 'locals', 'map', 'max', 'memoryview', 'min', 'next', 'object',
  'oct', 'open', 'ord', 'pow', 'print', 'property', 'range', 'repr',
  'reversed', 'round', 'set', 'setattr', 'slice', 'sorted', 'staticmethod',
  'str', 'sum', 'super', 'tuple', 'type', 'vars', 'zip',
]);

type PythonMode = 'code' | 'string-single' | 'string-double' | 'string-triple-single' | 'string-triple-double' | 'fstring-single' | 'fstring-double' | 'comment';

interface PythonState {
  mode: PythonMode;
  indent: number;
  lastTokenWasDef: boolean;
}

const pythonParser: StreamParser<PythonState> = {
  name: 'python',

  startState(): PythonState {
    return { mode: 'code', indent: 0, lastTokenWasDef: false };
  },

  token(stream, state): string | null {
    if (state.mode === 'comment') {
      stream.skipToEnd();
      state.mode = 'code';
      return 'comment';
    }

    if (state.mode === 'string-triple-single') {
      if (stream.match("'''")) { state.mode = 'code'; return 'string'; }
      stream.next();
      return 'string';
    }

    if (state.mode === 'string-triple-double') {
      if (stream.match('"""')) { state.mode = 'code'; return 'string'; }
      stream.next();
      return 'string';
    }

    if (state.mode === 'string-single') {
      if (stream.peek() === "'") { stream.next(); state.mode = 'code'; return 'string'; }
      if (stream.peek() === '\\') { stream.next(); stream.next(); return 'string'; }
      if (stream.peek() === '\n') { state.mode = 'code'; return 'string'; }
      stream.next();
      return 'string';
    }

    if (state.mode === 'string-double') {
      if (stream.peek() === '"') { stream.next(); state.mode = 'code'; return 'string'; }
      if (stream.peek() === '\\') { stream.next(); stream.next(); return 'string'; }
      if (stream.peek() === '\n') { state.mode = 'code'; return 'string'; }
      stream.next();
      return 'string';
    }

    if (state.mode === 'fstring-single') {
      if (stream.peek() === "'") { stream.next(); state.mode = 'code'; return 'string'; }
      if (stream.peek() === '\\') { stream.next(); stream.next(); return 'string'; }
      if (stream.peek() === '\n') { state.mode = 'code'; return 'string'; }
      if (stream.peek() === '{') { stream.next(); return 'punctuation'; }
      if (stream.peek() === '}') { stream.next(); return 'punctuation'; }
      stream.next();
      return 'string';
    }

    if (state.mode === 'fstring-double') {
      if (stream.peek() === '"') { stream.next(); state.mode = 'code'; return 'string'; }
      if (stream.peek() === '\\') { stream.next(); stream.next(); return 'string'; }
      if (stream.peek() === '\n') { state.mode = 'code'; return 'string'; }
      if (stream.peek() === '{') { stream.next(); return 'punctuation'; }
      if (stream.peek() === '}') { stream.next(); return 'punctuation'; }
      stream.next();
      return 'string';
    }

    if (stream.eatSpace()) return null;

    // Comment
    if (stream.peek() === '#') {
      stream.skipToEnd();
      return 'comment';
    }

    // Triple-quoted strings
    if (stream.match('"""')) {
      state.mode = 'string-triple-double';
      return 'string';
    }
    if (stream.match("'''")) {
      state.mode = 'string-triple-single';
      return 'string';
    }

    // f-strings
    if (stream.match(/^f"/i)) {
      state.mode = 'fstring-double';
      return 'string';
    }
    if (stream.match(/^f'/i)) {
      state.mode = 'fstring-single';
      return 'string';
    }

    // Strings
    if (stream.peek() === '"') {
      stream.next();
      state.mode = 'string-double';
      return 'string';
    }
    if (stream.peek() === "'") {
      stream.next();
      state.mode = 'string-single';
      return 'string';
    }

    // Number
    if (stream.match(/^[0-9]+(\.[0-9]+)?([eE][+-]?[0-9]+)?/)) {
      return 'number';
    }

    // Decorator
    if (stream.peek() === '@') {
      stream.next();
      stream.eatWhile(/[\w.]/);
      return 'meta';
    }

    // Identifier / keyword
    if (/[A-Za-z_À-ÿ]/.test(stream.peek() ?? '')) {
      let word = '';
      stream.eatWhile(/[\wÀ-ÿ]/);
      // Get the word from the stream position
      const cur = stream as unknown as { current: () => string };
      word = typeof cur.current === 'function' ? cur.current() : '';

      const wasFunc = state.lastTokenWasDef;
      state.lastTokenWasDef = word === 'def' || word === 'class';

      if (KEYWORDS.has(word)) return 'keyword';
      if (wasFunc) return 'def';
      if (BUILTINS.has(word)) return 'builtin';

      // Check if followed by '(' → function call
      if (stream.peek() === '(') return 'keyword';

      return 'variable';
    }

    // Operators
    if (stream.match(/^(==|!=|<=|>=|<<|>>|\*\*|\/\/|->|:=)/)) return 'operator';
    if (/[+\-*/%&|^~<>=!]/.test(stream.peek() ?? '')) {
      stream.next();
      return 'operator';
    }

    // Punctuation
    if (/[()[\]{},.:;]/.test(stream.peek() ?? '')) {
      stream.next();
      return 'punctuation';
    }

    stream.next();
    return null;
  },

};

export const pythonLanguage = StreamLanguage.define(pythonParser);
