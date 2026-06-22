/**
 * Tipos compartilhados do Assistente de IA (lado servidor).
 *
 * Núcleo agnóstico de provedor: a orquestração (index.ts) e o motor de edição
 * (editEngine.ts) não conhecem nenhum LLM específico. Cada provedor implementa
 * LLMProvider em providers/<id>.ts e é registrado em registry.ts.
 */

export type AssistantMode = 'edit' | 'fix' | 'ask';

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface RunAssistantOptions {
  messages: ChatMessage[];
  code: string;
  mode?: AssistantMode;
}

export interface RunAssistantResult {
  reply: string;
  code: string | null;
}

/** Erro com `status` HTTP para o chamador (Vercel Function / dev middleware) mapear a resposta. */
export class ProviderError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = 'ProviderError';
  }
}

/** Entrada de uma única chamada de chat a um provedor. */
export interface ChatInput {
  /** Prompt de sistema já montado para o modo atual (ver system-prompt.ts). */
  systemPrompt: string;
  /** Histórico de mensagens (a última do usuário já vem com as instruções de edição). */
  messages: ChatMessage[];
  mode: AssistantMode;
  /** Timeout opcional em ms (usado no retry rápido de blocos SEARCH/REPLACE). */
  timeoutMs?: number;
}

/**
 * Contrato de um provedor de LLM. Para adicionar um modelo novo, crie
 * providers/<id>.ts implementando esta interface e registre-o em registry.ts.
 */
export interface LLMProvider {
  id: string;            // 'tess' | 'anthropic' | 'gemini' | ...
  label: string;         // rótulo legível (ex.: 'Tess AI')
  /** Valida as variáveis de ambiente do provedor; lança ProviderError(503) se faltarem. */
  ensureConfigured(): void;
  /** Faz UMA chamada de chat e devolve o texto bruto da resposta do modelo. */
  chat(input: ChatInput): Promise<string>;
}
