import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { AppHeader } from "./components/AppHeader";
import { SplitPane } from "./components/SplitPane";
import { PythonEditor } from "./components/PythonEditor";
import { PbivizPreview } from "./components/PbivizPreview";
import { MockHostPanel } from "./components/MockHostPanel";
import { StatusBar } from "./components/StatusBar";
import { SettingsDialog } from "./components/SettingsDialog";
import { HelpDialog } from "./components/HelpDialog";
import { SaveSnippetDialog, LoadSnippetDialog } from "./components/SnippetDialogs";
import { AIAssistantDialog } from "./components/AIAssistantDialog";

import { DEFAULT_SCRIPT } from "./data/defaultScript";
import { SAMPLE_TESS_V3 } from "./data/sampleDataViews";
import { loadState, loadSettings, saveState, type AppSettings, type SnippetEntry } from "./lib/storage";
import { usePyodideBuild } from "./hooks/usePyodideBuild";
import { parseDataRoles, parseObjects } from "./lib/capabilitiesSchema";
import { buildDataView, type DataViewConfig } from "./lib/dataViewFactory";

function defaultObjectsFromCaps(caps: any): Record<string, Record<string, any>> {
  const out: Record<string, Record<string, any>> = {};
  for (const o of parseObjects(caps)) {
    out[o.name] = {};
  }
  return out;
}

