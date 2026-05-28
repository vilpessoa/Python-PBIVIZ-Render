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

export interface PBIConexao {
  provedor: string;
  apiKey: string;
  agentId: string;
  modelo: string;
  modeloSugerido: string;
  systemPrompt: string;
}

export interface PBILayout {
  tituloChat: string;
  exibirTitulo: boolean;
  placeholderInput: string;
  textoBotaoEnviar: string;
  debugExibirContexto: boolean;
}

export interface PBISettings {
  conexao: PBIConexao;
  layout: PBILayout;
}

export const DEFAULT_PBI_SETTINGS: PBISettings = {
  conexao: {
    provedor: 'tess',
    apiKey: '',
    agentId: '',
    modelo: '',
    modeloSugerido: 'tess-5',
    systemPrompt: '',
  },
  layout: {
    tituloChat: 'Assistente IA',
    exibirTitulo: true,
    placeholderInput: 'Pergunte sobre os dados...',
    textoBotaoEnviar: 'Enviar',
    debugExibirContexto: false,
  },
};

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
  pbivizSettings: PBISettings;
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
  pbivizSettings: DEFAULT_PBI_SETTINGS,
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
      pbivizSettings: {
        conexao: { ...DEFAULT_PBI_SETTINGS.conexao, ...(parsed.pbivizSettings?.conexao ?? {}) },
        layout: { ...DEFAULT_PBI_SETTINGS.layout, ...(parsed.pbivizSettings?.layout ?? {}) },
      },
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
