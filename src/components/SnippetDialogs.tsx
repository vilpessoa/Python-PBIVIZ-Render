import { useState } from "react";
import { Dialog, DialogContent } from "./ui/Dialog";
import { Input } from "./ui/Input";
import { Button } from "./ui/Button";
import { Trash2 } from "lucide-react";
import type { SnippetEntry } from "@/lib/storage";

export function SaveSnippetDialog({
  open,
  onOpenChange,
  onSave,
  defaultName,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSave: (name: string) => void;
  defaultName?: string;
}) {
  const [name, setName] = useState(defaultName ?? "");
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Salvar Snippet" description="Salva o codigo atual no localStorage">
        <div className="space-y-3">
          <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do snippet" autoFocus />
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button
              variant="accent"
              disabled={!name.trim()}
              onClick={() => { onSave(name.trim()); onOpenChange(false); }}
            >
              Salvar
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function LoadSnippetDialog({
  open,
  onOpenChange,
  snippets,
  onLoad,
  onDelete,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  snippets: Record<string, SnippetEntry>;
  onLoad: (name: string) => void;
  onDelete: (name: string) => void;
}) {
  const names = Object.keys(snippets).sort();
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Snippets salvos">
        {names.length === 0 ? (
          <div className="text-xs text-muted">Nenhum snippet salvo.</div>
        ) : (
          <ul className="max-h-80 space-y-1 overflow-y-auto">
            {names.map((n) => (
              <li
                key={n}
                className="flex items-center justify-between rounded border border-border bg-panel px-2 py-1.5"
              >
                <button
                  className="flex-1 text-left text-sm"
                  onClick={() => { onLoad(n); onOpenChange(false); }}
                >
                  <div className="font-medium">{n}</div>
                  <div className="text-[10px] text-muted">
                    {new Date(snippets[n].updatedAt).toLocaleString()}
                  </div>
                </button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(n)}>
                  <Trash2 className="h-3 w-3" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