export default function App() {
  const persisted = useMemo(() => loadState(), []);
  const [settings, setSettings] = useState<AppSettings>(() => loadSettings());
  const [source, setSource] = useState<string>(persisted.draft || DEFAULT_SCRIPT);
  const [snippets, setSnippets] = useState<Record<string, SnippetEntry>>(persisted.snippets ?? {});
  const [dataViewConfig, setDataViewConfig] = useState<DataViewConfig>(
    (persisted.dataViewConfig as DataViewConfig) ?? SAMPLE_TESS_V3,
  );
  const [objects, setObjects] = useState<Record<string, Record<string, any>>>(persisted.objects ?? {});

  const [splitRatio, setSplitRatio] = useState(settings.splitRatio);
  const [resetKey, setResetKey] = useState(0);

  const [openSettings, setOpenSettings] = useState(false);
  const [openHelp, setOpenHelp] = useState(false);
  const [openSave, setOpenSave] = useState(false);
  const [openLoad, setOpenLoad] = useState(false);
  const [openAI, setOpenAI] = useState(false);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "dark");
  }, [settings.theme]);

  // Persist on changes
  useEffect(() => { saveState({ draft: source }); }, [source]);
  useEffect(() => { saveState({ settings }); }, [settings]);
  useEffect(() => { saveState({ snippets }); }, [snippets]);
  useEffect(() => { saveState({ dataViewConfig }); }, [dataViewConfig]);
  useEffect(() => { saveState({ objects }); }, [objects]);

  const { status, result, error, runNow } = usePyodideBuild(source, settings.debounceMs, settings.autoRun);

  // Seed defaults for objects whenever capabilities first arrive
  useEffect(() => {
    if (!result?.capabilities) return;
    const defaults = defaultObjectsFromCaps(result.capabilities);
    setObjects((cur) => {
      // Only add keys that are missing
      const merged = { ...cur };
      for (const k of Object.keys(defaults)) if (!merged[k]) merged[k] = defaults[k];
      return merged;
    });
  }, [result?.capabilities]);

  const dataView = useMemo(() => {
    if (!result?.capabilities) return null;
    const roles = parseDataRoles(result.capabilities);
    return buildDataView(dataViewConfig, objects, roles);
  }, [result?.capabilities, dataViewConfig, objects]);

  const pyReady = status === "ok" || status === "idle" || status === "running";

  const onSaveSnippet = (name: string) => {
    const now = Date.now();
    const prev = snippets[name];
    setSnippets({
      ...snippets,
      [name]: { source, createdAt: prev?.createdAt ?? now, updatedAt: now },
    });
    toast.success(`Snippet "${name}" salvo`);
  };
  const onLoadSnippet = (name: string) => {
    const s = snippets[name];
    if (s) { setSource(s.source); toast.success(`Snippet "${name}" carregado`); }
  };
  const onDeleteSnippet = (name: string) => {
    const { [name]: _, ...rest } = snippets;
    setSnippets(rest);
    toast(`Snippet "${name}" removido`);
  };

  const onCopy = () => {
    navigator.clipboard.writeText(source).then(
      () => toast.success("Codigo copiado"),
      () => toast.error("Falha ao copiar"),
    );
  };
  const onClear = () => {
    if (confirm("Limpar o editor?")) setSource("");
  };
  const onToggleTheme = () =>
    setSettings({ ...settings, theme: settings.theme === "dark" ? "light" : "dark" });
  const onFontInc = () => setSettings({ ...settings, fontSize: Math.min(24, settings.fontSize + 1) });
  const onFontDec = () => setSettings({ ...settings, fontSize: Math.max(10, settings.fontSize - 1) });

  return (
    <div className="flex h-full w-full flex-col bg-bg text-fg">
      <AppHeader
        theme={settings.theme}
        onToggleTheme={onToggleTheme}
        onRun={() => { setResetKey((k) => k + 1); runNow(); }}
        onSave={() => setOpenSave(true)}
        onLoad={() => setOpenLoad(true)}
        onSettings={() => setOpenSettings(true)}
        onHelp={() => setOpenHelp(true)}
        onClear={onClear}
        onCopy={onCopy}
        onAI={() => setOpenAI(true)}
        onFontInc={onFontInc}
        onFontDec={onFontDec}
        pyReady={pyReady}
      />

      <div className="flex-1 min-h-0">
        <SplitPane
          ratio={splitRatio}
          onRatioChange={(r) => { setSplitRatio(r); setSettings({ ...settings, splitRatio: r }); }}
          left={
            <div className="h-full bg-panel">
              <PythonEditor
                value={source}
                onChange={setSource}
                theme={settings.editorTheme}
                fontSize={settings.fontSize}
                onSave={() => setOpenSave(true)}
                onRun={() => { setResetKey((k) => k + 1); runNow(); }}
                onClear={onClear}
              />
            </div>
          }
          right={
            <div className="flex h-full flex-col">
              <div className="relative flex-1 min-h-0 border-b border-border">
                {error && (
                  <div className="absolute left-0 right-0 top-0 z-10 max-h-32 overflow-auto border-b border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-[11px] font-mono text-rose-400 whitespace-pre-wrap">
                    {error}
                  </div>
                )}
                <PbivizPreview
                  css={result?.css ?? ""}
                  js={result?.js ?? ""}
                  guid={result?.guid ?? ""}
                  dataView={dataView}
                  resetKey={resetKey}
                />
              </div>
              <div className="h-[42%] min-h-[180px] overflow-hidden border-t border-border bg-bg">
                <MockHostPanel
                  capabilities={result?.capabilities}
                  dataViewConfig={dataViewConfig}
                  onDataViewConfigChange={setDataViewConfig}
                  objects={objects}
                  onObjectsChange={setObjects}
                />
              </div>
            </div>
          }
        />
      </div>

      <StatusBar
        pyStatus={status}
        buildMs={result?.durationMs}
        errorCount={error ? 1 : 0}
        guid={result?.guid}
      />

      <SettingsDialog open={openSettings} onOpenChange={setOpenSettings} settings={settings} onChange={setSettings} />
      <HelpDialog open={openHelp} onOpenChange={setOpenHelp} />
      <SaveSnippetDialog open={openSave} onOpenChange={setOpenSave} onSave={onSaveSnippet} />
      <LoadSnippetDialog
        open={openLoad}
        onOpenChange={setOpenLoad}
        snippets={snippets}
        onLoad={onLoadSnippet}
        onDelete={onDeleteSnippet}
      />
      <AIAssistantDialog
        open={openAI}
        onOpenChange={setOpenAI}
        code={source}
        apiKey={settings.geminiKey}
        onApply={(s) => setSource(s)}
      />
    </div>
  );
}
