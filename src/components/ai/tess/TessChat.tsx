import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Undo2, Check, AlertCircle, Wand2, Bug, HelpCircle, Eraser, ShieldAlert } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { sendTessMessage } from '@/services/tessService';
import { diffLines, diffStats } from './tessDiff';
import type { ChatMessage, TessChatMessage, TessMode } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Código atual do editor. */
  code: string;
  /** Aplica (ou reverte) o código no editor. */
  onApplyCode: (code: string) => void;
  /** Destaca linhas adicionadas no editor CodeMirror (chamado ~100ms após aplicar). */
  onHighlightDiff?: (addedLines: number[]) => void;
}

const MODES: { id: TessMode; label: string; icon: React.ElementType; placeholder: string }[] = [
  { id: 'edit', label: 'Modificar', icon: Wand2, placeholder: 'Ex.: adicione 2 novos usuários…' },
  { id: 'fix', label: 'Corrigir', icon: Bug, placeholder: 'Descreva o erro ou peça para corrigir…' },
  { id: 'ask', label: 'Tirar dúvidas', icon: HelpCircle, placeholder: 'Ex.: o que esse trecho faz?' },
];

/** Remove blocos de código (```python``` e blocos de edição BUSCAR/SUBSTITUIR) do texto. */
function stripCodeBlock(reply: string): string {
  return reply
    .replace(/```(?:python|py)?\s*\n[\s\S]*?\n```/gi, '')
    .replace(/<{5,9}\s*BUSCAR[\s\S]*?>{5,9}\s*SUBSTITUIR/gi, '')
    .trim();
}

/** Primeira frase/linha não vazia, limitada — para um resumo enxuto nos modos de ação. */
function conciseSummary(reply: string): string {
  const text = stripCodeBlock(reply);
  const firstLine = text.split('\n').map((l) => l.trim()).find((l) => l.length > 0) ?? '';
  if (!firstLine) return 'Código atualizado.';
  return firstLine.length > 160 ? firstLine.slice(0, 157) + '…' : firstLine;
}

function uid() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Olá! Sou o Assistente TESS. Escolha um modo abaixo: "Modificar" e "Corrigir" agem direto no código; "Tirar dúvidas" apenas responde sem alterar nada.',
};

/** Retorna os números de linha 1-indexados das linhas adicionadas no diff. */
function computeAddedLines(diff: ReturnType<typeof diffLines>): number[] {
  const lines: number[] = [];
  let ln = 1;
  for (const d of diff) {
    if (d.type === 'add') { lines.push(ln); ln++; }
    else if (d.type === 'ctx') { ln++; }
  }
  return lines;
}

