import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Sparkles, X, Send, Loader2, Undo2, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { sendTessMessage } from '@/services/tessService';
import { diffLines } from './tessDiff';
import { DiffView } from './DiffView';
import type { ChatMessage, TessChatMessage } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Código atual do editor. */
  code: string;
  /** Aplica (ou reverte) o código no editor. */
  onApplyCode: (code: string) => void;
}

/** Remove o bloco ```python ... ``` do texto, deixando só a descrição. */
function descriptionOf(reply: string): string {
  const text = reply.replace(/```(?:python|py)?\s*\n[\s\S]*?\n```/gi, '').trim();
  return text || 'Código atualizado.';
}

function uid() {
  return 'm_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

const WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'assistant',
  content:
    'Olá! Sou o Assistente TESS. Descreva a modificação que você quer no código Python e eu aplico mantendo o restante intacto.',
};

export function TessChat({ open, onClose, code, onApplyCode }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

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
    try {
      const { reply, code: newCode } = await sendTessMessage({
        messages: apiMessages,
        code: before,
      });

      const assistant: ChatMessage = {
        id: uid(),
        role: 'assistant',
        content: reply,
      };

      if (newCode != null && newCode !== before) {
        // Aplicação automática + diff git-style
        onApplyCode(newCode);
        assistant.content = descriptionOf(reply);
        assistant.code = newCode;
        assistant.previousCode = before;
        assistant.diff = diffLines(before, newCode);
        assistant.applyState = 'applied';
      } else if (newCode != null) {
        assistant.content = 'Nenhuma alteração necessária — o código já atende ao pedido.';
      } else {
        assistant.content = reply;
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

  function handleRevert(msg: ChatMessage) {
    if (msg.previousCode == null) return;
    onApplyCode(msg.previousCode);
    setMessages((arr) =>
      arr.map((m) => (m.id === msg.id ? { ...m, applyState: 'reverted' } : m)),
    );
    toast.success('Alteração revertida', { position: 'top-right' });
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

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
            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Fechar">
              <X className="h-4 w-4" />
            </Button>
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

                  {m.diff && <DiffView diff={m.diff} />}

                  {m.applyState && (
                    <div className="mt-2 flex items-center justify-between gap-2">
                      <span
                        className={cn(
                          'inline-flex items-center gap-1 text-[10px] font-medium',
                          m.applyState === 'applied'
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : 'text-muted-foreground',
                        )}
                      >
                        <Check className="h-3 w-3" />
                        {m.applyState === 'applied' ? 'Aplicado ao editor' : 'Revertido'}
                      </span>
                      {m.applyState === 'applied' && (
                        <button
                          type="button"
                          onClick={() => handleRevert(m)}
                          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-0.5 text-[10px] font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
                        >
                          <Undo2 className="h-3 w-3" /> Reverter
                        </button>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-3 py-2 text-xs text-muted-foreground">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> TESS está pensando…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="shrink-0 border-t border-border bg-background p-2.5">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={onInputKeyDown}
                rows={1}
                placeholder="Ex.: deixe o título em negrito e azul…"
                className="max-h-28 min-h-[38px] flex-1 resize-none rounded-lg border border-border bg-surface px-3 py-2 text-xs outline-none focus:ring-2 focus:ring-ring"
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
