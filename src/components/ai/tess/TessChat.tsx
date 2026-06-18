import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useMotionValue, useReducedMotion } from 'framer-motion';
import { X, Send, Loader2, Undo2, Check, AlertCircle, Wand2, Bug, HelpCircle, Eraser, ShieldAlert, Eye, RotateCcw, Minus, Plus, Table } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ProgressiveFluxLoader } from '@/components/ui/progressive-flux-loader';
import { sendTessMessage } from '@/services/tessService';
import { TessLogo, TessWordmark } from './TessLogo';
import { diffLines, diffStats } from './tessDiff';
import type { ChatMessage, TessChatMessage, TessMode } from './types';

interface Props {
  open: boolean;
  onClose: () => void;
  /** Recolhe o painel na bolha flutuante (mantém a conversa). */
  onMinimize: () => void;
  /** Quando true, o painel fica oculto (a FAB é exibida pelo App). */
  minimized: boolean;
  /** Offset de arrasto persistido em relação à âncora (canto inferior direito). */
  position: { x: number; y: number } | null;
  /** Persiste a posição ao soltar o arrasto. */
  onPositionChange: (pos: { x: number; y: number }) => void;
  /** Código atual do editor. */
  code: string;
  /** Aplica (ou reverte) o código no editor. */
  onApplyCode: (code: string) => void;
  /** Destaca linhas adicionadas no editor CodeMirror (chamado ~100ms após aplicar). */
  onHighlightDiff?: (addedLines: number[]) => void;
  /** Mostra ghost lines (linhas removidas) no editor. */
  onShowRemovedGhosts?: (groups: { atLine: number; texts: string[] }[]) => void;
  /** Ancora o editor na primeira linha do diff. */
  onScrollToDiff?: (lineNumber: number) => void;
}

const MODES: { id: TessMode; label: string; icon: React.ElementType; placeholder: string }[] = [
  { id: 'edit', label: 'Modificar', icon: Wand2, placeholder: 'Ex.: adicione 2 novos usuários…' },
  { id: 'fix', label: 'Corrigir', icon: Bug, placeholder: 'Descreva o erro ou peça para corrigir…' },
  { id: 'ask', label: 'Tirar dúvidas', icon: HelpCircle, placeholder: 'Ex.: o que esse trecho faz?' },
];

/** Prompts rápidos exibidos na tela de boas-vindas (preenchem o input ao clicar). */
const QUICK_PROMPTS: { label: string; text: string; icon: React.ElementType }[] = [
  { label: 'Adicionar item', text: 'Adicione um novo item aos dados.', icon: Plus },
  { label: 'Corrigir erro', text: 'Corrija os erros do código.', icon: Bug },
  { label: 'Explicar o código', text: 'O que este código faz?', icon: HelpCircle },
  { label: 'Gerar tabela HTML', text: 'Gere uma tabela HTML a partir dos dados.', icon: Table },
];

const PANEL_W = 384;
const DRAG_MARGIN = 16;

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

/** Agrupa linhas removidas com sua posição no NOVO código (para ghost lines no editor). */
function computeRemovedGroups(diff: ReturnType<typeof diffLines>): { atLine: number; texts: string[] }[] {
  const groups: { atLine: number; texts: string[] }[] = [];
  let newLn = 1;
  let pending: string[] = [];
  for (const d of diff) {
    if (d.type === 'del') {
      pending.push(d.text);
    } else {
      if (pending.length > 0) {
        groups.push({ atLine: newLn, texts: [...pending] });
        pending = [];
      }
      if (d.type === 'ctx' || d.type === 'add') newLn++;
    }
  }
  if (pending.length > 0) {
    groups.push({ atLine: newLn, texts: [...pending] });
  }
  return groups;
}

