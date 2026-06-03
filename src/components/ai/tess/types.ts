import type { DiffLine } from './tessDiff';

/** Modos de atuação do assistente. */
export type TessMode = 'edit' | 'fix' | 'ask';

export interface TessChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  /** Texto exibido (resposta da TESS ou pedido do usuário). */
  content: string;
  /** Código extraído da resposta, quando houver. */
  code?: string | null;
  /** Diff git-style entre o código anterior e o novo (mensagens da TESS). */
  diff?: DiffLine[];
  /** Código de antes da aplicação — usado pelos botões "Aprovar"/"Reverter". */
  previousCode?: string;
  /** Código novo proposto pela TESS (usado quando 'blocked' para aplicar manualmente). */
  proposedCode?: string;
  /**
   * Estado da aplicação deste turno:
   * - 'applied'  → aplicado ao editor, aguardando aprovação (diff visível no editor)
   * - 'approved' → o usuário confirmou a alteração (diff some)
   * - 'reverted' → o usuário desfez a alteração
   * - 'blocked'  → código suspeito (cortaria boa parte do original); NÃO foi aplicado
   */
  applyState?: 'applied' | 'approved' | 'reverted' | 'blocked';
  /** Marca erro para estilizar o balão. */
  isError?: boolean;
  /** Resposta crua da TESS — exibida no diagnóstico quando a alteração não pôde ser aplicada. */
  rawReply?: string;
}
