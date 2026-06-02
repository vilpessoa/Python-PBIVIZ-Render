import { cn } from '@/lib/cn';
import { diffStats, type DiffLine } from './tessDiff';

interface Props {
  diff: DiffLine[];
}

/** Visualização git-style do diff (linhas +/- coloridas). */
export function DiffView({ diff }: Props) {
  const { added, removed } = diffStats(diff);

  return (
    <div className="mt-2 overflow-hidden rounded-lg border border-border bg-surface-sunken">
      <div className="flex items-center gap-2 border-b border-border px-2.5 py-1 text-[10px] font-medium">
        <span className="text-muted-foreground">Alterações</span>
        <span className="text-emerald-600 dark:text-emerald-400">+{added}</span>
        <span className="text-rose-600 dark:text-rose-400">-{removed}</span>
      </div>
      <pre className="max-h-52 overflow-auto px-0 py-1 text-[11px] leading-[1.5] font-mono">
        {diff.map((line, idx) => (
          <div
            key={idx}
            className={cn(
              'px-2.5 whitespace-pre-wrap break-words',
              line.type === 'add' && 'bg-emerald-500/12 text-emerald-700 dark:text-emerald-300',
              line.type === 'del' && 'bg-rose-500/12 text-rose-700 dark:text-rose-300',
              line.type === 'ctx' && 'text-muted-foreground',
            )}
          >
            <span className="select-none opacity-60">
              {line.type === 'add' ? '+ ' : line.type === 'del' ? '- ' : '  '}
            </span>
            {line.text || ' '}
          </div>
        ))}
      </pre>
    </div>
  );
}
