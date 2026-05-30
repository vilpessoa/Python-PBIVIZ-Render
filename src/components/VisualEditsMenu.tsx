import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MousePointerClick, X } from 'lucide-react';
import type { VEMatch, VEMatchKind } from '@/lib/veSearch';

function KindBadge({ kind }: { kind: VEMatchKind }) {
  const base =
    'shrink-0 inline-flex items-center justify-center text-[9px] font-mono font-bold h-4 px-1 rounded border';
  switch (kind) {
    case 'html':
      return <span className={`${base} bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700`}>{'</>'}</span>;
    case 'text':
      return <span className={`${base} bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700`}>Tx</span>;
    case 'css':
      return <span className={`${base} bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/40 dark:text-orange-400 dark:border-orange-700`}>CSS</span>;
    case 'json':
      return <span className={`${base} bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/40 dark:text-amber-400 dark:border-amber-700`}>{'{}'}</span>;
    case 'var':
    default:
      return <span className={`${base} bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700`}>VAR</span>;
  }
}

export interface VisualEditsMenuState {
  x: number;
  y: number;
  elementLabel: string;
  matches: VEMatch[];
}

interface Props {
  menu: VisualEditsMenuState | null;
  onSelect: (from: number, to: number) => void;
  onClose: () => void;
}

const MENU_MIN_W = 280;
const MENU_MAX_W = 480;
const VIEWPORT_PAD = 8;

export function VisualEditsMenu({ menu, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [adjusted, setAdjusted] = useState<{
    left: number;
    top: number;
    anchor?: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const [activeIdx, setActiveIdx] = useState<number | null>(null);

  useEffect(() => {
    setActiveIdx(null);
  }, [menu?.elementLabel]);

  useLayoutEffect(() => {
    if (!menu || !ref.current) { setAdjusted(null); return; }
    const rect = ref.current.getBoundingClientRect();
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    let cx = menu.x;
    let cy = menu.y;
    let anchorRect: { left: number; top: number; width: number; height: number } | undefined;
    const anchor = document.querySelector<HTMLElement>('[data-ve-anchor="preview-canvas"]');
    if (anchor) {
      const ar = anchor.getBoundingClientRect();
      cx = ar.left + ar.width / 2;
      cy = ar.top + ar.height / 2;
      anchorRect = { left: ar.left, top: ar.top, width: ar.width, height: ar.height };
    }
    let left = cx - rect.width / 2;
    let top = cy - rect.height / 2;
    if (left + rect.width > vw - VIEWPORT_PAD) left = vw - rect.width - VIEWPORT_PAD;
    if (top + rect.height > vh - VIEWPORT_PAD) top = vh - rect.height - VIEWPORT_PAD;
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD;
    if (top < VIEWPORT_PAD) top = VIEWPORT_PAD;
    setAdjusted({ left, top, anchor: anchorRect });
  }, [menu]);

  useEffect(() => {
    if (!menu) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onClose(); }
    }
    function onClick(e: MouseEvent) {
      if (!ref.current) return;
      if (!ref.current.contains(e.target as Node)) onClose();
    }
    window.addEventListener('keydown', onKey);
    const t = window.setTimeout(() => window.addEventListener('mousedown', onClick, true), 0);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.clearTimeout(t);
      window.removeEventListener('mousedown', onClick, true);
    };
  }, [menu, onClose]);

  if (!menu) return null;

  const backdropStyle: React.CSSProperties = adjusted?.anchor
    ? {
        position: 'fixed',
        left: adjusted.anchor.left,
        top: adjusted.anchor.top,
        width: adjusted.anchor.width,
        height: adjusted.anchor.height,
        zIndex: 59,
        backgroundColor: 'rgba(0,0,0,0.35)',
        backdropFilter: 'blur(1px)',
        WebkitBackdropFilter: 'blur(1px)',
      }
    : { display: 'none' };

  const menuStyle: React.CSSProperties = {
    position: 'fixed',
    left: adjusted?.left ?? menu.x,
    top: adjusted?.top ?? menu.y,
    minWidth: MENU_MIN_W,
    maxWidth: MENU_MAX_W,
    visibility: adjusted ? 'visible' : 'hidden',
    zIndex: 60,
    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.08), 0 10px 24px -4px rgba(0,0,0,0.14)',
  };

  const hasMatches = menu.matches.length > 0;

  return (
    <>
      <div style={backdropStyle} onClick={onClose} />
      <div
        ref={ref}
        style={menuStyle}
        className="relative rounded-xl border border-border bg-white dark:bg-zinc-900 overflow-visible ring-1 ring-black/8 dark:ring-white/10"
        role="menu"
      >
        <button
          type="button"
          onClick={onClose}
          aria-label="Fechar"
          className="absolute -top-3 -right-3 z-10 flex h-6 w-6 items-center justify-center rounded-full bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 text-zinc-400 dark:text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-50 dark:hover:bg-zinc-700 transition-colors"
          style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)' }}
        >
          <X className="h-3.5 w-3.5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-2 px-3 py-2 border-b border-border bg-gradient-to-b from-muted/40 to-transparent rounded-t-xl overflow-hidden">
          <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground/70 shrink-0" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground truncate">
            {menu.elementLabel || 'Elemento selecionado'}
          </span>
        </div>

        <div className="rounded-b-xl overflow-hidden">
          {hasMatches ? (
            <div className="pt-1 max-h-72 overflow-y-auto">
              {menu.matches.map((m, i) => (
                <MatchItem
                  key={i}
                  match={m}
                  active={activeIdx === i}
                  onClick={() => { onSelect(m.start, m.end); setActiveIdx(i); }}
                />
              ))}
            </div>
          ) : (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">
              Nenhuma linha encontrada no código.
            </div>
          )}
        </div>
      </div>
    </>
  );
}

function MatchItem({ match, active, onClick }: { match: VEMatch; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1 text-xs transition-colors ${
        active
          ? 'bg-primary/10 ring-1 ring-inset ring-primary/30'
          : 'hover:bg-accent'
      }`}
      role="menuitem"
    >
      <KindBadge kind={match.kind} />
      <span className="flex-1 min-w-0 truncate text-left font-mono text-foreground">{match.label}</span>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/50">L{match.line}</span>
    </button>
  );
}
