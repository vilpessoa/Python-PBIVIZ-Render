export interface SourceLoc {
  start: number;
  end: number;
}

export type Contributor =
  | { kind: 'html'; text: string; loc: SourceLoc; line: number }
  | { kind: 'text'; text: string; loc: SourceLoc; line: number }
  | { kind: 'var'; name: string; refLoc: SourceLoc; declLoc: SourceLoc; line: number; snippet: string };

export interface ContributorsEntry {
  rootLoc: SourceLoc;
  rootLine: number;
  items: Contributor[];
}

export type ContributorIndex = Record<string, ContributorsEntry>;

export interface DataRole {
  name: string;
  kind: 'Grouping' | 'Measure' | 'GroupingOrMeasure' | string;
  displayName: string;
}

export interface CapProperty {
  displayName: string;
  type: Record<string, unknown>;
}

export interface CapObject {
  displayName: string;
  properties: Record<string, CapProperty>;
}

export interface CapabilitiesData {
  dataRoles?: DataRole[];
  objects?: Record<string, CapObject>;
}

export interface ExtractedPbivizConfig {
  conexao?: {
    provedor?: string;
    apiKey?: string;
    agentId?: string;
    modelo?: string;
    systemPrompt?: string;
  };
  layout?: {
    tituloChat?: string;
    placeholderInput?: string;
    textoBotaoEnviar?: string;
  };
  aparenciaChat?: {
    corFundoHeader?: string;
    corTextoHeader?: string;
    corFundoChat?: string;
    corBolhaUsuario?: string;
    corBolhaAssistente?: string;
    corTextoBolha?: string;
    corTextoBolhaUsuario?: string;
    corFundoInput?: string;
    corBotaoEnviar?: string;
    avatarUsuarioUrl?: string;
    avatarAgenteUrl?: string;
    exibirAvatares?: boolean;
  };
  tipografia?: {
    familiaFonte?: string;
    tamanhoFonteMensagens?: number;
    tamanhoFonteInput?: number;
  };
  capabilities?: CapabilitiesData;
}

export interface ParseResult {
  html: string;
  warnings: string[];
  error?: string;
  errorPos?: number;
  errorEndPos?: number;
  errorLine?: number;
  errorCol?: number;
  isPurePython?: boolean;
  rawValue?: string;
  measureName?: string;
  contributors?: ContributorIndex;
  isPbiviz?: boolean;
  extractedPbivizConfig?: ExtractedPbivizConfig;
}

export class ParseError extends Error {
  readonly pos: number;
  readonly endPos: number;
  constructor(msg: string, pos: number, endPos: number) {
    super(msg);
    this.name = 'ParseError';
    this.pos = pos;
    this.endPos = endPos;
  }
}
