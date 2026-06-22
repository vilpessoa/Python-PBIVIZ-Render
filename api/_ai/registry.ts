/**
 * Registry de provedores de LLM.
 *
 * Para ADICIONAR um provedor: crie providers/<id>.ts (implementando LLMProvider)
 * e adicione uma linha `registerProvider(<id>Provider)` abaixo.
 * Para REMOVER um provedor: apague o arquivo dele e remova a linha de registro.
 *
 * O provedor ativo é escolhido pela env AI_PROVIDER (default: 'tess').
 */
import { ProviderError, type LLMProvider } from './types.js';
import { tessProvider } from './providers/tess.js';

const providers = new Map<string, LLMProvider>();

function registerProvider(provider: LLMProvider): void {
  providers.set(provider.id, provider);
}

// ── Provedores registrados (remova a linha ao desativar um provedor) ──────────
registerProvider(tessProvider);
// registerProvider(anthropicProvider);  // ex.: ao adicionar providers/anthropic.ts
// registerProvider(geminiProvider);     // ex.: ao adicionar providers/gemini.ts
// ──────────────────────────────────────────────────────────────────────────────

export function getProvider(id: string): LLMProvider | undefined {
  return providers.get(id);
}

export function listProviders(): LLMProvider[] {
  return [...providers.values()];
}

/** Resolve o provedor ativo a partir de AI_PROVIDER (default 'tess'). */
export function resolveActiveProvider(): LLMProvider {
  const id = process.env.AI_PROVIDER?.trim() || 'tess';
  const provider = providers.get(id);
  if (!provider) {
    const known = listProviders().map((p) => p.id).join(', ') || '(nenhum)';
    throw new ProviderError(503, `Provedor de IA "${id}" não registrado (AI_PROVIDER). Disponíveis: ${known}.`);
  }
  return provider;
}
