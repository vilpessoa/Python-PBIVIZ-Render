import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, Decoration, type DecorationSet, keymap } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
import { dracula } from '@uiw/codemirror-theme-dracula';
import { nord } from '@uiw/codemirror-theme-nord';
import { monokai } from '@uiw/codemirror-theme-monokai';
import { tokyoNight } from '@uiw/codemirror-theme-tokyo-night';
import { createTheme } from '@uiw/codemirror-themes';
import { tags as t } from '@lezer/highlight';
import { highlightSelectionMatches, searchKeymap } from '@codemirror/search';
import { defaultKeymap, historyKeymap, history, undo, redo } from '@codemirror/commands';
import { bracketMatching, indentOnInput } from '@codemirror/language';
import {
  lineNumbers,
  highlightActiveLineGutter,
  highlightActiveLine,
} from '@codemirror/view';
import { autocompletion, closeBrackets } from '@codemirror/autocomplete';
import { ArrowUp } from 'lucide-react';
import { colorPickerExtension, type SwatchClickCallback } from '@/lib/colorPickerExtension';
import { FloatingColorPicker } from '@/components/FloatingColorPicker';
import type { PythonEditorTheme } from '@/lib/storage';

export interface PythonEditorHandle {
  scrollAndSelect: (from: number, to: number) => void;
  getOffset: () => number;
  undo: () => void;
  redo: () => void;
  getView: () => EditorView | undefined;
}

interface Props {
  value: string;
  onChange: (v: string) => void;
  theme: 'light' | 'dark';
  pythonEditorTheme: PythonEditorTheme;
  fontSize: number;
  onCursorChange?: (cursor: { offset: number; line: number; col: number }) => void;
  onDocStats?: (stats: { lineCount: number }) => void;
  errorPos?: number | null;
  errorEndPos?: number | null;
}

// Error decoration
const setErrorEffect = StateEffect.define<{ from: number; to: number } | null>();

const errorField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setErrorEffect)) {
        if (!e.value) {
          deco = Decoration.none;
        } else {
          const { from, to } = e.value;
          const docLen = tr.state.doc.length;
          const safeFrom = Math.min(from, docLen);
          const safeTo = Math.min(to, docLen);
          const lineFrom = tr.state.doc.lineAt(safeFrom).number;
          const lineTo = tr.state.doc.lineAt(safeTo > safeFrom ? safeTo - 1 : safeFrom).number;
          const builder = new RangeSetBuilder<Decoration>();
          for (let ln = lineFrom; ln <= lineTo; ln++) {
            const line = tr.state.doc.line(ln);
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-error-line' }));
          }
          const lineDecos = builder.finish();
          if (safeFrom < safeTo) {
            const markBuilder = new RangeSetBuilder<Decoration>();
            markBuilder.add(safeFrom, safeTo, Decoration.mark({ class: 'cm-error-mark' }));
            deco = lineDecos.update({ add: [Decoration.mark({ class: 'cm-error-mark' }).range(safeFrom, safeTo)] });
          } else {
            deco = lineDecos;
          }
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

function buildDefaultTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? 'hsl(230 15% 10%)' : 'hsl(0 0% 100%)',
      foreground: isDark ? 'hsl(230 20% 90%)' : 'hsl(230 15% 10%)',
      caret: 'hsl(var(--primary))',
      selection: isDark ? 'hsl(217 91% 50% / 30%)' : 'hsl(217 91% 50% / 20%)',
      selectionMatch: isDark ? 'hsl(217 91% 50% / 15%)' : 'hsl(217 91% 50% / 10%)',
      lineHighlight: isDark ? 'hsl(230 15% 14%)' : 'hsl(230 20% 97%)',
      gutterBackground: isDark ? 'hsl(230 15% 10%)' : 'hsl(230 20% 99%)',
      gutterForeground: isDark ? 'hsl(230 10% 40%)' : 'hsl(230 10% 65%)',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#ff79c6' : '#d63384' },
      { tag: t.string, color: isDark ? '#f1fa8c' : '#e3760c' },
      { tag: t.comment, color: isDark ? '#6272a4' : '#8a9ba8', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#bd93f9' : '#7c3aed' },
      { tag: t.operator, color: isDark ? '#ff79c6' : '#d63384' },
      { tag: t.function(t.variableName), color: isDark ? '#50fa7b' : '#1d7c3c' },
      { tag: t.variableName, color: isDark ? '#f8f8f2' : '#1e293b' },
      { tag: t.definition(t.variableName), color: isDark ? '#8be9fd' : '#0369a1' },
      { tag: t.typeName, color: isDark ? '#8be9fd' : '#0369a1' },
      { tag: t.bool, color: isDark ? '#bd93f9' : '#7c3aed' },
      { tag: t.null, color: isDark ? '#bd93f9' : '#7c3aed' },
      { tag: t.punctuation, color: isDark ? '#f8f8f2' : '#475569' },
      { tag: t.propertyName, color: isDark ? '#66d9e8' : '#0891b2' },
    ],
  });
}

function buildSoftTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#1a1b26' : '#f8f7f4',
      foreground: isDark ? '#c0caf5' : '#3d3d3d',
      caret: '#7aa2f7',
      selection: isDark ? 'rgba(122,162,247,0.25)' : 'rgba(122,162,247,0.18)',
      selectionMatch: isDark ? 'rgba(122,162,247,0.15)' : 'rgba(122,162,247,0.10)',
      lineHighlight: isDark ? '#1e2030' : '#f0ede6',
      gutterBackground: isDark ? '#1a1b26' : '#f8f7f4',
      gutterForeground: isDark ? '#545c7e' : '#9b8fa6',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#bb9af7' : '#8839ef' },
      { tag: t.string, color: isDark ? '#9ece6a' : '#40a02b' },
      { tag: t.comment, color: isDark ? '#565f89' : '#8c8fa1', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#ff9e64' : '#fe640b' },
      { tag: t.function(t.variableName), color: isDark ? '#7aa2f7' : '#1e66f5' },
      { tag: t.variableName, color: isDark ? '#c0caf5' : '#3d3d3d' },
      { tag: t.typeName, color: isDark ? '#2ac3de' : '#209fb5' },
      { tag: t.bool, color: isDark ? '#ff9e64' : '#fe640b' },
      { tag: t.operator, color: isDark ? '#89ddff' : '#04a5e5' },
    ],
  });
}

function buildOneTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#282c34' : '#fafafa',
      foreground: isDark ? '#abb2bf' : '#383a42',
      caret: isDark ? '#61afef' : '#0184bc',
      selection: isDark ? 'rgba(97, 175, 239, 0.25)' : 'rgba(1, 132, 188, 0.15)',
      selectionMatch: isDark ? 'rgba(97, 175, 239, 0.15)' : 'rgba(1, 132, 188, 0.10)',
      lineHighlight: isDark ? '#2c313c' : '#f5f5f5',
      gutterBackground: isDark ? '#282c34' : '#fafafa',
      gutterForeground: isDark ? '#5c6370' : '#a0a1a7',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#c678dd' : '#a626a4' },
      { tag: t.string, color: isDark ? '#98c379' : '#50a14f' },
      { tag: t.comment, color: isDark ? '#5c6370' : '#a0a1a7', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#d19a66' : '#986801' },
      { tag: t.function(t.variableName), color: isDark ? '#61afef' : '#0184bc' },
      { tag: t.variableName, color: isDark ? '#abb2bf' : '#383a42' },
      { tag: t.operator, color: isDark ? '#56b6c2' : '#0184bc' },
      { tag: t.bool, color: isDark ? '#d19a66' : '#986801' },
      { tag: t.typeName, color: isDark ? '#e06c75' : '#e45649' },
      { tag: t.propertyName, color: isDark ? '#e06c75' : '#e45649' },
    ],
  });
}

function buildGitHubTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#0d1117' : '#ffffff',
      foreground: isDark ? '#c9d1d9' : '#24292f',
      caret: isDark ? '#58a6ff' : '#0969da',
      selection: isDark ? 'rgba(88, 166, 255, 0.25)' : 'rgba(9, 105, 218, 0.15)',
      selectionMatch: isDark ? 'rgba(88, 166, 255, 0.15)' : 'rgba(9, 105, 218, 0.10)',
      lineHighlight: isDark ? '#161b22' : '#f6f8fa',
      gutterBackground: isDark ? '#0d1117' : '#ffffff',
      gutterForeground: isDark ? '#30363d' : '#d0d7de',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#ff7b72' : '#d1242f' },
      { tag: t.string, color: isDark ? '#a5d6ff' : '#0a3069' },
      { tag: t.comment, color: isDark ? '#8b949e' : '#57606a', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#79c0ff' : '#0969da' },
      { tag: t.function(t.variableName), color: isDark ? '#d2a8ff' : '#8250df' },
      { tag: t.variableName, color: isDark ? '#c9d1d9' : '#24292f' },
      { tag: t.operator, color: isDark ? '#ff7b72' : '#d1242f' },
      { tag: t.bool, color: isDark ? '#79c0ff' : '#0969da' },
      { tag: t.typeName, color: isDark ? '#79c0ff' : '#0969da' },
      { tag: t.propertyName, color: isDark ? '#79c0ff' : '#0969da' },
    ],
  });
}

function buildGruvboxTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#282828' : '#fbf1c7',
      foreground: isDark ? '#ebdbb2' : '#3c3836',
      caret: isDark ? '#83a598' : '#8f3f2f',
      selection: isDark ? 'rgba(131, 165, 152, 0.25)' : 'rgba(143, 63, 47, 0.15)',
      selectionMatch: isDark ? 'rgba(131, 165, 152, 0.15)' : 'rgba(143, 63, 47, 0.10)',
      lineHighlight: isDark ? '#32302f' : '#f3f1e8',
      gutterBackground: isDark ? '#282828' : '#fbf1c7',
      gutterForeground: isDark ? '#928374' : '#a89984',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#fb4934' : '#9d0006' },
      { tag: t.string, color: isDark ? '#b8bb26' : '#79740e' },
      { tag: t.comment, color: isDark ? '#928374' : '#a89984', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#d3869b' : '#b57614' },
      { tag: t.function(t.variableName), color: isDark ? '#83a598' : '#076678' },
      { tag: t.variableName, color: isDark ? '#ebdbb2' : '#3c3836' },
      { tag: t.operator, color: isDark ? '#fb4934' : '#9d0006' },
      { tag: t.bool, color: isDark ? '#d3869b' : '#b57614' },
      { tag: t.typeName, color: isDark ? '#fabd2f' : '#b57614' },
      { tag: t.propertyName, color: isDark ? '#8ec07c' : '#427b58' },
    ],
  });
}

function buildAyuTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#0f1419' : '#fafafa',
      foreground: isDark ? '#e6e1cf' : '#575f66',
      caret: isDark ? '#f07178' : '#f07178',
      selection: isDark ? 'rgba(240, 113, 120, 0.25)' : 'rgba(240, 113, 120, 0.15)',
      selectionMatch: isDark ? 'rgba(240, 113, 120, 0.15)' : 'rgba(240, 113, 120, 0.10)',
      lineHighlight: isDark ? '#151a1f' : '#f5f5f5',
      gutterBackground: isDark ? '#0f1419' : '#fafafa',
      gutterForeground: isDark ? '#464b50' : '#adb7bf',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#ff7733' : '#f07178' },
      { tag: t.string, color: isDark ? '#b8cc52' : '#86b300' },
      { tag: t.comment, color: isDark ? '#626a73' : '#949494', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#ffb454' : '#f5a623' },
      { tag: t.function(t.variableName), color: isDark ? '#59c2ff' : '#55b4d4' },
      { tag: t.variableName, color: isDark ? '#e6e1cf' : '#575f66' },
      { tag: t.operator, color: isDark ? '#f07178' : '#f07178' },
      { tag: t.bool, color: isDark ? '#ffb454' : '#f5a623' },
      { tag: t.typeName, color: isDark ? '#59c2ff' : '#55b4d4' },
      { tag: t.propertyName, color: isDark ? '#a37acc' : '#a37acc' },
    ],
  });
}

