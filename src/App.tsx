import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Toaster, toast } from 'sonner';
import { AppHeader } from '@/components/AppHeader';
import { PythonEditorToolbar } from '@/components/PythonEditorToolbar';
import { SplitPane } from '@/components/SplitPane';
import { PythonEditor, type PythonEditorHandle } from '@/components/PythonEditor';
import { HtmlPreview } from '@/components/HtmlPreview';
import { SaveSnippetDialog } from '@/components/SaveSnippetDialog';
import { HelpDialog } from '@/components/HelpDialog';
import { SearchBar } from '@/components/SearchBar';
import { AnimatePresence } from 'framer-motion';
import { StatusBar } from '@/components/StatusBar';
import { useDebounce } from '@/hooks/useDebounce';
import { useHotkeys } from '@/hooks/useHotkeys';
import {
  loadState,
  saveState,
  type Snippet,
  type ViewportState,
  type PythonEditorTheme,
} from '@/lib/storage';
import { parsePython } from '@/lib/pythonParser';
import type { ParseResult } from '@/lib/pythonParser/types';
import { VisualEditsMenu, type VisualEditsMenuState } from '@/components/VisualEditsMenu';
import { ZOOM_DEFAULT, ZOOM_MAX, ZOOM_MIN } from '@/components/ZoomControls';
import DEFAULT_SAMPLE from '@/data/sampleDefault';

const ACCENT_PRESETS: Record<string, { light: string; dark: string }> = {
  purple: { light: '262 83% 58%', dark: '255 92% 76%' },
  blue: { light: '217 91% 50%', dark: '213 94% 68%' },
  green: { light: '158 64% 35%', dark: '158 64% 52%' },
  pink: { light: '329 86% 52%', dark: '329 86% 70%' },
  orange: { light: '27 96% 45%', dark: '27 96% 61%' },
};

const FONT_FAMILY_MAP: Record<string, string> = {
  'space-grotesk': '"Space Grotesk", Inter, system-ui, sans-serif',
  inter: '"Inter", system-ui, sans-serif',
  system: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
};

function clampZoom(v: number) {
  return Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, v));
}

