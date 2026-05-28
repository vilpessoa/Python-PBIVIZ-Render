import { useRef, useState } from 'react';
import { ChevronDown, FileText, HelpCircle, Trash2, ZapOff, Radio } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/cn';
import type { Snippet } from '@/lib/storage';

interface Props {
  onRender: () => void;
  onToggleTheme: () => void;
  onHelp: () => void;
  theme: 'light' | 'dark';
  canRender: boolean;
  liveRender: boolean;
  onToggleLive: () => void;
  snippets: Snippet[];
  onLoadSnippet: (s: Snippet) => void;
  onDeleteSnippet: (id: string) => void;
}

function relativeTime(ts: number): string {
  const diff = (Date.now() - ts) / 1000;
  if (diff < 60) return `${Math.floor(diff)}s atrás`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min atrás`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h atrás`;
  return `${Math.floor(diff / 86400)}d atrás`;
}

export function AppHeader({
  onRender,
  onToggleTheme,
  onHelp,
  theme,
  canRender,
  liveRender,
  onToggleLive,
  snippets,
  onLoadSnippet,
  onDeleteSnippet,
}: Props) {
  const [search, setSearch] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  const filtered = snippets.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <TooltipProvider delayDuration={500}>
      <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-elevated px-8 shadow-card">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-card text-xl">
            🐍
          </div>
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-[15px] font-semibold tracking-tight">Python Render</span>
            <span className="text-[12px] text-muted-foreground">Python para HTML</span>
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <DropdownMenu>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/60 p-0.5 shadow-card">
              {/* Live toggle */}
              <Tooltip>
                <TooltipTrigger asChild>
                  <button
                    type="button"
                    onClick={() => { if (!liveRender && canRender) onRender(); onToggleLive(); }}
                    aria-pressed={liveRender}
                    className={cn(
                      'inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium transition-colors',
                      liveRender
                        ? 'bg-success/15 text-[hsl(var(--success))]'
                        : 'bg-muted/30 text-muted-foreground',
                    )}
                  >
                    {liveRender ? (
                      <>
                        <span className="relative flex h-2 w-2 shrink-0">
                          <span className="absolute inset-0 rounded-full bg-[hsl(var(--success))] pulse-dot" />
                        </span>
                        <span className="hidden sm:inline">Ao Vivo</span>
                      </>
                    ) : (
                      <>
                        <ZapOff className="h-3 w-3" />
                        <span className="hidden sm:inline">Manual</span>
                      </>
                    )}
                  </button>
                </TooltipTrigger>
                <TooltipContent>
                  {liveRender ? 'Modo Ao Vivo — renderiza automaticamente' : 'Modo Manual — pressione Ctrl+Enter'}
                </TooltipContent>
              </Tooltip>

              {/* Snippets / Rascunhos */}
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs font-medium text-muted-foreground dark:text-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                >
                  <FileText className="h-3 w-3" />
                  <span>Rascunhos</span>
                  {snippets.length > 0 && (
                    <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1">
                      {snippets.length}
                    </span>
                  )}
                  <ChevronDown className="h-3 w-3 opacity-60" />
                </button>
              </DropdownMenuTrigger>
            </div>

            <DropdownMenuContent align="center" className="w-72">
              {snippets.length > 1 && (
                <>
                  <div className="px-2 py-1.5">
                    <input
                      ref={searchRef}
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder="Filtrar rascunhos…"
                      className="w-full rounded border border-border bg-surface px-2 py-1 text-xs outline-none focus:ring-1 focus:ring-ring"
                    />
                  </div>
                  <DropdownMenuSeparator />
                </>
              )}
              {snippets.length === 0 && (
                <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                  Nenhum rascunho salvo ainda.
                  <br />
                  Use <kbd className="kbd">Ctrl+S</kbd> para salvar.
                </div>
              )}
              <div className="max-h-60 overflow-y-auto">
                {filtered.map((s) => (
                  <DropdownMenuItem
                    key={s.id}
                    className="group flex items-center justify-between gap-2 pr-1"
                    onSelect={() => onLoadSnippet(s)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="truncate text-xs font-medium">{s.name}</div>
                      <div className="text-[10px] text-muted-foreground">{relativeTime(s.updatedAt)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); onDeleteSnippet(s.id); }}
                      className="flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                      aria-label="Excluir rascunho"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </DropdownMenuItem>
                ))}
                {filtered.length === 0 && search && (
                  <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                    Nenhum resultado para "{search}"
                  </div>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                onClick={onHelp}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
                aria-label="Ajuda"
              >
                <HelpCircle className="h-3.5 w-3.5" />
              </button>
            </TooltipTrigger>
            <TooltipContent>Ajuda</TooltipContent>
          </Tooltip>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent">
            <AnimatedThemeToggler isDark={theme === 'dark'} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>
    </TooltipProvider>
  );
}