export const PythonEditor = forwardRef<PythonEditorHandle, Props>(
  function PythonEditor(
    {
      value,
      onChange,
      theme,
      pythonEditorTheme,
      fontSize,
      onCursorChange,
      onDocStats,
      errorPos,
      errorEndPos,
    },
    ref,
  ) {
    const cmRef = useRef<ReactCodeMirrorRef>(null);
    const [showScrollTop, setShowScrollTop] = useState(false);
    const [colorPicker, setColorPicker] = useState<{
      color: string;
      position: { x: number; y: number };
      from: number;
      to: number;
    } | null>(null);

    // Stable callback ref for colorPickerExtension
    const swatchCallbackRef = useRef<SwatchClickCallback | null>(null);
    swatchCallbackRef.current = ({ color, from, to, rect }) => {
      setColorPicker({
        color,
        position: { x: rect.left, y: rect.bottom },
        from,
        to,
      });
    };

    useImperativeHandle(ref, () => ({
      scrollAndSelect(from: number, to: number) {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({ selection: { anchor: from, head: to }, scrollIntoView: true });
        view.focus();
      },
      getOffset() {
        const view = cmRef.current?.view;
        if (!view) return 0;
        return view.state.selection.main.head;
      },
      undo() {
        const view = cmRef.current?.view;
        if (view) undo(view);
      },
      redo() {
        const view = cmRef.current?.view;
        if (view) redo(view);
      },
      getView() {
        return cmRef.current?.view;
      },
    }));

    // Error decorations
    useEffect(() => {
      const view = cmRef.current?.view;
      if (!view) return;
      if (errorPos != null && errorPos >= 0) {
        const docLen = view.state.doc.length;
        const from = Math.min(errorPos, docLen);
        const to = Math.min(
          errorEndPos != null && errorEndPos > errorPos ? errorEndPos : from + 1,
          docLen,
        );
        view.dispatch({ effects: setErrorEffect.of({ from, to }) });
      } else {
        view.dispatch({ effects: setErrorEffect.of(null) });
      }
    }, [errorPos, errorEndPos]);

    // Cursor tracking
    const onUpdate = (vu: import('@codemirror/view').ViewUpdate) => {
      if (vu.selectionSet || vu.docChanged) {
        const sel = vu.state.selection.main;
        const line = vu.state.doc.lineAt(sel.head);
        onCursorChange?.({ offset: sel.head, line: line.number, col: sel.head - line.from + 1 });
        onDocStats?.({ lineCount: vu.state.doc.lines });
      }
    };

    // Global paste routing to editor
    useEffect(() => {
      function onPaste(e: ClipboardEvent) {
        const target = e.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return;
        const view = cmRef.current?.view;
        if (!view) return;
        const text = e.clipboardData?.getData('text');
        if (!text) return;
        e.preventDefault();
        view.dispatch(view.state.replaceSelection(text));
        view.focus();
      }
      window.addEventListener('paste', onPaste);
      return () => window.removeEventListener('paste', onPaste);
    }, []);

    // Resolve active theme
    const isDark = theme === 'dark';
    let resolvedTheme: unknown;
    if (pythonEditorTheme === 'dracula') resolvedTheme = dracula;
    else if (pythonEditorTheme === 'nord') resolvedTheme = nord;
    else if (pythonEditorTheme === 'monokai') resolvedTheme = monokai;
    else if (pythonEditorTheme === 'tokyo') resolvedTheme = tokyoNight;
    else if (pythonEditorTheme === 'soft-dark') resolvedTheme = buildSoftTheme(true);
    else if (pythonEditorTheme === 'soft') resolvedTheme = buildSoftTheme(isDark);
    else if (pythonEditorTheme === 'one-pro') resolvedTheme = buildOneTheme(isDark);
    else if (pythonEditorTheme === 'github') resolvedTheme = buildGitHubTheme(isDark);
    else if (pythonEditorTheme === 'gruvbox') resolvedTheme = buildGruvboxTheme(isDark);
    else if (pythonEditorTheme === 'ayu') resolvedTheme = buildAyuTheme(isDark);
    else resolvedTheme = buildDefaultTheme(isDark);

    const extensions = [
      python(),
      history(),
      lineNumbers(),
      highlightActiveLineGutter(),
      highlightActiveLine(),
      bracketMatching(),
      closeBrackets(),
      indentOnInput(),
      autocompletion(),
      highlightSelectionMatches(),
      keymap.of([...defaultKeymap, ...historyKeymap, ...searchKeymap]),
      errorField,
      colorPickerExtension(swatchCallbackRef),
      EditorView.theme({
        '&': { height: '100%', fontSize: `${fontSize}px` },
        '.cm-scroller': { overflow: 'auto', fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
        '.cm-error-line': { backgroundColor: 'hsl(var(--destructive) / 0.08)' },
        '.cm-error-mark': {
          textDecoration: 'underline wavy hsl(var(--destructive))',
          backgroundColor: 'hsl(var(--destructive) / 0.12)',
        },
      }),
      EditorView.domEventHandlers({
        scroll() {
          const view = cmRef.current?.view;
          if (view) setShowScrollTop(view.scrollDOM.scrollTop > 300);
        },
      }),
    ];

    return (
      <div className="relative flex h-full w-full flex-col overflow-hidden">
        <CodeMirror
          ref={cmRef}
          value={value}
          onChange={onChange}
          theme={resolvedTheme as never}
          extensions={extensions}
          onUpdate={onUpdate}
          basicSetup={false}
          style={{ height: '100%', overflow: 'hidden' }}
        />

        {showScrollTop && (
          <button
            type="button"
            aria-label="Ir ao topo"
            onClick={() => {
              const view = cmRef.current?.view;
              if (view) {
                view.dispatch({ effects: EditorView.scrollIntoView(0) });
                view.scrollDOM.scrollTop = 0;
              }
            }}
            className="absolute bottom-4 right-4 flex h-7 w-7 items-center justify-center rounded-full bg-surface-elevated border border-border shadow-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors"
          >
            <ArrowUp className="h-3.5 w-3.5" />
          </button>
        )}

        {colorPicker && (
          <FloatingColorPicker
            color={colorPicker.color}
            position={colorPicker.position}
            onColorChange={(color) => {
              const view = cmRef.current?.view;
              if (!view) return;
              view.dispatch({
                changes: { from: colorPicker.from, to: colorPicker.to, insert: color },
              });
              setColorPicker((p) => p ? { ...p, color, to: p.from + color.length } : null);
            }}
            onClose={() => setColorPicker(null)}
          />
        )}
      </div>
    );
  },
);