export default function App() {
  const initialState = useMemo(() => loadState(), []);
  const [code, setCode] = useState(initialState.currentCode || DEFAULT_SAMPLE);
  const [theme, setTheme] = useState<'light' | 'dark'>(initialState.theme);
  const [panelSplit, setPanelSplit] = useState(initialState.panelSplit);
  const [snippets, setSnippets] = useState<Snippet[]>(initialState.savedSnippets);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [fontSize, setFontSize] = useState<number>(clampZoom(initialState.editorFontSize));
  const [visualEditsEnabled, setVisualEditsEnabled] = useState<boolean>(
    initialState.visualEditsEnabled,
  );
  const [liveRender, setLiveRender] = useState<boolean>(initialState.liveRender);
  const [viewport, setViewport] = useState<ViewportState>(initialState.viewport);
  const [accentColor] = useState<string>(initialState.accentColor ?? 'blue');
  const [fontFamily] = useState<string>(initialState.fontFamily ?? 'space-grotesk');
  const [pythonEditorTheme, setPythonEditorTheme] = useState<PythonEditorTheme>(
    initialState.pythonEditorTheme ?? 'default',
  );

  const [cursor, setCursor] = useState<{ offset: number; line: number; col: number }>({
    offset: 0,
    line: 1,
    col: 1,
  });
  const [lineCount, setLineCount] = useState(1);
  const [lastRenderMs, setLastRenderMs] = useState<number | null>(null);

  const editorRef = useRef<PythonEditorHandle | null>(null);

  const [rendered, setRendered] = useState<ParseResult | null>(null);
  const [veMenu, setVeMenu] = useState<VisualEditsMenuState | null>(null);
  const renderedRef = useRef<ParseResult | null>(null);
  useEffect(() => {
    renderedRef.current = rendered;
  }, [rendered]);

  // Apply dark/light class
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') root.classList.add('dark');
    else root.classList.remove('dark');
  }, [theme]);

  // Apply accent color
  useEffect(() => {
    const preset = ACCENT_PRESETS[accentColor] ?? ACCENT_PRESETS.blue;
    const val = theme === 'dark' ? preset.dark : preset.light;
    const root = document.documentElement;
    root.style.setProperty('--primary', val);
    root.style.setProperty('--primary-from', val);
    root.style.setProperty('--ring', val);
  }, [accentColor, theme]);

  // Apply font family
  useEffect(() => {
    document.body.style.fontFamily =
      FONT_FAMILY_MAP[fontFamily] ?? FONT_FAMILY_MAP['space-grotesk'];
  }, [fontFamily]);

  // Persist code (debounced)
  const debouncedCode = useDebounce(code, 1000);
  useEffect(() => {
    saveState({
      currentCode: debouncedCode,
      savedSnippets: snippets,
      theme,
      panelSplit,
      editorFontSize: fontSize,
      visualEditsEnabled,
      liveRender,
      viewport,
      accentColor,
      fontFamily,
      pythonEditorTheme,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedCode]);

  // Persist other settings immediately
  useEffect(() => {
    saveState({
      currentCode: code,
      savedSnippets: snippets,
      theme,
      panelSplit,
      editorFontSize: fontSize,
      visualEditsEnabled,
      liveRender,
      viewport,
      accentColor,
      fontFamily,
      pythonEditorTheme,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    snippets,
    theme,
    panelSplit,
    fontSize,
    visualEditsEnabled,
    liveRender,
    viewport,
    accentColor,
    fontFamily,
    pythonEditorTheme,
  ]);

  const renderCode = useCallback(
    (source: string, opts: { showToast: boolean }) => {
      const trimmed = source.trim();
      if (!trimmed) {
        setRendered(null);
        setLastRenderMs(null);
        return;
      }
      const t0 = performance.now();
      const result = parsePython(source);
      const t1 = performance.now();
      setLastRenderMs(Math.round(t1 - t0));
      setRendered(result);
      if (result.error && opts.showToast) {
        toast.error('Erro ao renderizar', {
          description: result.error,
          position: 'top-center',
        });
      }
    },
    [],
  );

  const doRender = useCallback(() => {
    renderCode(code, { showToast: true });
  }, [renderCode, code]);

  // Live auto-render
  const liveDebouncedCode = useDebounce(code, 400);
  useEffect(() => {
    if (!liveRender) return;
    renderCode(liveDebouncedCode, { showToast: false });
  }, [liveDebouncedCode, liveRender, renderCode]);

  const doCopy = useCallback(() => {
    if (!code.trim()) {
      toast.error('Nada para copiar — editor está vazio', { position: 'top-center' });
      return;
    }
    navigator.clipboard
      .writeText(code)
      .then(() => toast.success('Python copiado!', { position: 'top-right' }))
      .catch(() => toast.error('Falha ao copiar', { position: 'top-center' }));
  }, [code]);

  const doUndo = useCallback(() => {
    editorRef.current?.undo();
  }, []);

  const doClear = useCallback(() => {
    setCode('');
    setRendered(null);
    setLastRenderMs(null);
  }, []);

  const doToggleTheme = useCallback(() => {
    setTheme((t) => (t === 'dark' ? 'light' : 'dark'));
  }, []);

  const onPythonEditorThemeChange = useCallback((t: PythonEditorTheme) => {
    setPythonEditorTheme(t);
  }, []);

  const doToggleLive = useCallback(() => {
    setLiveRender((v) => !v);
  }, []);

  const openSaveDialog = useCallback(() => setSaveDialogOpen(true), []);

  const saveSnippet = useCallback(
    (name: string) => {
      const now = Date.now();
      const snip: Snippet = {
        id: 'snip_' + now.toString(36) + Math.random().toString(36).slice(2, 6),
        name,
        code,
        createdAt: now,
        updatedAt: now,
      };
      setSnippets((s) => [snip, ...s]);
      toast.success(`Rascunho "${name}" salvo`, { position: 'top-right' });
    },
    [code],
  );

  const loadSnippet = useCallback((s: Snippet) => {
    setCode(s.code);
    toast.success(`Rascunho "${s.name}" carregado`, { position: 'top-right' });
  }, []);

  const deleteSnippet = useCallback((id: string) => {
    setSnippets((arr) => arr.filter((x) => x.id !== id));
  }, []);

  const onFontSizeChange = useCallback((v: number) => setFontSize(clampZoom(v)), []);
  const onToggleVisualEdits = useCallback(() => {
    setVisualEditsEnabled((v) => {
      if (v) setVeMenu(null);
      return !v;
    });
  }, []);

  // Hotkeys
  const handlersRef = useRef({
    doRender,
    openSaveDialog,
    doClear,
    onFontSizeChange,
    fontSize,
    setSearchOpen,
  });
  handlersRef.current = { doRender, openSaveDialog, doClear, onFontSizeChange, fontSize, setSearchOpen };

  const hotkeyMap = useMemo(
    () => ({
      'ctrl+enter': () => handlersRef.current.doRender(),
      'ctrl+s': () => handlersRef.current.openSaveDialog(),
      'ctrl+l': () => handlersRef.current.doClear(),
      'ctrl+=': () => handlersRef.current.onFontSizeChange(handlersRef.current.fontSize + 1),
      'ctrl+-': () => handlersRef.current.onFontSizeChange(handlersRef.current.fontSize - 1),
      'ctrl+0': () => handlersRef.current.onFontSizeChange(ZOOM_DEFAULT),
      'ctrl+f': () => handlersRef.current.setSearchOpen(true),
    }),
    [],
  );
  useHotkeys(hotkeyMap);

  const onSplitChange = useCallback((s: number) => setPanelSplit(s), []);

  const onVisualEditsLocate = useCallback(
    (loc: string, screenX: number, screenY: number) => {
      const m = /^(\d+)-(\d+)$/.exec(loc);
      if (!m) return;
      const entry = renderedRef.current?.contributors?.[loc];
      if (!entry || entry.items.length === 0) {
        editorRef.current?.scrollAndSelect(parseInt(m[1], 10), parseInt(m[2], 10));
        setVeMenu(null);
        return;
      }
      setVeMenu({
        x: screenX,
        y: screenY,
        clickedLoc: entry.rootLoc,
        clickedLine: entry.rootLine,
        items: entry.items,
      });
    },
    [],
  );

  const onVeMenuSelect = useCallback((from: number, to: number) => {
    editorRef.current?.scrollAndSelect(from, to);
  }, []);

  const onVeMenuClose = useCallback(() => setVeMenu(null), []);

  const warningCount = rendered?.warnings.length ?? 0;
  const errorCount = rendered?.error ? 1 : 0;

  return (
    <div className="flex h-full w-full flex-col bg-background text-foreground">
      <AppHeader
        onRender={doRender}
        onToggleTheme={doToggleTheme}
        onHelp={() => setHelpOpen(true)}
        theme={theme}
        canRender={code.trim().length > 0}
        liveRender={liveRender}
        onToggleLive={doToggleLive}
        snippets={snippets}
        onLoadSnippet={loadSnippet}
        onDeleteSnippet={deleteSnippet}
      />

      <div className="flex min-h-0 flex-1">
        <SplitPane
          initialSplit={panelSplit}
          onSplitChange={onSplitChange}
          left={
            <div className="flex h-full w-full flex-col overflow-hidden border-r border-border">
              <PythonEditorToolbar
                fontSize={fontSize}
                onFontSizeChange={onFontSizeChange}
                onUndo={doUndo}
                onCopy={doCopy}
                onSaveSnippet={openSaveDialog}
                onClear={doClear}
                pythonEditorTheme={pythonEditorTheme}
                onPythonEditorThemeChange={onPythonEditorThemeChange}
                searchOpen={searchOpen}
                onToggleSearch={() => setSearchOpen((v) => !v)}
                code={code}
                onAiApply={setCode}
              />
              <AnimatePresence>
                {searchOpen && (
                  <SearchBar
                    editorRef={editorRef}
                    onClose={() => setSearchOpen(false)}
                  />
                )}
              </AnimatePresence>
              <div className="min-h-0 flex-1 overflow-hidden">
                <PythonEditor
                  ref={editorRef}
                  value={code}
                  onChange={setCode}
                  theme={theme}
                  pythonEditorTheme={pythonEditorTheme}
                  fontSize={fontSize}
                  onCursorChange={setCursor}
                  onDocStats={({ lineCount }) => setLineCount(lineCount)}
                  errorPos={rendered?.errorPos ?? null}
                  errorEndPos={rendered?.errorEndPos ?? null}
                />
              </div>
            </div>
          }
          right={
            <HtmlPreview
              html={rendered?.html ?? ''}
              warnings={rendered?.warnings ?? []}
              error={rendered?.error}
              errorLine={rendered?.errorLine}
              errorCol={rendered?.errorCol}
              errorPos={rendered?.errorPos}
              onJumpToError={
                rendered?.errorPos != null
                  ? () => {
                      const pos = rendered!.errorPos!;
                      const end = rendered!.errorEndPos ?? pos + 1;
                      editorRef.current?.scrollAndSelect(pos, end);
                    }
                  : undefined
              }
              hasRendered={rendered !== null && !rendered.error}
              isPurePython={rendered?.isPurePython}
              rawValue={rendered?.rawValue}
              measureName={rendered?.measureName}
              visualEditsEnabled={visualEditsEnabled}
              onToggleVisualEdits={onToggleVisualEdits}
              cursorOffset={cursor.offset}
              viewport={viewport}
              onViewportChange={setViewport}
              onLocate={onVisualEditsLocate}
            />
          }
        />
      </div>

      <StatusBar
        line={cursor.line}
        col={cursor.col}
        lineCount={lineCount}
        lastRenderMs={lastRenderMs}
        errorCount={errorCount}
        warningCount={warningCount}
        visualEditsEnabled={visualEditsEnabled}
        liveRender={liveRender}
        theme={theme}
        pythonEditorTheme={pythonEditorTheme}
      />

      <SaveSnippetDialog
        open={saveDialogOpen}
        onOpenChange={setSaveDialogOpen}
        onSave={saveSnippet}
      />

      <HelpDialog open={helpOpen} onOpenChange={setHelpOpen} />

      <VisualEditsMenu menu={veMenu} onSelect={onVeMenuSelect} onClose={onVeMenuClose} />

      <Toaster theme={theme} position="bottom-center" duration={2000} richColors />
    </div>
  );
}
