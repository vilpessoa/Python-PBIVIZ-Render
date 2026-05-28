import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { MousePointerClick, X, FileCode2 } from 'lucide-react';
import type { Contributor } from '@/lib/pythonParser/types';

export interface VisualEditsMenuState {
  x: number;
  y: number;
  clickedLoc: { start: number; end: number };
  clickedLine: number;
  items: Contributor[];
}

interface Props {
  menu: VisualEditsMenuState | null;
  onSelect: (from: number, to: number) => void;
  onClose: () => void;
}

const MENU_MIN_W = 280;
const MENU_MAX_W = 460;
const VIEWPORT_PAD = 8;

type BadgeKind = 'var' | 'html' | 'text';

function TypeBadge({ kind }: { kind: BadgeKind }) {
  const base =
    'shrink-0 inline-flex items-center justify-center text-[9px] font-mono font-bold h-4 px-1 rounded border';
  if (kind === 'html') {
    return (
      <span className={`${base} bg-purple-100 text-purple-600 border-purple-200 dark:bg-purple-900/40 dark:text-purple-300 dark:border-purple-700`}>
        {'</>'}
      </span>
    );
  }
  if (kind === 'text') {
    return (
      <span className={`${base} bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-400 dark:border-emerald-700`}>
        Tx
      </span>
    );
  }
  return (
    <span className={`${base} bg-blue-100 text-blue-600 border-blue-200 dark:bg-blue-900/40 dark:text-blue-400 dark:border-blue-700`}>
      VAR
    </span>
  );
}

function htmlLabel(text: string): string {
  const tagMatch = /^<([a-zA-Z][a-zA-Z0-9-]*)/.exec(text);
  if (!tagMatch) return text;
  const tag = tagMatch[1];
  const rest = text.slice(tagMatch[0].length);
  const styleMatch = /\bstyle\s*=\s*['"]\s*([a-zA-Z-]+)/.exec(rest);
  if (styleMatch) return styleMatch[1];
  const attrMatch = /\s+[a-zA-Z][a-zA-Z0-9-]*\s*=\s*['"]([^'"]+)['"]/.exec(rest);
  if (attrMatch) return attrMatch[1].trim();
  return `<${tag}>`;
}

function labelOf(c: Contributor): string {
  if (c.kind === 'var') return c.name;
  if (c.kind === 'html') return htmlLabel(c.text);
  return c.text;
}

function locOf(c: Contributor): { start: number; end: number } {
  if (c.kind === 'var') return c.declLoc;
  return c.loc;
}

const TRECHO_KEY = '__trecho__';

export function VisualEditsMenu({ menu, onSelect, onClose }: Props) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [adjusted, setAdjusted] = useState<{
    left: number;
    top: number;
    anchor?: { left: number; top: number; width: number; height: number };
  } | null>(null);
  const [activeKey, setActiveKey] = useState<string | null>(null);

  useEffect(() => {
    setActiveKey(null);
  }, [menu?.clickedLoc.start, menu?.clickedLoc.end]);

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

  const sortedItems = [...menu.items].sort((a, b) => a.line - b.line);

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

        <div className="flex items-center justify-center gap-2 px-3 py-2 border-b border-border bg-gradient-to-b from-muted/40 to-transparent rounded-t-xl overflow-hidden">
          <MousePointerClick className="h-3.5 w-3.5 text-muted-foreground/70" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Elemento selecionado
          </span>
        </div>

        <div className="rounded-b-xl overflow-hidden">
          {sortedItems.length > 0 && (
            <div className="pt-1 max-h-72 overflow-y-auto">
              {sortedItems.map((c, i) => {
                const loc = locOf(c);
                const key = `${c.kind}-${loc.start}-${i}`;
                return (
                  <MenuItem
                    key={key}
                    kind={c.kind as BadgeKind}
                    label={labelOf(c)}
                    line={c.line}
                    active={activeKey === key}
                    onClick={() => { onSelect(loc.start, loc.end); setActiveKey(key); }}
                  />
                );
              })}
            </div>
          )}
          {sortedItems.length > 0 && <div className="mx-2.5 my-1 h-px bg-border" />}
          <TrechoItem
            line={menu.clickedLine}
            active={activeKey === TRECHO_KEY}
            onClick={() => { onSelect(menu.clickedLoc.start, menu.clickedLoc.end); setActiveKey(TRECHO_KEY); }}
          />
        </div>
      </div>
    </>
  );
}

function MenuItem({ kind, label, line, active, onClick }: { kind: BadgeKind; label: string; line: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2 px-2.5 py-1 text-xs transition-colors ${active ? 'bg-primary/10 ring-1 ring-inset ring-primary/30' : 'hover:bg-accent'}`}
      role="menuitem"
    >
      <TypeBadge kind={kind} />
      <span className="flex-1 min-w-0 truncate text-left font-mono text-foreground">{label}</span>
      <span className="shrink-0 text-[10px] tabular-nums text-muted-foreground/50">{line}</span>
    </button>
  );
}

function TrechoItem({ line, active, onClick }: { line: number; active?: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`w-full flex items-center gap-2.5 px-2.5 py-1.5 text-xs transition-colors ${
        active
          ? 'bg-blue-50 dark:bg-blue-950/40 ring-1 ring-inset ring-blue-300/60 dark:ring-blue-700/50'
          : 'bg-blue-50/60 dark:bg-blue-950/20 hover:bg-blue-100/80 dark:hover:bg-blue-950/40'
      }`}
      role="menuitem"
    >
      <span className="shrink-0 inline-flex items-center justify-center h-5 w-5 rounded bg-blue-100 dark:bg-blue-900/50 border border-blue-200 dark:border-blue-700 text-blue-600 dark:text-blue-400">
        <FileCode2 className="h-3 w-3" />
      </span>
      <span className="flex-1 min-w-0 truncate text-left font-mono font-medium text-blue-700 dark:text-blue-400">
        Trecho HTML final
      </span>
      <span className="shrink-0 text-[10px] tabular-nums text-blue-400/70 dark:text-blue-500/70">{line}</span>
    </button>
  );
}
