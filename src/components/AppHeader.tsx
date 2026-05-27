import {
  Play, Save, FolderOpen, Settings, HelpCircle, Sun, Moon, Sparkles, Trash2, Copy, ZoomIn, ZoomOut,
} from "lucide-react";
import { Button } from "./ui/Button";

export function AppHeader({
  theme,
  onToggleTheme,
  onRun,
  onSave,
  onLoad,
  onSettings,
  onHelp,
  onClear,
  onCopy,
  onAI,
  onFontInc,
  onFontDec,
  pyReady,
}: {
  theme: "light" | "dark";
  onToggleTheme: () => void;
  onRun: () => void;
  onSave: () => void;
  onLoad: () => void;
  onSettings: () => void;
  onHelp: () => void;
  onClear: () => void;
  onCopy: () => void;
  onAI: () => void;
  onFontInc: () => void;
  onFontDec: () => void;
  pyReady: boolean;
}) {
  return (
    <header className="flex h-12 items-center gap-2 border-b border-border bg-panel px-3">
      <div className="flex items-center gap-2">
        <div className="h-6 w-6 rounded bg-accent" />
        <div className="text-sm font-semibold">Python-PBIVIZ-Render</div>
        <div className="text-[10px] text-muted">v0.1</div>
      </div>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button size="sm" variant="accent" onClick={onRun} disabled={!pyReady}>
        <Play className="h-3 w-3" /> Render (Ctrl+Enter)
      </Button>
      <Button size="sm" variant="outline" onClick={onSave}><Save className="h-3 w-3" /> Snippet</Button>
      <Button size="sm" variant="outline" onClick={onLoad}><FolderOpen className="h-3 w-3" /> Carregar</Button>

      <div className="mx-2 h-6 w-px bg-border" />

      <Button size="icon" variant="ghost" onClick={onFontDec} title="Diminuir fonte"><ZoomOut className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onFontInc} title="Aumentar fonte"><ZoomIn className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onCopy} title="Copiar"><Copy className="h-4 w-4" /></Button>
      <Button size="icon" variant="ghost" onClick={onClear} title="Limpar editor"><Trash2 className="h-4 w-4" /></Button>

      <div className="ml-auto flex items-center gap-1">
        <Button size="sm" variant="outline" onClick={onAI}><Sparkles className="h-3 w-3" /> IA</Button>
        <Button size="icon" variant="ghost" onClick={onToggleTheme} title="Tema">
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
        <Button size="icon" variant="ghost" onClick={onHelp} title="Ajuda"><HelpCircle className="h-4 w-4" /></Button>
        <Button size="icon" variant="ghost" onClick={onSettings} title="Configuracoes"><Settings className="h-4 w-4" /></Button>
      </div>
    </header>
  );
}
