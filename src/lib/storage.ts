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

export type PythonEditorTheme =
  | 'default'
  | 'soft'
  | 'soft-dark'
  | 'dracula'
  | 'nord'
  | 'monokai'
  | 'tokyo'
  | 'one-pro'
  | 'github'
  | 'gruvbox'
  | 'ayu';

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

export interface PBIAparenciaChat {
  // Nomes alinhados com o que o visual JS lê em _readSettings
  corFundoHeader: string;
  corTextoHeader: string;
  corFundoChat: string;
  corBolhaUsuario: string;
  corBolhaAssistente: string;
  corTextoBolha: string;
  corTextoBolhaUsuario: string;
  corFundoInput: string;
  corBotaoEnviar: string;
  avatarUsuarioUrl: string;
  avatarAgenteUrl: string;
  exibirAvatares: boolean;
}

export interface PBIDadosColuna {
  id: string;
  nome: string;
  tipo: 'text' | 'numeric' | 'boolean';
  valores: string;
}

export interface PBIDadosMedida {
  id: string;
  nome: string;
  valor: string;
}

export interface PBIDados {
  colunas: PBIDadosColuna[];
  medidas: PBIDadosMedida[];
}

export interface PBISettings {
  conexao: PBIConexao;
  layout: PBILayout;
  aparenciaChat: PBIAparenciaChat;
  dados: PBIDados;
}

export const DEFAULT_PBI_DADOS: PBIDados = {
  colunas: [
    { id: 'col_1', nome: 'Categoria', tipo: 'text', valores: 'A, B, C' },
    { id: 'col_2', nome: 'Período', tipo: 'text', valores: 'Jan, Fev, Mar' },
  ],
  medidas: [
    { id: 'med_1', nome: 'Vendas', valor: '1200' },
    { id: 'med_2', nome: 'Custo', valor: '800' },
  ],
};

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
  aparenciaChat: {
    corFundoHeader:       '#0B5FFF',
    corTextoHeader:       '#FFFFFF',
    corFundoChat:         '#F9FAFB',
    corBolhaUsuario:      '#0B5FFF',
    corBolhaAssistente:   '#F3F4F6',
    corTextoBolha:        '#111827',
    corTextoBolhaUsuario: '#FFFFFF',
    corFundoInput:        '#F9FAFB',
    corBotaoEnviar:       '#0B5FFF',
    avatarUsuarioUrl:     '',
    avatarAgenteUrl:      '',
    exibirAvatares:       true,
  },
  dados: DEFAULT_PBI_DADOS,
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
        aparenciaChat: { ...DEFAULT_PBI_SETTINGS.aparenciaChat, ...(parsed.pbivizSettings?.aparenciaChat ?? {}) },
        dados: {
          colunas: parsed.pbivizSettings?.dados?.colunas ?? DEFAULT_PBI_DADOS.colunas,
          medidas: parsed.pbivizSettings?.dados?.medidas ?? DEFAULT_PBI_DADOS.medidas,
        },
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
