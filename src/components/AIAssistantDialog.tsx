import { useState } from "react";
import { Dialog, DialogContent } from "./ui/Dialog";
import { Button } from "./ui/Button";
import { askGemini, type AIAction } from "@/services/gemini";
import { toast } from "sonner";

const ACTIONS: { value: AIAction; label: string; desc: string }[] = [
  { value: "refactor", label: "Refatorar", desc: "Sugestoes de melhoria mantendo CSS/JS/CAPABILITIES" },
  { value: "format",   label: "Formatar",  desc: "Padroniza estilo PEP8" },
  { value: "comment",  label: "Comentar",  desc: "Gera comentarios e docstrings" },
  { value: "debug",    label: "Debugar",   desc: "Analise de erros e fixes" },
];

export function AIAssistantDialog({
  open,
  onOpenChange,
  code,
  apiKey,
  onApply,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  code: string;
  apiKey?: string;
  onApply: (next: string) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<string>("");
  const [last, setLast] = useState<AIAction | null>(null);

  const run = async (a: AIAction) => {
    setBusy(true); setLast(a); setResult("");
    try {
      const t = await askGemini(a, code, apiKey);
      setResult(t);
    } catch (e: any) {
      toast.error(e?.message ?? "Falha na IA");
    } finally {
      setBusy(false);
    }
  };

  const extractCode = (s: string): string => {
    const m = s.match(/```(?:python)?\n([\s\S]*?)```/);
    return m ? m[1] : s;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title="Assistente IA (Gemini)"
        description="Refatorar, formatar, comentar ou debugar o build script"
        className="max-w-3xl"
      >
        <div className="space-y-3">
          <div className="flex flex-wrap gap-2">
            {ACTIONS.map((a) => (
              <Button key={a.value} size="sm" variant={last === a.value ? "accent" : "outline"} onClick={() => run(a.value)} disabled={busy}>
                {a.label}
              </Button>
            ))}
          </div>
          {busy && <div className="text-xs text-muted">Consultando Gemini...</div>}
          {result && (
            <>
              <pre className="max-h-72 overflow-auto rounded border border-border bg-bg p-2 text-xs font-mono whitespace-pre-wrap">
                {result}
              </pre>
              <div className="flex justify-end gap-2">
                <Button variant="ghost" onClick={() => setResult("")}>Descartar</Button>
                <Button
                  variant="accent"
                  onClick={() => { onApply(extractCode(result)); onOpenChange(false); }}
                >
                  Aplicar ao editor
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
