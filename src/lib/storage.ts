const KEY = "pbiviz-render:v1";

export interface SnippetEntry {
  source: string;
  createdAt: number;
  updatedAt: number;
}

export interface AppSettings {
  theme: "light" | "dark";
  fontSize: number;
  autoRun: boolean;
  debounceMs: number;
  geminiKey?: string;
  splitRatio: number;
  editorTheme: "default" | "dracula";
  fontFamily: "JetBrains Mono" | "Fira Code" | "Consolas";
}

export interface PersistedState {
  draft: string;
  snippets: Record<string, SnippetEntry>;
  settings: AppSettings;
  dataViewConfig: unknown;
  objects: Record<string, Record<string, unknown>>;
}

const DEFAULT_SETTINGS: AppSettings = {
  theme: "dark",
  fontSize: 13,
  autoRun: true,
  debounceMs: 500,
  splitRatio: 0.5,
  editorTheme: "dracula",
  fontFamily: "JetBrains Mono",
};

export function loadState(): Partial<PersistedState> {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return {};
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

export function saveState(patch: Partial<PersistedState>) {
  const cur = loadState();
  const next = { ...cur, ...patch };
  localStorage.setItem(KEY, JSON.stringify(next));
}

export function loadSettings(): AppSettings {
  const s = loadState().settings;
  return { ...DEFAULT_SETTINGS, ...(s ?? {}) };
}
