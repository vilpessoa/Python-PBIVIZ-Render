import { AlertCircle, AlertTriangle, Clock, Hash, MousePointerClick } from 'lucide-react';
import type { PythonEditorTheme } from '@/lib/storage';

interface Props {
  line: number;
  col: number;
  lineCount: number;
  lastRenderMs: number | null;
  errorCount: number;
  warningCount: number;
  visualEditsEnabled: boolean;
  liveRender: boolean;
  theme: 'light' | 'dark';
  pythonEditorTheme: PythonEditorTheme;
}

function VDivider() {
  return (
    <span
      aria-hidden
      className="mx-3 hidden h-3 w-px shrink-0 rounded-full bg-border opacity-50 md:inline-block"
    />
  );
}

const THEME_LABELS: Record<string, string> = {
  default: 'Python',
  soft: 'Soft',
  'soft-dark': 'Soft Dark',
  'one-pro': 'One Pro',
  dracula: 'Dracula',
  nord: 'Nord',
  monokai: 'Monokai',
  tokyo: 'Tokyo',
  github: 'GitHub',
  gruvbox: 'Gruvbox',
  ayu: 'Ayu',
};

export function StatusBar({
  line,
  col,
  lineCount,
  lastRenderMs,
  errorCount,
  warningCount,
  visualEditsEnabled,
  liveRender,
  theme,
  pythonEditorTheme,
}: Props) {
  return (
    <div className="flex h-9 shrink-0 items-center justify-between border-t border-border bg-surface-elevated px-8 text-[11px] text-muted-foreground">
      {/* Left */}
      <div className="flex items-center">
        <span className="tabular-nums">
          Ln {line}, Col {col}
        </span>
        <VDivider />
        <span className="hidden items-center gap-1 sm:flex">
          <Hash className="h-3 w-3" />
          <span className="tabular-nums">{lineCount}</span> linha{lineCount === 1 ? '' : 's'}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center">
        {liveRender && (
          <span className="hidden items-center gap-1.5 text-[hsl(var(--success))] sm:inline-flex">
            <span className="relative flex h-1.5 w-1.5">
              <span className="absolute inset-0 rounded-full bg-[hsl(var(--success))] pulse-dot" />
            </span>
            Live
          </span>
        )}
        {visualEditsEnabled && (
          <>
            <VDivider />
            <span className="hidden items-center gap-1 text-primary md:inline-flex">
              <MousePointerClick className="h-3 w-3" />
              Visual Edits
            </span>
          </>
        )}
        {errorCount > 0 && (
          <>
            <VDivider />
            <span className="flex items-center gap-1 rounded bg-destructive/15 px-1.5 py-0.5 text-destructive">
              <AlertCircle className="h-3 w-3" />
              <span className="tabular-nums">{errorCount}</span> erro{errorCount === 1 ? '' : 's'}
            </span>
          </>
        )}
        {warningCount > 0 && (
          <>
            <VDivider />
            <span className="flex items-center gap-1 rounded bg-[hsl(var(--warning)/0.15)] px-1.5 py-0.5 text-[hsl(var(--warning))]">
              <AlertTriangle className="h-3 w-3" />
              <span className="tabular-nums">{warningCount}</span> aviso{warningCount === 1 ? '' : 's'}
            </span>
          </>
        )}
        {lastRenderMs !== null && (
          <>
            <VDivider />
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span className="tabular-nums">{lastRenderMs}</span>ms
            </span>
          </>
        )}
        <VDivider />
        <span className="hidden md:inline">
          {THEME_LABELS[pythonEditorTheme] ?? pythonEditorTheme} · {theme === 'dark' ? 'Escuro' : 'Claro'}
        </span>
      </div>
    </div>
  );
}
