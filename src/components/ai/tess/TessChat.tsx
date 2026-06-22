import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useDragControls, useMotionValue, useReducedMotion } from 'framer-motion';
import { X, Send, Undo2, Check, AlertCircle, Wand2, Bug, HelpCircle, Eraser, ShieldAlert, Eye, RotateCcw, Minus, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';
import { cn } from '@/lib/cn';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem } from '@/components/ui/dropdown';
import { useAutoResizeTextarea } from '@/hooks/useAutoResizeTextarea';
import { sendAssistantMessage } from '@/services/aiService';
import { TessLogo } from './TessLogo';
import { Typewriter } from '@/components/ui/typewriter';
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
  { id: 'edit', label: 'Modificar', icon: Wand2, placeholder: '' },
  { id: 'fix', label: 'Corrigir', icon: Bug, placeholder: '' },
  { id: 'ask', label: 'Tirar dúvidas', icon: HelpCircle, placeholder: '' },
];

const PANEL_W = 384;
const DRAG_MARGIN = 16;

/** Remove blocos de código (```python``` e blocos de edição BUSCAR/SUBSTITUIR) do texto. */
function stripCodeBlock(reply: string): string {
  return reply
    .replace(/```(?:python|py)?\s*\n[\s\S]*?\n```/gi, '')
    .replace(/<{4,9}\s*BUSCAR[\s\S]*?={4,9}[\s\S]*?>{4,9}\s*SUBSTITUIR/gi, '')
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

/** Remove marcadores BUSCAR/SUBSTITUIR do código (defesa em profundidade). */
function cleanCode(code: string): string {
  if (!code || typeof code !== 'string') return code;
  return code
    .replace(/<{4,9}\s*BUSCAR[^\n]*\n/gi, '')
    .replace(/\n={4,9}[^\n]*\n/gi, '\n')
    .replace(/\n>{4,9}\s*SUBSTITUIR[^\n]*\n/gi, '\n')
    .replace(/\n+/g, '\n')
    .trim();
}

const WELCOME_ID = 'welcome';

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
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<TessMode>('edit');

  const reduce = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const { textareaRef, adjustHeight } = useAutoResizeTextarea({ minHeight: 44, maxHeight: 140 });
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
    const t = setTimeout(() => textareaRef.current?.focus(), 50);
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
    adjustHeight(true);
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
      .filter((m) => m.id !== WELCOME_ID && !m.isError)
      .map((m) => ({ role: m.role, content: m.content }));

    const before = codeRef.current;
    try {
      const { reply, code: newCode } = await sendAssistantMessage({
        messages: apiMessages,
        code: before,
        mode: sentMode,
      });

      const assistant: ChatMessage = { id: uid(), role: 'assistant', content: reply };

      if (sentMode === 'ask') {
        // Conversacional: nunca altera o código.
        assistant.content = stripCodeBlock(reply) || reply;
      } else if (newCode != null && newCode !== before) {
        // Limpa marcadores que possam ter escapado
        const cleanedCode = cleanCode(newCode);
        const dl = diffLines(before, cleanedCode);
        const { removed } = diffStats(dl);
        const beforeLines = before.split('\n').filter((l) => l.trim()).length;

        // TRAVA DE SEGURANÇA: a TESS às vezes devolve só o trecho alterado,
        // o que apagaria a maior parte do código original. Nesse caso NÃO
        // aplicamos automaticamente — pedimos confirmação explícita.
        const suspicious = beforeLines >= 6 && removed >= Math.ceil(beforeLines * 0.4);

        assistant.content = conciseSummary(reply);
        assistant.diff = dl;
        assistant.previousCode = before;
        assistant.proposedCode = cleanedCode;

        if (suspicious) {
          // Bloqueia a aplicação automática.
          assistant.applyState = 'blocked';
          assistant.content =
            'A resposta removeria grande parte do código atual — provavelmente veio incompleta. Não apliquei automaticamente. Revise o diff e decida abaixo.';
        } else {
          // Aplica e mantém o destaque no editor até você aprovar/reverter.
          onApplyCode(cleanedCode);
          assistant.code = cleanedCode;
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
  }

  function handleRevert(msg: ChatMessage) {
    if (msg.previousCode == null) return;
    onApplyCode(msg.previousCode);
    onHighlightDiff?.([]);
    onShowRemovedGhosts?.([]);
    setMessages((arr) => arr.map((m) => (m.id === msg.id ? { ...m, applyState: 'reverted' } : m)));
  }

  /** Aplica manualmente um resultado que foi bloqueado pela trava de segurança. */
  function handleApplyAnyway(msg: ChatMessage) {
    if (msg.proposedCode == null) return;
    const cleaned = cleanCode(msg.proposedCode);
    onApplyCode(cleaned);
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
    setMessages([]);
  }

  function onInputKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  const placeholder = MODES.find((m) => m.id === mode)?.placeholder ?? '';
  const isWelcome = messages.length === 0 && !loading;

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
          className="flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-surface-elevated/95 shadow-2xl ring-1 ring-black/8 backdrop-blur-xl supports-[backdrop-filter]:bg-surface-elevated/80 dark:ring-white/10"
        >
          {/* Header (alça de arrasto) */}
          <div
            onPointerDown={(e) => dragControls.start(e)}
            className="flex shrink-0 cursor-grab touch-none select-none items-center justify-between border-b border-border bg-gradient-to-b from-primary/8 to-transparent px-4 py-3 active:cursor-grabbing"
          >
            <div className="flex items-center gap-2">
              <TessLogo className="h-7 w-7" />
              <div className="text-sm font-semibold">Assistente TESS</div>
            </div>
            <div className="flex items-center gap-0.5" onPointerDown={(e) => e.stopPropagation()}>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleClearChat}
                disabled={messages.length === 0}
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
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center overflow-y-auto px-5 py-6">
              <Typewriter
                text="Como posso te ajudar hoje?"
                speed={60}
                cursor="|"
                className="text-base font-medium text-muted-foreground"
              />
            </div>
          ) : (
            <div ref={scrollRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto p-3">
              {messages.map((m) => (
                <div key={m.id} className={cn('flex gap-2', m.role === 'user' ? 'justify-end' : 'justify-start')}>
                  {m.role !== 'user' && <TessLogo className="mt-0.5 h-6 w-6 shrink-0" />}
                  <div
                    className={cn(
                      'max-w-[82%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed shadow-sm',
                      m.role === 'user'
                        ? 'rounded-tr-none bg-primary text-primary-foreground'
                        : m.isError
                        ? 'rounded-tl-none border border-destructive/40 bg-destructive/10 text-destructive'
                        : 'rounded-tl-none border border-border/60 bg-surface backdrop-blur-sm',
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
                        <div className="mt-2 flex items-center gap-1.5">
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-emerald-600 dark:text-emerald-400">
                            +{added}
                          </span>
                          <span className="inline-flex items-center gap-1 rounded-md bg-rose-500/15 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-rose-600 dark:text-rose-400">
                            -{removed}
                          </span>
                          {m.applyState === 'applied' && (
                            <button
                              type="button"
                              onClick={() => {
                                if (onScrollToDiff && m.diff) {
                                  const addedLines = computeAddedLines(m.diff);
                                  if (addedLines.length > 0) onScrollToDiff(addedLines[0]);
                                }
                              }}
                              className="ml-0.5 inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-medium text-primary transition-all hover:bg-primary/10 active:scale-95"
                            >
                              <Eye className="h-3 w-3" /> Avaliar
                            </button>
                          )}
                        </div>
                      );
                    })()}

                    {/* Aplicado — aguardando aprovação */}
                    {m.applyState === 'applied' && (
                      <div className="mt-2 flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleApprove(m)}
                          className="inline-flex items-center gap-1 rounded-lg bg-emerald-600 px-3 py-1 text-[11px] font-medium text-white shadow-sm transition-all hover:bg-emerald-700 active:scale-95"
                        >
                          <Check className="h-3 w-3" /> Aprovar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleRevert(m)}
                          className="inline-flex items-center gap-1 rounded-lg border border-border px-3 py-1 text-[11px] font-medium text-muted-foreground transition-all hover:bg-accent hover:text-foreground active:scale-95"
                        >
                          <Undo2 className="h-3 w-3" /> Reverter
                        </button>
                      </div>
                    )}

                    {/* Aprovado / Revertido — estado final (feedback no próprio balão) */}
                    {(m.applyState === 'approved' || m.applyState === 'reverted') && (
                      <motion.div
                        initial={reduce ? false : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={reduce ? { duration: 0 } : { type: 'spring', stiffness: 400, damping: 28 }}
                        className="mt-2"
                      >
                        {m.applyState === 'approved' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-emerald-500/15 px-2 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                            <Check className="h-3 w-3" /> Aprovado
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-muted px-2 py-0.5 text-[10px] font-semibold text-muted-foreground">
                            <Undo2 className="h-3 w-3" /> Revertido
                          </span>
                        )}
                      </motion.div>
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
                  <TessLogo className="mt-0.5 h-6 w-6 shrink-0" />
                  <div className="flex items-center gap-1 rounded-2xl rounded-tl-none border border-border/60 bg-surface px-4 py-3 shadow-sm">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40 [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-foreground/40" />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Input estilo PromptBox: textarea auto-resize + barra com modos (Popover) e enviar */}
          <div className="shrink-0 p-2.5">
            <div className="flex flex-col rounded-2xl border border-border bg-background p-2 shadow-sm transition-shadow focus-within:ring-2 focus-within:ring-ring">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e) => {
                  setInput(e.target.value);
                  adjustHeight();
                }}
                onKeyDown={onInputKeyDown}
                rows={1}
                placeholder={placeholder}
                className="custom-scrollbar max-h-[140px] w-full resize-none border-0 bg-transparent px-2 py-1.5 text-xs leading-relaxed outline-none placeholder:text-muted-foreground"
              />
              <div className="mt-1 flex items-center gap-2">
                {(() => {
                  const current = MODES.find((m) => m.id === mode) ?? MODES[0];
                  const CurrentIcon = current.icon;
                  return (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          className="inline-flex h-8 items-center gap-1.5 rounded-full border border-border px-3 text-[11px] font-medium text-foreground transition-colors hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                          aria-label="Selecionar modo"
                        >
                          <CurrentIcon className="h-3.5 w-3.5 text-primary" />
                          {current.label}
                          <ChevronDown className="h-3 w-3 text-muted-foreground" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent side="top" align="start" className="z-[80] min-w-[12rem] rounded-xl p-1.5">
                        {MODES.map((m) => {
                          const Icon = m.icon;
                          const active = mode === m.id;
                          return (
                            <DropdownMenuItem
                              key={m.id}
                              onSelect={() => setMode(m.id)}
                              className={cn('gap-2 rounded-lg px-2.5 py-2 text-xs', active && 'text-primary')}
                            >
                              <Icon className="h-4 w-4" />
                              <span className="flex-1">{m.label}</span>
                              {active && <Check className="h-3.5 w-3.5" />}
                            </DropdownMenuItem>
                          );
                        })}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  );
                })()}
                <Button
                  size="icon"
                  className="ml-auto h-8 w-8 shrink-0 rounded-full"
                  onClick={handleSend}
                  disabled={loading || !input.trim()}
                  aria-label="Enviar"
                >
                  {loading ? (
                    <div className="h-3.5 w-3.5 animate-spin rounded-sm bg-primary-foreground" style={{ animationDuration: '3s' }} />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
