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
  | 'github'
  | 'catppuccin'
  | 'rose-pine'
  | 'dracula'
  | 'tokyo'
  | 'one-pro'
  | 'nord'
  | 'ayu'
  | 'gruvbox';

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
  corTextoBotao: string;
  avatarUsuarioUrl: string;
  avatarAgenteUrl: string;
  exibirAvatares: boolean;
}

export interface PBITipografia {
  familiaFonte: string;
  tamanhoFonteMensagens: number;
  tamanhoFonteInput: number;
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
  tipografia: PBITipografia;
  dados: PBIDados;
  extras?: Record<string, Record<string, string | boolean | number>>;
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
    corTextoBotao:        '#FFFFFF',
    avatarUsuarioUrl:     '',
    avatarAgenteUrl:      '',
    exibirAvatares:       true,
  },
  tipografia: {
    familiaFonte:          'Inter',
    tamanhoFonteMensagens: 13,
    tamanhoFonteInput:     12,
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
  pythonEditorTheme: 'github',
  pbivizSettings: DEFAULT_PBI_SETTINGS,
};

export function loadState(): AppState {
  if (typeof localStorage === 'undefined') return { ...DEFAULT_STATE };
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return { ...DEFAULT_STATE };
    const parsed = JSON.parse(raw) as Partial<AppState>;
    const VALID_THEMES: PythonEditorTheme[] = ['github','catppuccin','rose-pine','dracula','tokyo','one-pro','nord','ayu','gruvbox'];
    const migratedTheme: PythonEditorTheme = VALID_THEMES.includes(parsed.pythonEditorTheme as PythonEditorTheme)
      ? (parsed.pythonEditorTheme as PythonEditorTheme)
      : 'github';
    return {
      ...DEFAULT_STATE,
      ...parsed,
      pythonEditorTheme: migratedTheme,
      viewport: { ...DEFAULT_STATE.viewport, ...(parsed.viewport ?? {}) },
      pbivizSettings: {
        conexao: { ...DEFAULT_PBI_SETTINGS.conexao, ...(parsed.pbivizSettings?.conexao ?? {}) },
        layout: { ...DEFAULT_PBI_SETTINGS.layout, ...(parsed.pbivizSettings?.layout ?? {}) },
        aparenciaChat: { ...DEFAULT_PBI_SETTINGS.aparenciaChat, ...(parsed.pbivizSettings?.aparenciaChat ?? {}) },
        tipografia: { ...DEFAULT_PBI_SETTINGS.tipografia, ...(parsed.pbivizSettings?.tipografia ?? {}) },
        dados: {
          colunas: parsed.pbivizSettings?.dados?.colunas ?? DEFAULT_PBI_DADOS.colunas,
          medidas: parsed.pbivizSettings?.dados?.medidas ?? DEFAULT_PBI_DADOS.medidas,
        },
        extras: parsed.pbivizSettings?.extras ?? {},
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
