import { useRef, useState } from 'react';
import { BookOpen, ChevronDown, Radio, Trash2, Zap } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Button } from '@/components/ui/button';
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
      <header className="flex h-12 shrink-0 items-center justify-between border-b border-border bg-surface px-4 gap-3">
        {/* Brand */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-gradient-to-br from-primary to-primary/70 text-white text-sm font-bold shadow-sm">
            🐍
          </div>
          <div className="leading-none">
            <p className="text-sm font-semibold tracking-tight">Python Render</p>
            <p className="text-[10px] text-muted-foreground">Python para HTML</p>
          </div>
        </div>

        {/* Center */}
        <div className="flex items-center gap-2">
          {/* Live toggle */}
          <Tooltip>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={onToggleLive}
                className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium transition-all ${
                  liveRender
                    ? 'bg-success/15 text-success ring-1 ring-success/40'
                    : 'bg-muted text-muted-foreground hover:bg-accent'
                }`}
              >
                {liveRender ? (
                  <>
                    <Radio className="h-3 w-3" />
                    Ao Vivo
                  </>
                ) : (
                  <>
                    <Zap className="h-3 w-3" />
                    Manual
                  </>
                )}
              </button>
            </TooltipTrigger>
            <TooltipContent>
              {liveRender ? 'Modo Ao Vivo — renderiza automaticamente' : 'Modo Manual — pressione Ctrl+Enter'}
            </TooltipContent>
          </Tooltip>

          {/* Snippets / Rascunhos */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-7 gap-1.5 text-xs">
                Rascunhos
                {snippets.length > 0 && (
                  <span className="flex h-4 min-w-4 items-center justify-center rounded-full bg-primary/15 text-primary text-[10px] font-semibold px-1">
                    {snippets.length}
                  </span>
                )}
                <ChevronDown className="h-3 w-3 opacity-60" />
              </Button>
            </DropdownMenuTrigger>
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
        <div className="flex items-center gap-1">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button variant="ghost" size="icon" className="h-7 w-7" onClick={onHelp} aria-label="Ajuda">
                <BookOpen className="h-4 w-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Ajuda</TooltipContent>
          </Tooltip>
          <AnimatedThemeToggler isDark={theme === 'dark'} onToggle={onToggleTheme} />
        </div>
      </header>
    </TooltipProvider>
  );
}