export function TessChat({ open, onClose, onMinimize, minimized, position, onPositionChange, code, onApplyCode, onHighlightDiff, onShowRemovedGhosts, onScrollToDiff }: Props) {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TessMode>('edit');

  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const codeRef = useRef(code);
  useEffect(() => {
    codeRef.current = code;
  }, [code]);

  // ── Arrasto (framer-motion): a posição é um offset relativo à âncora fixa. ──
  const dragControls = useDragControls();
  const x = useMotionValue(position?.x ?? 0);
  const y = useMotionValue(position?.y ?? 0);
  const [constraints, setConstraints] = useState({ left: 0, right: 0, top: 0, bottom: 0 });

  useEffect(() => {
    function calc() {
      const w = window.innerWidth;
      const h = window.innerHeight;
      const panelH = Math.min(560, h - 96);
      setConstraints({
        left: -(w - PANEL_W - DRAG_MARGIN * 2),
        right: 0,
        top: -(h - panelH - DRAG_MARGIN * 2),
        bottom: 0,
      });
    }
    calc();
    window.addEventListener('resize', calc);
    return () => window.removeEventListener('resize', calc);
  }, []);

  // Mantém a posição dentro do viewport quando os limites mudam (resize/abertura).
  useEffect(() => {
    x.set(Math.min(constraints.right, Math.max(constraints.left, x.get())));
    y.set(Math.min(constraints.bottom, Math.max(constraints.top, y.get())));
  }, [constraints, x, y]);

  // Auto-scroll ao receber mensagens
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [messages, loading]);

  // ESC fecha; foco no input ao abrir
  useEffect(() => {
    if (!open || minimized) return;
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
  }, [open, minimized, onClose]);

  async function handleSend() {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMessage = { id: uid(), role: 'user', content: text };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    await runSend(history, mode);
  }

  /** Reenvia o último pedido (após um erro de rede/timeout). */
  async function handleRetry(errorMsg: ChatMessage) {
    if (loading) return;
    // Remove o balão de erro e reaproveita o histórico já existente.
    const history = messages.filter((m) => m.id !== errorMsg.id);
    setMessages(history);
    await runSend(history, errorMsg.retryMode ?? mode);
  }

  /** Executa a chamada à TESS para um histórico já montado (inclui a msg do usuário). */
  async function runSend(history: ChatMessage[], sentMode: TessMode) {
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
          if (onShowRemovedGhosts) {
            const groups = computeRemovedGroups(dl);
            setTimeout(() => onShowRemovedGhosts(groups), 120);
          }
        }
      } else if (newCode != null) {
        assistant.content = 'Nenhuma alteração necessária — o código já atende ao pedido.';
      } else {
        // Sem código aplicável: mostra a resposta completa (o agente pode ter dado
        // uma explicação válida sobre por que a mudança é complexa).
        assistant.content = stripCodeBlock(reply) || conciseSummary(reply);
      }

      setMessages((m) => [...m, assistant]);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setMessages((m) => [
        ...m,
        { id: uid(), role: 'assistant', content: msg, isError: true, canRetry: true, retryMode: sentMode },
      ]);
      toast.error('Erro no Assistente TESS', { description: msg, position: 'top-center' });
    } finally {
      setLoading(false);
    }
  }

  function handleApprove(msg: ChatMessage) {
    onHighlightDiff?.([]);
    onShowRemovedGhosts?.([]);
    setMessages((arr) => arr.map((m) => (m.id === msg.id ? { ...m, applyState: 'approved' } : m)));
    toast.success('Alteração aprovada', { position: 'top-right' });
  }

  function handleRevert(msg: ChatMessage) {
    if (msg.previousCode == null) return;
    onApplyCode(msg.previousCode);
    onHighlightDiff?.([]);
    onShowRemovedGhosts?.([]);
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
    if (onShowRemovedGhosts && msg.diff) {
      const groups = computeRemovedGroups(msg.diff);
      setTimeout(() => onShowRemovedGhosts(groups), 120);
    }
    toast.info('Alteração aplicada manualmente', { position: 'top-right' });
  }

  function handleClearChat() {
    onHighlightDiff?.([]);
    onShowRemovedGhosts?.([]);
    setMessages([WELCOME]);
  }

  function handleQuickPrompt(text: string) {
    setInput(text);
    inputRef.current?.focus();
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const placeholder = MODES.find((m) => m.id === mode)?.placeholder ?? '';
  const isWelcome = messages.length === 1 && messages[0].id === 'welcome' && !loading;

  return (
    <AnimatePresence>
      {open && !minimized && (
        <motion.div
          drag
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          dragConstraints={constraints}
          onDragEnd={() => onPositionChange({ x: x.get(), y: y.get() })}
          initial={reduce ? false : { opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, scale: 0.96 }}
          transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 380, damping: 30 }}
          style={{ x, y, position: 'fixed', right: 20, bottom: 20, zIndex: 70, width: PANEL_W, maxHeight: 'min(560px, calc(100vh - 96px))' }}
          className="flex flex-col overflow-hidden rounded-2xl border border-border bg-surface-elevated shadow-xl ring-1 ring-black/8 dark:ring-white/10"
        >
          {/* Header (alça de arrasto) */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-4 py-3 active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <TessLogo className="h-7 w-7" />
              <div className="leading-tight">
                <div className="text-sm font-semibold">Assistente TESS</div>
                <div className="text-[10px] text-muted-foreground">Construtor de código Python</div>
              </div>
            </div>
            <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
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
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onMinimize} aria-label="Minimizar" title="Minimizar">
                <Minus className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Fechar" title="Fechar">
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Conteúdo: tela de boas-vindas ou lista de mensagens */}
          {isWelcome ? (
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
              <div className="flex flex-col items-center gap-4 text-center">
                <TessWordmark />
                <div className="space-y-1">
                  <h3 className="text-base font-semibold tracking-tight">Como posso ajudar?</h3>
                  <p className="text-xs text-muted-foreground">
                    Escolha um atalho abaixo ou descreva o que precisa. Use os modos para
                    modificar, corrigir ou tirar dúvidas sobre o código.
                  </p>
                </div>
                <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                  {QUICK_PROMPTS.map((p) => {
                    const Icon = p.icon;
                    return (
                      <button key={p.label} type="button" onClick={() => handleQuickPrompt(p.text)}>
                        <Badge variant="outline" className="cursor-pointer gap-1.5 hover:bg-accent">
                          <Icon className="h-3.5 w-3.5 text-primary" />
                          {p.label}
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role !== 'user' && <TessLogo className="mt-0.5 h-6 w-6" />}
                  <div
                    className={cn(
                      'max-w-[82%] rounded-xl px-3 py-2 text-xs leading-relaxed',
                      m.role === 'user'
                        ? 'bg-primary text-primary-foreground'
                        : m.isError
                        ? 'border border-destructive/40 bg-destructive/10 text-destructive'
                        : 'border border-border bg-surface',
                    )}
                  >
                    {m.isError && <AlertCircle className="mb-1 inline h-3.5 w-3.5" />}
                    {m.role === 'user' ? (
                      <span className="whitespace-pre-wrap break-words">{m.content}</span>
                    ) : (
                      <div className="prose prose-xs max-w-none break-words dark:prose-invert [&_code]:rounded [&_code]:bg-black/10 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-[10px] [&_pre]:overflow-auto [&_pre]:rounded [&_pre]:bg-black/10 [&_pre]:p-2 [&_pre]:text-[10px] [&_p]:my-0.5 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0 [&_h1]:text-xs [&_h2]:text-xs [&_h3]:text-xs [&_ul]:my-1 [&_ol]:my-1 [&_li]:my-0">
                        <ReactMarkdown>{m.content}</ReactMarkdown>
                      </div>
                    )}

                    {m.isError && m.canRetry && (
                      <div className="mt-2 flex justify-end">
                        <button
                          type="button"
                          onClick={() => handleRetry(m)}
                          disabled={loading}
                          className="inline-flex items-center gap-1 rounded-md border border-destructive/40 px-2 py-0.5 text-[10px] font-medium text-destructive hover:bg-destructive/10 disabled:opacity-50"
                        >
                          <RotateCcw className="h-3 w-3" /> Tentar novamente
                        </button>
                      </div>
                    )}

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
                      <>
                        <div className="mt-2 mb-2 border-t border-border/50" />
                        <div className="flex items-center justify-between gap-2">
                          <span className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                            Revise o diff no editor
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                if (onScrollToDiff && m.diff) {
                                  const added = computeAddedLines(m.diff);
                                  if (added.length > 0) onScrollToDiff(added[0]);
                                }
                              }}
                              className="inline-flex items-center gap-1 rounded-md border border-primary/30 px-2 py-0.5 text-[10px] font-medium text-primary hover:bg-primary/10"
                            >
                              <Eye className="h-3 w-3" /> Avaliar
                            </button>
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
                      </>
                    )}

                    {/* Aprovado / Revertido — estado final */}
                    {(m.applyState === 'approved' || m.applyState === 'reverted') && (
                      <>
                        <div className="mt-2 mb-2 border-t border-border/50" />
                        <div className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                          <Check className="h-3 w-3" />
                          {m.applyState === 'approved' ? 'Aprovado' : 'Revertido'}
                        </div>
                      </>
                    )}

                    {/* Bloqueado pela trava de segurança */}
                    {m.applyState === 'blocked' && (
                      <>
                        <div className="mt-2 mb-2 border-t border-border/50" />
                        <div className="flex items-center justify-between gap-2">
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
                      </>
                    )}

                  </div>
                </div>
              ))}

              {loading && (
                <div className="flex justify-start gap-2">
                  <TessLogo className="mt-0.5 h-6 w-6" />
                  <div className="w-52 rounded-xl border border-border bg-surface px-3 py-2">
                    <ProgressiveFluxLoader />
                  </div>
                </div>
              )}
            </div>
          )}

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
