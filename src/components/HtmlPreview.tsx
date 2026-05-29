import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Monitor,
  Smartphone,
  Tablet,
  Maximize2,
  Paintbrush2,
} from 'lucide-react';
import { AnimatedVisualEditsButton } from '@/components/ui/animated-visual-edits-button';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { enhancePythonError } from '@/lib/pythonParser/errorEnhancer';
import { VE_OVERLAY_SCRIPT, type VELocateTokens } from '@/lib/visualEdits';
import type { ViewportState, PBISettings } from '@/lib/storage';
import type { ExtractedPbivizConfig } from '@/lib/pythonParser/types';
import { PBISettingsPanel } from '@/components/PBISettingsPanel';

interface Props {
  html: string;
  warnings: string[];
  error?: string;
  errorLine?: number;
  errorCol?: number;
  errorPos?: number;
  onJumpToError?: () => void;
  hasRendered: boolean;
  isPurePython?: boolean;
  rawValue?: string;
  measureName?: string;
  visualEditsEnabled: boolean;
  onToggleVisualEdits: () => void;
  cursorOffset: number;
  viewport: ViewportState;
  onViewportChange: (v: ViewportState) => void;
  onLocate: (tokens: VELocateTokens, screenX: number, screenY: number) => void;
  isPbiviz?: boolean;
  pbivizSettings: PBISettings;
  onPbivizSettingsChange: (s: PBISettings) => void;
  onPbivizSettingsReset?: () => void;
  extractedPbivizConfig?: ExtractedPbivizConfig;
}

const PRESETS: { id: string; label: string; width: number; height: number; icon: React.ElementType }[] = [
  { id: 'mobile', label: 'Mobile (390)', width: 390, height: 844, icon: Smartphone },
  { id: 'tablet', label: 'Tablet (768)', width: 768, height: 1024, icon: Tablet },
  { id: 'desktop', label: 'Desktop (1280)', width: 1280, height: 800, icon: Monitor },
  { id: 'fit', label: 'Fit', width: 0, height: 0, icon: Maximize2 },
];

