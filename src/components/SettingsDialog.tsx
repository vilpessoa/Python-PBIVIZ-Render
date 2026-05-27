import { Dialog, DialogContent } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { Switch } from "./ui/Switch";
import { Select } from "./ui/Select";
import type { AppSettings } from "@/lib/storage";

export function SettingsDialog({
  open,
  onOpenChange,
  settings,
  onChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  settings: AppSettings;
  onChange: (s: AppSettings) => void;
}) {
  const set = <K extends keyof AppSettings>(k: K, v: AppSettings[K]) =>
    onChange({ ...settings, [k]: v });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Configuracoes" description="Personalize o IDE">
        <div className="space-y-3 text-sm">
          <Row label="Auto-render ao editar">
            <Switch checked={settings.autoRun} onCheckedChange={(b) => set("autoRun", b)} />
          </Row>
          <Row label="Debounce (ms)">
            <Input
              type="number"
              value={settings.debounceMs}
              onChange={(e) => set("debounceMs", Number(e.target.value) || 0)}
            />
          </Row>
          <Row label="Tema do editor">
            <Select
              value={settings.editorTheme}
              onValueChange={(v) => set("editorTheme", v as any)}
              options={[
                { value: "default", label: "Default (Light)" },
                { value: "dracula", label: "Dracula" },
              ]}
            />
          </Row>
          <Row label="Tamanho da fonte (editor)">
            <Input
              type="number"
              value={settings.fontSize}
              onChange={(e) => set("fontSize", Math.max(10, Number(e.target.value) || 13))}
            />
          </Row>
          <Row label="Gemini API Key (opcional)">
            <Input
              type="password"
              value={settings.geminiKey ?? ""}
              onChange={(e) => set("geminiKey", e.target.value)}
              placeholder="Para uso direto sem proxy"
            />
          </Row>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[180px_1fr] items-center gap-3">
      <label className="text-xs text-muted">{label}</label>
      <div>{children}</div>
    </div>
  );
}
