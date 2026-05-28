export interface Snippet {
  id: string;
  name: string;
  code: string;
  createdAt: number;
  updatedAt: number;
}

export interface ViewportState {
  width: number;
  height: number;
  preset: string;
}

export type PythonEditorTheme = 'default' | 'soft' | 'dracula' | 'nord' | 'monokai' | 'tokyo' | 'soft-dark';

export interface AppState {
  currentCode: string;
  savedSnippets: Snippet[];
  theme: 'light' | 'dark';
  panelSplit: number;
  editorFontSize: number;
  visualEditsEnabled: boolean;
  liveRender: boolean;
  viewport: ViewportState;
  accentColor: string;
  fontFamily: string;
  pythonEditorTheme: PythonEditorTheme;
}

const KEY = 'python-renderer-state';

const DEFAULT_STATE: AppState = {
  currentCode: '',
  savedSnippets: [],
  theme: 'light',
  panelSplit: 50,
  editorFontSize: 11,
  visualEditsEnabled: false,
  liveRender: true,
  viewport: { width: 1280, height: 800, preset: 'fit' },
  accentColor: 'blue',
  fontFamily: 'space-grotesk',
  pythonEditorTheme: 'default',
};

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      ...DEFAULT_STATE,
      ...parsed,
      viewport: { ...DEFAULT_STATE.viewport, ...(parsed.viewport ?? {}) },
    };
  } catch {
    return { ...DEFAULT_STATE };
  }
}

export function saveState(s: AppState): void {
  if (typeof localStorage === 'undefined') return;
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // quota exceeded
  }
}

export function patchState(patch: Partial<AppState>): void {
  saveState({ ...loadState(), ...patch });
}
