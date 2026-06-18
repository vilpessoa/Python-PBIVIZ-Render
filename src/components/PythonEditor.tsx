import {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import CodeMirror, { type ReactCodeMirrorRef } from '@uiw/react-codemirror';
import { EditorView, Decoration, type DecorationSet, keymap, WidgetType } from '@codemirror/view';
import { StateField, StateEffect, RangeSetBuilder } from '@codemirror/state';
import { python } from '@codemirror/lang-python';
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

export interface RemovedLineGroup {
  atLine: number;    // 1-indexed line in the NEW code before which to show ghosts
  texts: string[];   // removed line contents
}

class RemovedLinesWidget extends WidgetType {
  private lines: string[];
  constructor(lines: string[]) { super(); this.lines = lines; }
  eq(other: RemovedLinesWidget) { return this.lines.join('\n') === other.lines.join('\n'); }
  toDOM() {
    const wrap = document.createElement('div');
    wrap.className = 'cm-diff-removed-ghost';
    for (const text of this.lines) {
      const el = document.createElement('div');
      el.className = 'cm-diff-del';
      const marker = document.createElement('span');
      marker.className = 'cm-diff-del-marker';
      marker.textContent = '-';
      const content = document.createElement('span');
      content.className = 'cm-diff-del-text';
      content.textContent = text || ' ';
      el.appendChild(marker);
      el.appendChild(content);
      wrap.appendChild(el);
    }
    return wrap;
  }
}

export interface PythonEditorHandle {
  scrollAndSelect: (from: number, to: number) => void;
  getOffset: () => number;
  undo: () => void;
  redo: () => void;
  getView: () => EditorView | undefined;
  /** Highlights the given 1-indexed line numbers in green (added lines from a diff). Pass [] to clear. */
  highlightAddedLines: (lineNumbers: number[]) => void;
  /** Shows ghost (phantom) removed lines at the given positions. Pass [] to clear. */
  showRemovedGhosts: (groups: RemovedLineGroup[]) => void;
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

// Diff highlight decoration (added lines from TESS)
const setDiffEffect = StateEffect.define<number[]>(); // 1-indexed line numbers; empty = clear

const diffField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setDiffEffect)) {
        if (e.value.length === 0) {
          deco = Decoration.none;
        } else {
          const builder = new RangeSetBuilder<Decoration>();
          const sorted = [...e.value].sort((a, b) => a - b);
          const docLines = tr.state.doc.lines;
          for (const ln of sorted) {
            if (ln < 1 || ln > docLines) continue;
            const line = tr.state.doc.line(ln);
            builder.add(line.from, line.from, Decoration.line({ class: 'cm-diff-add' }));
          }
          deco = builder.finish();
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

// Ghost lines for removed content (widget decorations — not part of the document)
const setRemovedGhostsEffect = StateEffect.define<RemovedLineGroup[]>();

const removedGhostsField = StateField.define<DecorationSet>({
  create() { return Decoration.none; },
  update(deco, tr) {
    deco = deco.map(tr.changes);
    for (const e of tr.effects) {
      if (e.is(setRemovedGhostsEffect)) {
        if (e.value.length === 0) {
          deco = Decoration.none;
        } else {
          const builder = new RangeSetBuilder<Decoration>();
          const sorted = [...e.value].sort((a, b) => a.atLine - b.atLine);
          const docLines = tr.state.doc.lines;
          for (const group of sorted) {
            const ln = Math.max(1, Math.min(group.atLine, docLines));
            const line = tr.state.doc.line(ln);
            builder.add(line.from, line.from, Decoration.widget({
              widget: new RemovedLinesWidget(group.texts),
              side: -1,
              block: true,
            }));
          }
          deco = builder.finish();
        }
      }
    }
    return deco;
  },
  provide: (f) => EditorView.decorations.from(f),
});

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

function buildGitHubTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#0d1117' : '#ffffff',
      foreground: isDark ? '#c9d1d9' : '#24292f',
      caret: isDark ? '#58a6ff' : '#0969da',
      selection: isDark ? 'rgba(88,166,255,0.25)' : 'rgba(9,105,218,0.15)',
      selectionMatch: isDark ? 'rgba(88,166,255,0.15)' : 'rgba(9,105,218,0.08)',
      lineHighlight: isDark ? '#161b22' : '#f6f8fa',
      gutterBackground: isDark ? '#0d1117' : '#f6f8fa',
      gutterForeground: isDark ? '#484f58' : '#8c959f',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#ff7b72' : '#cf222e' },
      { tag: t.string, color: isDark ? '#a5d6ff' : '#0a3069' },
      { tag: t.comment, color: isDark ? '#8b949e' : '#6e7781', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#79c0ff' : '#0550ae' },
      { tag: t.function(t.variableName), color: isDark ? '#d2a8ff' : '#8250df' },
      { tag: t.variableName, color: isDark ? '#c9d1d9' : '#24292f' },
      { tag: t.definition(t.variableName), color: isDark ? '#ffa657' : '#953800' },
      { tag: t.operator, color: isDark ? '#ff7b72' : '#cf222e' },
      { tag: t.bool, color: isDark ? '#79c0ff' : '#0550ae' },
      { tag: t.null, color: isDark ? '#79c0ff' : '#0550ae' },
      { tag: t.typeName, color: isDark ? '#79c0ff' : '#0550ae' },
      { tag: t.propertyName, color: isDark ? '#79c0ff' : '#0550ae' },
      { tag: t.punctuation, color: isDark ? '#c9d1d9' : '#24292f' },
    ],
  });
}

function buildCatppuccinTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#1e1e2e' : '#eff1f5',
      foreground: isDark ? '#cdd6f4' : '#4c4f69',
      caret: isDark ? '#f5e0dc' : '#dc8a78',
      selection: isDark ? 'rgba(203,166,247,0.22)' : 'rgba(136,57,239,0.15)',
      selectionMatch: isDark ? 'rgba(203,166,247,0.12)' : 'rgba(136,57,239,0.08)',
      lineHighlight: isDark ? '#181825' : '#e6e9f0',
      gutterBackground: isDark ? '#1e1e2e' : '#eff1f5',
      gutterForeground: isDark ? '#585b70' : '#8c8fa1',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#cba6f7' : '#8839ef' },
      { tag: t.string, color: isDark ? '#a6e3a1' : '#40a02b' },
      { tag: t.comment, color: isDark ? '#6c7086' : '#9ca0b0', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#fab387' : '#fe640b' },
      { tag: t.function(t.variableName), color: isDark ? '#89b4fa' : '#1e66f5' },
      { tag: t.variableName, color: isDark ? '#cdd6f4' : '#4c4f69' },
      { tag: t.definition(t.variableName), color: isDark ? '#89dceb' : '#209fb5' },
      { tag: t.operator, color: isDark ? '#89dceb' : '#04a5e5' },
      { tag: t.bool, color: isDark ? '#fab387' : '#fe640b' },
      { tag: t.null, color: isDark ? '#f38ba8' : '#d20f39' },
      { tag: t.typeName, color: isDark ? '#f5c2e7' : '#ea76cb' },
      { tag: t.propertyName, color: isDark ? '#89dceb' : '#209fb5' },
      { tag: t.punctuation, color: isDark ? '#9399b2' : '#7c7f93' },
    ],
  });
}

function buildRosePineTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#232136' : '#faf4ed',
      foreground: isDark ? '#e0def4' : '#575279',
      caret: isDark ? '#c4a7e7' : '#b4637a',
      selection: isDark ? 'rgba(196,167,231,0.20)' : 'rgba(180,99,122,0.12)',
      selectionMatch: isDark ? 'rgba(196,167,231,0.10)' : 'rgba(180,99,122,0.07)',
      lineHighlight: isDark ? '#2a273f' : '#f2e9e1',
      gutterBackground: isDark ? '#232136' : '#faf4ed',
      gutterForeground: isDark ? '#59546d' : '#9893a5',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#c4a7e7' : '#b4637a' },
      { tag: t.string, color: isDark ? '#9ccfd8' : '#56949f' },
      { tag: t.comment, color: isDark ? '#59546d' : '#9893a5', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#eb6f92' : '#d7827a' },
      { tag: t.function(t.variableName), color: isDark ? '#3e8fb0' : '#286983' },
      { tag: t.variableName, color: isDark ? '#e0def4' : '#575279' },
      { tag: t.definition(t.variableName), color: isDark ? '#f6c177' : '#ea9d34' },
      { tag: t.operator, color: isDark ? '#908caa' : '#907aa9' },
      { tag: t.bool, color: isDark ? '#eb6f92' : '#d7827a' },
      { tag: t.null, color: isDark ? '#908caa' : '#907aa9' },
      { tag: t.typeName, color: isDark ? '#ea9a97' : '#b4637a' },
      { tag: t.propertyName, color: isDark ? '#9ccfd8' : '#56949f' },
      { tag: t.punctuation, color: isDark ? '#908caa' : '#797593' },
    ],
  });
}

function buildDraculaTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#282a36' : '#f8f8f2',
      foreground: isDark ? '#f8f8f2' : '#282a36',
      caret: isDark ? '#f8f8f0' : '#6272a4',
      selection: isDark ? 'rgba(68,71,90,0.7)' : 'rgba(98,114,164,0.20)',
      selectionMatch: isDark ? 'rgba(68,71,90,0.5)' : 'rgba(98,114,164,0.12)',
      lineHighlight: isDark ? '#44475a' : '#f0f0f4',
      gutterBackground: isDark ? '#282a36' : '#f8f8f2',
      gutterForeground: isDark ? '#6272a4' : '#a0a8c4',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#ff79c6' : '#c4366e' },
      { tag: t.string, color: isDark ? '#f1fa8c' : '#c07c1a' },
      { tag: t.comment, color: isDark ? '#6272a4' : '#7b8fa1', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#bd93f9' : '#7c3aed' },
      { tag: t.function(t.variableName), color: isDark ? '#50fa7b' : '#2da94f' },
      { tag: t.variableName, color: isDark ? '#f8f8f2' : '#282a36' },
      { tag: t.definition(t.variableName), color: isDark ? '#8be9fd' : '#0369a1' },
      { tag: t.operator, color: isDark ? '#ff79c6' : '#c4366e' },
      { tag: t.bool, color: isDark ? '#bd93f9' : '#7c3aed' },
      { tag: t.null, color: isDark ? '#bd93f9' : '#7c3aed' },
      { tag: t.typeName, color: isDark ? '#8be9fd' : '#0369a1' },
      { tag: t.propertyName, color: isDark ? '#66d9e8' : '#0891b2' },
      { tag: t.punctuation, color: isDark ? '#f8f8f2' : '#44475a' },
    ],
  });
}

function buildTokyoTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#24283b' : '#e1e2e7',
      foreground: isDark ? '#c0caf5' : '#3760bf',
      caret: isDark ? '#c0caf5' : '#3760bf',
      selection: isDark ? 'rgba(187,154,247,0.22)' : 'rgba(55,96,191,0.15)',
      selectionMatch: isDark ? 'rgba(187,154,247,0.12)' : 'rgba(55,96,191,0.08)',
      lineHighlight: isDark ? '#292e42' : '#d5d6db',
      gutterBackground: isDark ? '#24283b' : '#e1e2e7',
      gutterForeground: isDark ? '#565f89' : '#9699a9',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#bb9af7' : '#9854f1' },
      { tag: t.string, color: isDark ? '#9ece6a' : '#587539' },
      { tag: t.comment, color: isDark ? '#565f89' : '#848cb8', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#ff9e64' : '#b15c00' },
      { tag: t.function(t.variableName), color: isDark ? '#7aa2f7' : '#2e7de9' },
      { tag: t.variableName, color: isDark ? '#c0caf5' : '#3760bf' },
      { tag: t.definition(t.variableName), color: isDark ? '#e0af68' : '#8c6c3e' },
      { tag: t.operator, color: isDark ? '#89ddff' : '#007197' },
      { tag: t.bool, color: isDark ? '#ff9e64' : '#b15c00' },
      { tag: t.null, color: isDark ? '#bb9af7' : '#9854f1' },
      { tag: t.typeName, color: isDark ? '#2ac3de' : '#007197' },
      { tag: t.propertyName, color: isDark ? '#73daca' : '#387068' },
      { tag: t.punctuation, color: isDark ? '#89ddff' : '#007197' },
    ],
  });
}

function buildOneTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#282c34' : '#fafafa',
      foreground: isDark ? '#abb2bf' : '#383a42',
      caret: isDark ? '#61afef' : '#4078f2',
      selection: isDark ? 'rgba(97,175,239,0.25)' : 'rgba(64,120,242,0.15)',
      selectionMatch: isDark ? 'rgba(97,175,239,0.12)' : 'rgba(64,120,242,0.08)',
      lineHighlight: isDark ? '#2c313c' : '#f4f4f4',
      gutterBackground: isDark ? '#282c34' : '#fafafa',
      gutterForeground: isDark ? '#5c6370' : '#9d9d9f',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#c678dd' : '#a626a4' },
      { tag: t.string, color: isDark ? '#98c379' : '#50a14f' },
      { tag: t.comment, color: isDark ? '#5c6370' : '#a0a1a7', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#d19a66' : '#986801' },
      { tag: t.function(t.variableName), color: isDark ? '#61afef' : '#4078f2' },
      { tag: t.variableName, color: isDark ? '#abb2bf' : '#383a42' },
      { tag: t.definition(t.variableName), color: isDark ? '#e06c75' : '#e45649' },
      { tag: t.operator, color: isDark ? '#56b6c2' : '#0184bc' },
      { tag: t.bool, color: isDark ? '#d19a66' : '#986801' },
      { tag: t.null, color: isDark ? '#d19a66' : '#986801' },
      { tag: t.typeName, color: isDark ? '#e06c75' : '#e45649' },
      { tag: t.propertyName, color: isDark ? '#e06c75' : '#e45649' },
      { tag: t.punctuation, color: isDark ? '#abb2bf' : '#383a42' },
    ],
  });
}

