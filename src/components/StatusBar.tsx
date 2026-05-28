import { Activity, AlertCircle, AlertTriangle, Eye, Zap } from 'lucide-react';
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
  return <span className="mx-1.5 h-3 w-px bg-border" />;
}

const THEME_LABELS: Record<string, string> = {
  default: 'Padrão',
  dracula: 'Dracula',
  nord: 'Nord',
  monokai: 'Monokai',
  tokyo: 'Tokyo',
  'soft-dark': 'Soft Dark',
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
    <div className="flex h-6 shrink-0 items-center justify-between border-t border-border bg-surface px-3 text-[11px] text-muted-foreground">
      {/* Left */}
      <div className="flex items-center">
        <span className="tabular-nums">
          Ln {line}, Col {col}
        </span>
        <VDivider />
        <span className="tabular-nums">
          {lineCount} {lineCount === 1 ? 'linha' : 'linhas'}
        </span>
      </div>

      {/* Right */}
      <div className="flex items-center">
        {liveRender && (
          <>
            <span className="flex items-center gap-1">
              <span className="pulse-dot" />
              Ao Vivo
            </span>
            <VDivider />
          </>
        )}
        {visualEditsEnabled && (
          <>
            <span className="flex items-center gap-1 text-primary">
              <Eye className="h-3 w-3" />
              Visual Edits
            </span>
            <VDivider />
          </>
        )}
        {errorCount > 0 && (
          <>
            <span className="flex items-center gap-1 text-destructive">
              <AlertCircle className="h-3 w-3" />
              {errorCount} {errorCount === 1 ? 'erro' : 'erros'}
            </span>
            <VDivider />
          </>
        )}
        {warningCount > 0 && (
          <>
            <span className="flex items-center gap-1 text-warning">
              <AlertTriangle className="h-3 w-3" />
              {warningCount} {warningCount === 1 ? 'aviso' : 'avisos'}
            </span>
            <VDivider />
          </>
        )}
        {lastRenderMs !== null && (
          <>
            <span className="flex items-center gap-1 sm:flex hidden">
              <Activity className="h-3 w-3" />
              {lastRenderMs}ms
            </span>
            <VDivider />
          </>
        )}
        <span className="md:flex hidden items-center gap-1">
          <Zap className="h-3 w-3" />
          {THEME_LABELS[pythonEditorTheme] ?? pythonEditorTheme} · {theme === 'dark' ? 'Escuro' : 'Claro'}
        </span>
      </div>
    </div>
  );
}
