import { useRef, useState } from 'react';
import { ChevronDown, Code2, FileText, HelpCircle, Trash2, ZapOff } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown';
import { AnimatedThemeToggler } from '@/components/ui/animated-theme-toggler';
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
    <header className="relative flex h-14 shrink-0 items-center justify-between gap-3 border-b border-border bg-surface-elevated px-8 shadow-card">
        {/* Brand */}
        <div className="flex shrink-0 items-center gap-4">
          <img src="/logo.svg" alt="Logo" className="h-10 w-10 shrink-0 shadow-card rounded-lg" />
          <div className="hidden flex-col leading-tight md:flex">
            <span className="text-[15px] font-semibold tracking-tight">PBIVIZ Render</span>
            <span className="text-[12px] text-muted-foreground">Python para .pbiviz</span>
          </div>
        </div>

        {/* Center */}
        <div className="flex flex-1 items-center justify-center gap-2">
          <DropdownMenu>
            <div className="inline-flex items-center gap-0.5 rounded-full border border-border bg-background/60 p-0.5 shadow-card">
              {/* Live toggle */}
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
                    <span className="hidden sm:inline">Live</span>
                  </>
                ) : (
                  <>
                    <ZapOff className="h-3 w-3" />
                    <span className="hidden sm:inline">Manual</span>
                  </>
                )}
              </button>

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
              <div className="border-b border-border bg-gradient-to-r from-primary/10 to-primary/5 px-3 py-2.5">
                <div className="flex items-center gap-2 text-xs font-semibold tracking-tight text-primary">
                  <FileText className="h-4 w-4" />
                  Rascunhos
                </div>
                <div className="text-[10px] text-muted-foreground leading-relaxed">
                  Códigos Python salvos no navegador. Se limpar o cache, perderá tudo.
                </div>
              </div>
              <div className="p-1">
                {snippets.length > 0 && (
                  <>
                    <div className="relative px-1 pb-1 pt-0.5">
                      <Search className="pointer-events-none absolute left-3 top-1/2 h-3 w-3 -translate-y-1/2 text-muted-foreground" />
                      <input
                        ref={searchRef}
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="Filtrar..."
                        className="h-7 w-full rounded-lg border border-border bg-background pl-7 pr-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                        onKeyDown={(e) => e.stopPropagation()}
                      />
                    </div>
                  </>
                )}
                {snippets.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-muted-foreground">
                    Nenhum rascunho salvo
                  </div>
                ) : (
                  <>
                    <div className="max-h-60 overflow-y-auto">
                      <div className="space-y-1 p-1">
                        {filtered.map((s) => (
                          <DropdownMenuItem
                            key={s.id}
                            className="group flex cursor-pointer items-start gap-3 rounded-lg px-3 py-2.5 hover:bg-accent data-[highlighted]:bg-accent"
                            onSelect={() => onLoadSnippet(s)}
                          >
                            <div className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded bg-primary/10 text-primary">
                              <Code2 className="h-4 w-4" />
                            </div>
                            <div className="flex flex-1 flex-col gap-1 min-w-0">
                              <div className="truncate text-sm font-medium text-foreground">{s.name}</div>
                              <div className="text-[10px] text-muted-foreground">{relativeTime(s.updatedAt)}</div>
                            </div>
                            <button
                              type="button"
                              onClick={(e) => { e.stopPropagation(); e.preventDefault(); onDeleteSnippet(s.id); }}
                              className="ml-1 flex h-6 w-6 flex-shrink-0 items-center justify-center rounded text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive transition-all"
                              aria-label="Excluir rascunho"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </DropdownMenuItem>
                        ))}
                      </div>
                      {filtered.length === 0 && search && (
                        <div className="px-3 py-3 text-center text-xs text-muted-foreground">
                          Nenhum resultado para "{search}"
                        </div>
                      )}
                    </div>
                    {snippets.length > 3 && (
                      <div className="h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent" />
                    )}
                  </>
                )}
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Right */}
        <div className="flex shrink-0 items-center gap-1.5">
          <button
            onClick={onHelp}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            aria-label="Ajuda"
          >
            <HelpCircle className="h-3.5 w-3.5" />
          </button>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-accent">
            <AnimatedThemeToggler isDark={theme === 'dark'} onToggle={onToggleTheme} />
          </div>
        </div>
      </header>
  );
}