export function TessChat({ open, onClose, code, onApplyCode, onHighlightDiff }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TessMode>('edit');

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // Auto-scroll ao receber mensagens
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // ESC fecha; foco no input ao abrir
  useEffect(() => {
    if (!open) return;
    const t = setTimeout(() => inputRef.current?.focus(), 50);
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => {
      clearTimeout(t);
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);

    // Histórico para a API (sem a mensagem de boas-vindas e sem erros)
    const apiMessages: TessChatMessage[] = history
      .filter((m) => m.id !== 'welcome' && !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    const before = codeRef.current;
    const sentMode = mode;
    try {
      const { reply, code: newCode } = await sendTessMessage({
        messages: apiMessages,
        code: before,
        mode: sentMode,
      });

      const assistant: ChatMessage = { id: uid(), role: 'assistant', content: reply };

      if (sentMode === 'ask') {
        // Conversacional: nunca altera o código.
        assistant.content = stripCodeBlock(reply) || reply;
      } else if (newCode != null && newCode !== before) {
        const dl = diffLines(before, newCode);
        const { removed } = diffStats(dl);
        const beforeLines = before.split('\n').filter((l) => l.trim()).length;

        // TRAVA DE SEGURANÇA: a TESS às vezes devolve só o trecho alterado,
        // o que apagaria a maior parte do código original. Nesse caso NÃO
        // aplicamos automaticamente — pedimos confirmação explícita.
        const suspicious = beforeLines >= 6 && removed >= Math.ceil(beforeLines * 0.4);

        assistant.content = conciseSummary(reply);
        assistant.diff = dl;
        assistant.previousCode = before;
        assistant.proposedCode = newCode;

        if (suspicious) {
          // Bloqueia a aplicação automática.
          assistant.applyState = 'blocked';
          assistant.rawReply = reply;
          assistant.content =
            'A resposta removeria grande parte do código atual — provavelmente veio incompleta. Não apliquei automaticamente. Revise o diff e decida abaixo.';
        } else {
          // Aplica e mantém o destaque no editor até você aprovar/reverter.
          onApplyCode(newCode);
          assistant.code = newCode;
          assistant.applyState = 'applied';
          if (onHighlightDiff) {
            const addedLines = computeAddedLines(dl);
            setTimeout(() => onHighlightDiff(addedLines), 120);
          }
        }
      } else if (newCode != null) {
        assistant.content = 'Nenhuma alteração necessária — o código já atende ao pedido.';
      } else {
        // Não veio código aplicável — mostra o resumo e guarda a resposta crua para diagnóstico.
        assistant.content = conciseSummary(reply);
        assistant.rawReply = reply;
      }

      setMessages((m) => [...m, assistant]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [...m, { id: uid(), role: 'assistant', content: msg, isError: true }]);
      toast.error('Erro no Assistente TESS', { description: msg, position: 'top-center' });
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(msg: ChatMessage) {
    onHighlightDiff?.([]); // remove o destaque do editor
    setMessages((arr) => arr.map((m) => (m.id === msg.id ? { ...m, applyState: 'approved' } : m)));
    toast.success('Alteração aprovada', { position: 'top-right' });
  }

  function handleRevert(msg: ChatMessage) {
    if (msg.previousCode == null) return;
    onApplyCode(msg.previousCode);
    onHighlightDiff?.([]); // remove o destaque do editor
    setMessages((arr) => arr.map((m) => (m.id === msg.id ? { ...m, applyState: 'reverted' } : m)));
    toast.success('Alteração revertida', { position: 'top-right' });
  }

  /** Aplica manualmente um resultado que foi bloqueado pela trava de segurança. */
  function handleApplyAnyway(msg: ChatMessage) {
    if (msg.proposedCode == null) return;
    onApplyCode(msg.proposedCode);
    setMessages((arr) => arr.map((m) => (m.id === msg.id ? { ...m, applyState: 'applied' } : m)));
    if (onHighlightDiff && msg.diff) {
      const addedLines = computeAddedLines(msg.diff);
      setTimeout(() => onHighlightDiff(addedLines), 120);
    }
    toast.info('Alteração aplicada manualmente', { position: 'top-right' });
  }

  function handleClearChat() {
    onHighlightDiff?.([]);
    setMessages([WELCOME]);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const placeholder = MODES.find((m) => m.id === mode)?.placeholder ?? '';

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0, scale: 0.96, y: 12 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.96, y: 12 }}
          transition={{ type: 'spring', stiffness: 380, damping: 30 }}
          style={{ position: 'fixed', right: 20, bottom: 20, zIndex: 70, width: 384, maxHeight: 'min(560px, calc(100vh - 96px))' }}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xl ring-1 ring-black/8 dark:ring-white/10"
        >
          {/* Header */}
          <div className="flex shrink-0 items-center justify-between border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-4 py-3">
            <div className="flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/15 text-primary">
                <Sparkles className="h-3.5 w-3.5" />
              </span>
              <div className="leading-tight">
                <div className="text-sm font-semibold">Assistente TESS</div>
                <div className="text-[10px] text-muted-foreground">Construtor de código Python</div>
              </div>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClearChat}
                disabled={messages.length <= 1}
                aria-label="Limpar conversa"
                title="Limpar conversa"
              >
                <Eraser className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Mensagens */}
          <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
            {messages.map((m) => (
              <div key={m.id} className={cn('flex', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                <div
                  className={cn(
                    'max-w-[88%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                    m.role === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : m.isError
                      ? 'border border-destructive/40 bg-destructive/10 text-destructive'
                      : 'border border-border bg-surface',
                  )}
                >
                  {m.isError && <AlertCircle className="mb-1 inline h-3.5 w-3.5" />}
                  <span className="whitespace-pre-wrap break-words">{m.content}</span>

                  {m.diff && (() => {
                    const { added, removed } = diffStats(m.diff);
                    return (
                      <div className="mt-1.5 flex items-center gap-1.5 text-[10px] font-mono">
                        {added > 0 && <span className="text-emerald-600 dark:text-emerald-400">+{added}</span>}
                        {removed > 0 && <span className="text-rose-600 dark:text-rose-400">-{removed}</span>}
                        {m.applyState === 'applied' && <span className="text-muted-foreground">· destacado no editor</span>}
                      </div>
                    );
                  })()}

                  {/* Aplicado — aguardando aprovação */}
                  {m.applyState === 'applied' && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                        Revise o diff no editor
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleApprove(m)}
                          className="inline-flex items-center gap-1 rounded-md bg-emerald-600 px-2 py-0.5 text-[10px] font-medium text-white hover:bg-emerald-700"
                        >
                          <Check className="h-3 w-3" /> Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevert(m)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Undo2 className="h-3 w-3" /> Reverter
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Aprovado / Revertido — estado final */}
                  {(m.applyState === 'approved' || m.applyState === 'reverted') && (
                    <div className="mt-2 inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                      <Check className="h-3 w-3" />
                      {m.applyState === 'approved' ? 'Aprovado' : 'Revertido'}
                    </div>
                  )}

                  {/* Bloqueado pela trava de segurança */}
                  {m.applyState === 'blocked' && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-600 dark:text-amber-400">
                        <ShieldAlert className="h-3 w-3" /> Não aplicado
                      </span>
                      <button
                        type="button"
                        onClick={() => handleApplyAnyway(m)}
                        className="inline-flex items-center gap-1 rounded-md border border-amber-500/50 px-2 py-0.5 text-[10px] font-medium text-amber-600 hover:bg-amber-500/10 dark:text-amber-400"
                      >
                        Aplicar mesmo assim
                      </button>
                    </div>
                  )}

                  {/* Diagnóstico: resposta crua da TESS (para depurar o comportamento do agente) */}
                  {m.rawReply && (
                    <details className="mt-2 rounded-md border border-border/70 bg-surface-sunken">
                      <summary className="cursor-pointer select-none px-2 py-1 text-[10px] font-medium text-muted-foreground">
                        🔍 Resposta crua da TESS (diagnóstico)
                      </summary>
                      <pre className="max-h-60 overflow-auto whitespace-pre-wrap break-words px-2 py-1.5 text-[10px] leading-snug font-mono text-muted-foreground">
                        {m.rawReply}
                      </pre>
                    </details>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> TESS está trabalhando…
                </div>
              </div>
            )}
          </div>

          {/* Seletor de modo */}
          <div className="flex shrink-0 items-center gap-1 border-t border-border bg-surface px-2.5 pt-2">
            {MODES.map((m) => {
              const Icon = m.icon;
              const active = mode === m.id;
              return (
                <button
                  key={m.id}
                  type="button"
                  onClick={() => setMode(m.id)}
                  aria-pressed={active}
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    active
                      ? 'border-primary/40 bg-primary/15 text-primary'
                      : 'border-border text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {m.label}
                </button>
              );
            })}
          </div>

          {/* Input */}
          <div className="shrink-0 bg-surface p-2.5 pt-2">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                rows={1}
                placeholder={placeholder}
                className="max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
              />
              <Button
                size="icon"
                className="h-9 w-9 shrink-0"
                onClick={handleSend}
                disabled={loading || !input.trim()}
                aria-label="Enviar"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              </Button>
            </div>
            <div className="mt-1 px-1 text-[10px] text-muted-foreground">
              Enter envia · Shift+Enter quebra linha
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