function buildNordTheme(isDark: boolean) {
  return createTheme({
    theme: isDark ? 'dark' : 'light',
    settings: {
      background: isDark ? '#2e3440' : '#eceff4',
      foreground: isDark ? '#d8dee9' : '#2e3440',
      caret: isDark ? '#88c0d0' : '#5e81ac',
      selection: isDark ? 'rgba(136,192,208,0.22)' : 'rgba(94,129,172,0.18)',
      selectionMatch: isDark ? 'rgba(136,192,208,0.12)' : 'rgba(94,129,172,0.10)',
      lineHighlight: isDark ? '#3b4252' : '#e5e9f0',
      gutterBackground: isDark ? '#2e3440' : '#eceff4',
      gutterForeground: isDark ? '#4c566a' : '#8994a6',
    },
    styles: [
      { tag: t.keyword, color: isDark ? '#81a1c1' : '#5e81ac' },
      { tag: t.string, color: isDark ? '#a3be8c' : '#4c9a52' },
      { tag: t.comment, color: isDark ? '#616e88' : '#7e8fa6', fontStyle: 'italic' },
      { tag: t.number, color: isDark ? '#b48ead' : '#9457a0' },
      { tag: t.function(t.variableName), color: isDark ? '#88c0d0' : '#4c7db3' },
      { tag: t.variableName, color: isDark ? '#d8dee9' : '#2e3440' },
      { tag: t.definition(t.variableName), color: isDark ? '#8fbcbb' : '#3e7d7a' },
      { tag: t.operator, color: isDark ? '#81a1c1' : '#5e81ac' },
      { tag: t.bool, color: isDark ? '#b48ead' : '#9457a0' },
      { tag: t.null, color: isDark ? '#b48ead' : '#9457a0' },
      { tag: t.typeName, color: isDark ? '#8fbcbb' : '#3e7d7a' },
      { tag: t.propertyName, color: isDark ? '#88c0d0' : '#4c7db3' },
      { tag: t.punctuation, color: isDark ? '#eceff4' : '#4c566a' },
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

// Always-dark themes — stay dark regardless of app light/dark mode

function buildMoonlightTheme(_isDark: boolean) {
  return createTheme({
    theme: 'dark',
    settings: {
      background: '#212337',
      foreground: '#c8d3f5',
      caret: '#c099ff',
      selection: 'rgba(192,153,255,0.20)',
      selectionMatch: 'rgba(192,153,255,0.12)',
      lineHighlight: '#1e2030',
      gutterBackground: '#212337',
      gutterForeground: '#444a73',
    },
    styles: [
      { tag: t.keyword, color: '#c099ff' },
      { tag: t.string, color: '#c3e88d' },
      { tag: t.comment, color: '#636da6', fontStyle: 'italic' },
      { tag: t.number, color: '#ff966c' },
      { tag: t.function(t.variableName), color: '#82aaff' },
      { tag: t.variableName, color: '#c8d3f5' },
      { tag: t.definition(t.variableName), color: '#4fd6be' },
      { tag: t.operator, color: '#86e1fc' },
      { tag: t.bool, color: '#ff966c' },
      { tag: t.null, color: '#c099ff' },
      { tag: t.typeName, color: '#ffc777' },
      { tag: t.propertyName, color: '#4fd6be' },
      { tag: t.punctuation, color: '#89ddff' },
    ],
  });
}

function buildKanagawaTheme(_isDark: boolean) {
  return createTheme({
    theme: 'dark',
    settings: {
      background: '#1f1f28',
      foreground: '#dcd7ba',
      caret: '#c8c093',
      selection: 'rgba(200,192,147,0.18)',
      selectionMatch: 'rgba(200,192,147,0.10)',
      lineHighlight: '#2a2a37',
      gutterBackground: '#1f1f28',
      gutterForeground: '#54546d',
    },
    styles: [
      { tag: t.keyword, color: '#957fb8' },
      { tag: t.string, color: '#98bb6c' },
      { tag: t.comment, color: '#727169', fontStyle: 'italic' },
      { tag: t.number, color: '#d27e99' },
      { tag: t.function(t.variableName), color: '#7e9cd8' },
      { tag: t.variableName, color: '#dcd7ba' },
      { tag: t.definition(t.variableName), color: '#e6c384' },
      { tag: t.operator, color: '#c0a36e' },
      { tag: t.bool, color: '#d27e99' },
      { tag: t.null, color: '#957fb8' },
      { tag: t.typeName, color: '#7fb4ca' },
      { tag: t.propertyName, color: '#7aa89f' },
      { tag: t.punctuation, color: '#9cabca' },
    ],
  });
}

function buildPoimandresTheme(_isDark: boolean) {
  return createTheme({
    theme: 'dark',
    settings: {
      background: '#1b1e28',
      foreground: '#a6accd',
      caret: '#5de4c7',
      selection: 'rgba(93,228,199,0.18)',
      selectionMatch: 'rgba(93,228,199,0.10)',
      lineHighlight: '#1f2233',
      gutterBackground: '#1b1e28',
      gutterForeground: '#3d4463',
    },
    styles: [
      { tag: t.keyword, color: '#5de4c7' },
      { tag: t.string, color: '#5de4c7' },
      { tag: t.comment, color: '#4a4f76', fontStyle: 'italic' },
      { tag: t.number, color: '#f087bd' },
      { tag: t.function(t.variableName), color: '#add7ff' },
      { tag: t.variableName, color: '#a6accd' },
      { tag: t.definition(t.variableName), color: '#e4f0fb' },
      { tag: t.operator, color: '#89ddff' },
      { tag: t.bool, color: '#f087bd' },
      { tag: t.null, color: '#91b4d5' },
      { tag: t.typeName, color: '#add7ff' },
      { tag: t.propertyName, color: '#5de4c7' },
      { tag: t.punctuation, color: '#767c9d' },
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
    const [diffAddedLines, setDiffAddedLines] = useState<number[]>([]);
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
      highlightAddedLines(lines: number[]) {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({ effects: setDiffEffect.of(lines) });
        setDiffAddedLines(lines);
      },
      showRemovedGhosts(groups: RemovedLineGroup[]) {
        const view = cmRef.current?.view;
        if (!view) return;
        view.dispatch({ effects: setRemovedGhostsEffect.of(groups) });
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
    const ALWAYS_DARK_THEMES = new Set(['moonlight', 'kanagawa', 'poimandres']);
    const themeBuilders: Record<string, (d: boolean) => unknown> = {
      github: buildGitHubTheme,
      catppuccin: buildCatppuccinTheme,
      'rose-pine': buildRosePineTheme,
      dracula: buildDraculaTheme,
      tokyo: buildTokyoTheme,
      'one-pro': buildOneTheme,
      nord: buildNordTheme,
      ayu: buildAyuTheme,
      gruvbox: buildGruvboxTheme,
      moonlight: buildMoonlightTheme,
      kanagawa: buildKanagawaTheme,
      poimandres: buildPoimandresTheme,
    };
    const effectiveDark = ALWAYS_DARK_THEMES.has(pythonEditorTheme) ? true : isDark;
    const resolvedTheme = (themeBuilders[pythonEditorTheme] ?? buildGitHubTheme)(effectiveDark);

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
      diffField,
      removedGhostsField,
      colorPickerExtension(swatchCallbackRef),
      EditorView.lineWrapping,
      EditorView.theme({
        '&': { height: '100%', fontSize: `${fontSize}px` },
        '.cm-scroller': { overflow: 'auto', fontFamily: '"JetBrains Mono", "Fira Code", monospace' },
        '.cm-error-line': { backgroundColor: 'hsl(var(--destructive) / 0.08)' },
        '.cm-error-mark': {
          textDecoration: 'underline wavy hsl(var(--destructive))',
          backgroundColor: 'hsl(var(--destructive) / 0.12)',
        },
        '.cm-diff-add': {
          backgroundColor: 'rgba(34, 197, 94, 0.13)',
          borderLeft: '3px solid rgba(34, 197, 94, 0.65)',
        },
        '.cm-diff-removed-ghost': {
          pointerEvents: 'none',
          userSelect: 'none',
        },
        // Padrão GitHub: fundo vermelho sólido suave + marcador "-", sem riscado.
        '.cm-diff-del': {
          display: 'flex',
          backgroundColor: effectiveDark ? 'rgba(248, 81, 73, 0.15)' : '#ffebe9',
          fontFamily: '"JetBrains Mono", "Fira Code", monospace',
          lineHeight: '1.5',
        },
        '.cm-diff-del-marker': {
          flex: '0 0 auto',
          width: '1.4em',
          textAlign: 'center',
          color: effectiveDark ? 'rgba(248, 81, 73, 0.9)' : '#cf222e',
          backgroundColor: effectiveDark ? 'rgba(248, 81, 73, 0.25)' : '#ffd7d5',
          userSelect: 'none',
        },
        '.cm-diff-del-text': {
          flex: '1 1 auto',
          paddingLeft: '4px',
          whiteSpace: 'pre',
          color: effectiveDark ? '#c9d1d9' : '#24292f',
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

        {/* Scrollbar diff markers (green = added lines) */}
        {diffAddedLines.length > 0 && (() => {
          const view = cmRef.current?.view;
          const totalLines = view?.state.doc.lines ?? 1;
          return (
            <div
              className="absolute right-0 top-0 bottom-0 pointer-events-none"
              style={{ width: 8, zIndex: 10 }}
            >
              {diffAddedLines.map((ln, i) => (
                <div
                  key={i}
                  className="absolute"
                  style={{
                    top: `${(ln / totalLines) * 100}%`,
                    right: 0,
                    width: 8,
                    height: Math.max(3, 100 / totalLines * 2),
                    backgroundColor: 'rgba(34,197,94,0.8)',
                    borderRadius: 1,
                  }}
                />
              ))}
            </div>
          );
        })()}

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
