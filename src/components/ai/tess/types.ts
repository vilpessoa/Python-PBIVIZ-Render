import type { DiffLine } from './tessDiff';

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
  /** Código de antes da aplicação automática — usado pelo botão "Reverter". */
  previousCode?: string;
  /** Estado da aplicação automática deste turno. */
  applyState?: 'applied' | 'reverted';
  /** Marca erro para estilizar o balão. */
  isError?: boolean;
}