function buildSrcdoc(html: string, visualEdits: boolean): string {
  if (!html) return '';
  const hasDoctype = /^\s*<!doctype/i.test(html);
  if (hasDoctype) {
    if (visualEdits) {
      return html.replace('</body>', `${VE_OVERLAY_SCRIPT}</body>`);
    }
    return html;
  }
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${html}${visualEdits ? VE_OVERLAY_SCRIPT : ''}</body></html>`;
}

export function HtmlPreview({
  html,
  warnings,
  error,
  errorLine,
  errorCol,
  errorPos,
  onJumpToError,
  hasRendered,
  isPurePython,
  rawValue,
  visualEditsEnabled,
  onToggleVisualEdits,
  cursorOffset,
  viewport,
  onViewportChange,
  onLocate,
  isPbiviz,
  pbivizSettings,
  onPbivizSettingsChange,
  onPbivizSettingsReset,
  extractedPbivizConfig,
}: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [containerSize, setContainerSize] = useState({ w: 0, h: 0 });
  const [showWarnings, setShowWarnings] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [dragging, setDragging] = useState<'left' | 'right' | 'bottom' | 'corner' | null>(null);
  const dragStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

  // Close settings panel when switching away from pbiviz
  useEffect(() => {
    if (!isPbiviz) setShowSettings(false);
  }, [isPbiviz]);

  // Track container size
  useEffect(() => {
    if (!containerRef.current) return;
    const ro = new ResizeObserver((entries) => {
      const e = entries[0];
      setContainerSize({ w: e.contentRect.width, h: e.contentRect.height });
    });
    ro.observe(containerRef.current);
    return () => ro.disconnect();
  }, []);

  // Send cursor position to iframe for VE highlight-on-cursor
  useEffect(() => {
    if (!visualEditsEnabled) return;
    iframeRef.current?.contentWindow?.postMessage({ type: 'python:cursorAt', offset: cursorOffset }, '*');
  }, [cursorOffset, visualEditsEnabled]);

  // Receive VE locate messages
  useEffect(() => {
    function onMessage(e: MessageEvent) {
      if (!e.data || typeof e.data !== 'object') return;
      if (e.data.type !== 'python:locate') return;
      const { tokens, clientX, clientY } = e.data;
      if (!tokens || typeof tokens !== 'object') return;
      const iframe = iframeRef.current;
      if (!iframe) return;
      const rect = iframe.getBoundingClientRect();
      onLocate(tokens as VELocateTokens, rect.left + (clientX ?? 0), rect.top + (clientY ?? 0));
    }
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [onLocate]);

  const isFit = viewport.preset === 'fit';
  const canvasW = isFit ? containerSize.w : Math.min(viewport.width, containerSize.w);
  const canvasH = isFit ? containerSize.h : viewport.height;
  const scale = isFit ? 1 : Math.min(1, containerSize.w / Math.max(1, viewport.width));

  // Drag resize
  function startDrag(axis: 'left' | 'right' | 'bottom' | 'corner', e: React.MouseEvent) {
    e.preventDefault();
    setDragging(axis);
    dragStart.current = { x: e.clientX, y: e.clientY, w: viewport.width, h: viewport.height };
  }

  useEffect(() => {
    if (!dragging) return;
    function onMove(e: MouseEvent) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      const newW =
        dragging === 'right' || dragging === 'corner'
          ? Math.max(200, Math.min(4096, dragStart.current.w + dx))
          : dragging === 'left'
          ? Math.max(200, Math.min(4096, dragStart.current.w - dx))
          : dragStart.current.w;
      const newH =
        dragging === 'bottom' || dragging === 'corner'
          ? Math.max(200, Math.min(4096, dragStart.current.h + dy))
          : dragStart.current.h;
      onViewportChange({ width: newW, height: newH, preset: 'custom' });
    }
    function onUp() {
      setDragging(null);
    }
    window.addEventListener('mousemove', onMove);
    window.addEventListener('mouseup', onUp);
    return () => {
      window.removeEventListener('mousemove', onMove);
      window.removeEventListener('mouseup', onUp);
    };
  }, [dragging, onViewportChange]);

  const srcDoc = html ? buildSrcdoc(html, visualEditsEnabled) : '';

  const enhanced = error ? enhancePythonError(error, undefined, errorPos, errorLine) : null;

  return (
    <TooltipProvider delayDuration={500}>
      <div className="flex h-full w-full flex-col bg-background">
        {/* Toolbar */}
        <div className="flex h-10 shrink-0 items-center border-b border-border bg-surface px-3">
          {/* Left: Preview label + size badge */}
          <div className="flex flex-1 items-center gap-2">
            <Monitor className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-semibold text-foreground">Preview</span>
            {viewport.preset === 'custom' && (
              <Badge variant="default" className="ml-1 text-[10px] font-mono">
                {viewport.width}×{viewport.height}
              </Badge>
            )}
          </div>

          {/* Right: viewport presets + settings + warnings + visual edits */}
          <div className="flex flex-1 items-center justify-end gap-2">
            {/* Viewport presets */}
            <div className="flex items-center gap-0.5">
              {PRESETS.map((p) => {
                const Icon = p.icon;
                const active = viewport.preset === p.id;
                return (
                  <button
                    key={p.id}
                    type="button"
                    aria-label={p.label}
                    onClick={() =>
                      onViewportChange({
                        width: p.width,
                        height: p.height,
                        preset: p.id,
                      })
                    }
                    className={`flex h-7 w-7 items-center justify-center rounded-full border border-border/50 transition-colors ${
                      active
                        ? 'bg-primary/15 text-primary border-primary/40'
                        : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </button>
                );
              })}
            </div>

            {isPbiviz && (
              <button
                type="button"
                aria-label="Formato Visual"
                onClick={() => setShowSettings((v) => !v)}
                className={`flex h-7 w-7 items-center justify-center rounded-full border border-border/50 transition-colors ${
                  showSettings
                    ? 'bg-primary/15 text-primary border-primary/40'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground'
                }`}
              >
                <Paintbrush2 className="h-3.5 w-3.5" />
              </button>
            )}

            {warnings.length > 0 && !error && (
              <button
                type="button"
                onClick={() => setShowWarnings((v) => !v)}
                className="flex items-center gap-1"
              >
                <Badge variant="warning" className="h-5 text-[10px]">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  {warnings.length} aviso{warnings.length === 1 ? '' : 's'}
                  {showWarnings ? (
                    <ChevronUp className="h-2.5 w-2.5" />
                  ) : (
                    <ChevronDown className="h-2.5 w-2.5" />
                  )}
                </Badge>
              </button>
            )}

            <AnimatedVisualEditsButton
              enabled={visualEditsEnabled}
              onClick={onToggleVisualEdits}
            />
          </div>
        </div>

        {/* Warnings panel */}
        {showWarnings && warnings.length > 0 && (
          <div className="border-b border-border bg-warning/5 px-3 py-2 max-h-28 overflow-y-auto">
            {warnings.map((w, i) => (
              <div key={i} className="flex items-start gap-1.5 text-xs text-warning py-0.5">
                <AlertTriangle className="h-3 w-3 mt-0.5 shrink-0" />
                <span>{w}</span>
              </div>
            ))}
          </div>
        )}

        {/* Main area: preview + optional settings panel */}
        <div className="relative flex flex-1 min-h-0 overflow-hidden">
          {/* Preview area */}
          <div ref={containerRef} className="relative flex flex-1 min-h-0 min-w-0 items-start justify-center overflow-auto bg-preview-bg">
            {showSettings && (
              <div
                className="absolute inset-0 z-10 cursor-pointer bg-black/40 backdrop-blur-sm"
                onClick={() => setShowSettings(false)}
              />
            )}
            {error ? (
              /* Error state */
              <div className="m-auto max-w-lg w-full p-6">
                <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-5">
                  <div className="flex items-center gap-2 mb-3">
                    <AlertCircle className="h-5 w-5 text-destructive shrink-0" />
                    <span className="text-sm font-semibold text-destructive">
                      {enhanced?.title ?? 'Erro de execução'}
                    </span>
                    {errorLine && (
                      <span className="text-xs text-muted-foreground ml-auto">
                        Linha {errorLine}{errorCol ? `:${errorCol}` : ''}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mb-3 font-mono break-all">
                    {enhanced?.message ?? error}
                  </p>
                  {enhanced?.snippet && (
                    <pre className="text-xs bg-muted rounded p-2 overflow-x-auto mb-3 font-mono">
                      {enhanced.snippet}
                    </pre>
                  )}
                  {enhanced?.suggestion && (
                    <p className="text-xs text-muted-foreground italic">{enhanced.suggestion}</p>
                  )}
                  {onJumpToError && (
                    <button
                      type="button"
                      onClick={onJumpToError}
                      className="mt-3 text-xs text-primary hover:underline"
                    >
                      Ir para o erro no editor
                    </button>
                  )}
                </div>
              </div>
            ) : isPurePython && rawValue != null ? (
              /* Pure Python scalar result */
              <div className="m-auto max-w-sm w-full p-6">
                <div className="rounded-xl border border-border bg-surface p-5 text-center">
                  <div className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">
                    Resultado
                  </div>
                  <div className="text-2xl font-bold font-mono break-all">{rawValue}</div>
                </div>
              </div>
            ) : !hasRendered ? (
              /* Empty state */
              <div className="m-auto flex flex-col items-center gap-3 text-muted-foreground/60 p-6 text-center">
                <div className="text-4xl">⚡</div>
                <p className="text-sm">
                  Digite código Python e pressione{' '}
                  <kbd className="kbd">Ctrl+Enter</kbd>, ou ative o{' '}
                  <strong className="text-muted-foreground">Modo Live</strong>.
                </p>
              </div>
            ) : (
              /* Iframe canvas */
              <div
                data-ve-anchor="preview-canvas"
                className="relative shrink-0"
                style={{
                  width: isFit ? '100%' : canvasW,
                  height: isFit ? '100%' : canvasH * scale,
                }}
              >
                <iframe
                  ref={iframeRef}
                  title="Python HTML Preview"
                  srcDoc={srcDoc}
                  sandbox="allow-scripts allow-same-origin"
                  style={{
                    width: isFit ? '100%' : viewport.width,
                    height: isFit ? '100%' : viewport.height,
                    transform: isFit ? undefined : `scale(${scale})`,
                    transformOrigin: 'top left',
                    border: 'none',
                    display: 'block',
                    pointerEvents: dragging ? 'none' : undefined,
                  }}
                />

                {/* Resize handles (only in non-fit mode) */}
                {!isFit && (
                  <>
                    <div
                      onMouseDown={(e) => startDrag('right', e)}
                      className="absolute right-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-primary/40 transition-colors"
                      style={{ transform: 'translateX(100%)' }}
                    />
                    <div
                      onMouseDown={(e) => startDrag('left', e)}
                      className="absolute left-0 top-0 h-full w-1.5 cursor-ew-resize hover:bg-primary/40 transition-colors"
                      style={{ transform: 'translateX(-100%)' }}
                    />
                    <div
                      onMouseDown={(e) => startDrag('bottom', e)}
                      className="absolute bottom-0 left-0 w-full h-1.5 cursor-ns-resize hover:bg-primary/40 transition-colors"
                      style={{ transform: 'translateY(100%)' }}
                    />
                    <div
                      onMouseDown={(e) => startDrag('corner', e)}
                      className="absolute bottom-0 right-0 w-3 h-3 cursor-nwse-resize hover:bg-primary/40 transition-colors rounded-tl"
                      style={{ transform: 'translate(100%, 100%)' }}
                    />
                  </>
                )}
              </div>
            )}
          </div>

          {/* PBI Settings Panel — posicionado absolutamente para não afetar o layout externo */}
          {showSettings && isPbiviz && (
            <div className="absolute right-0 top-0 bottom-0 z-20 flex h-full shadow-xl">
              <PBISettingsPanel
                settings={pbivizSettings}
                onChange={onPbivizSettingsChange}
                onClose={() => setShowSettings(false)}
                onReset={onPbivizSettingsReset}
                extractedFromCode={extractedPbivizConfig}
              />
            </div>
          )}
        </div>
      </div>
    </TooltipProvider>
  );
}
