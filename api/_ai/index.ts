/**
 * Núcleo do Assistente de IA — orquestração agnóstica de provedor.
 * Reutilizado pela Vercel Function (api/ai.ts) e pelo dev server local
 * (src/dev/aiDevMiddleware.ts).
 *
 * Fluxo:
 *   1. resolve o provedor ativo (AI_PROVIDER) e valida sua configuração;
 *   2. injeta as instruções de edição na última mensagem do usuário;
 *   3. chama provider.chat() com o system prompt do modo;
 *   4. converte a resposta em código novo (merge incremental / SEARCH-REPLACE),
 *      com retry rápido quando blocos SEARCH/REPLACE não casam.
 *
 * Trocar de LLM = mudar AI_PROVIDER. O passo 4 (motor de edição) é o mesmo para
 * qualquer provedor, garantindo que o funcionamento se mantém ao trocar o modelo.
 */
import { buildSystemPrompt } from './system-prompt.js';
import { buildResult, buildUserPrompt } from './editEngine.js';
import { resolveActiveProvider } from './registry.js';
import { ProviderError, type ChatMessage, type RunAssistantOptions, type RunAssistantResult } from './types.js';

const RETRY_TIMEOUT_MS = 8_000; // retry rápido (SEARCH/REPLACE edge-case)

export { ProviderError } from './types.js';
export type { RunAssistantOptions, RunAssistantResult } from './types.js';

export async function runAssistant(opts: RunAssistantOptions): Promise<RunAssistantResult> {
  const { messages, code, mode = 'edit' } = opts;

  if (!Array.isArray(messages) || messages.length === 0) {
    throw new ProviderError(400, 'Nenhuma mensagem enviada.');
  }

  const provider = resolveActiveProvider();
  provider.ensureConfigured();

  // Injeta as instruções de edição na última mensagem do usuário.
  const apiMessages: ChatMessage[] = messages.map((m) => ({ role: m.role, content: m.content }));
  for (let i = apiMessages.length - 1; i >= 0; i--) {
    if (apiMessages[i].role === 'user') {
      apiMessages[i] = { role: 'user', content: buildUserPrompt(mode, apiMessages[i].content, code) };
      break;
    }
  }

  const systemPrompt = buildSystemPrompt(mode);
  const firstReply = await provider.chat({ systemPrompt, messages: apiMessages, mode });

  if (mode === 'ask') {
    return { reply: firstReply, code: null };
  }

  const { result, failed } = buildResult(firstReply, code);

  // Sucesso direto.
  if (result.code != null && failed.length === 0) {
    return result;
  }

  // Retry apenas quando blocos SEARCH/REPLACE não casaram.
  if (failed.length > 0) {
    const failedSnippets = failed
      .map((b, i) => `Bloco ${i + 1} — BUSCAR não encontrado:\n${b.search}`)
      .join('\n\n');
    const retryMessages: ChatMessage[] = [
      ...apiMessages,
      { role: 'assistant', content: firstReply },
      {
        role: 'user',
        content: buildUserPrompt(
          mode,
          `Alguns blocos não foram localizados (BUSCAR precisa ser cópia EXATA do código atual). ` +
            `Refaça SOMENTE esses blocos copiando o trecho exatamente.\n\n${failedSnippets}`,
          code,
        ),
      },
    ];
    const retryReply = await provider.chat({ systemPrompt, messages: retryMessages, mode, timeoutMs: RETRY_TIMEOUT_MS });
    const retry = buildResult(retryReply, code);
    if (retry.result.code != null) return retry.result;
  }

  return result;
}
