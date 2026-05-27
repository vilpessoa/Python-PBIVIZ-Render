import { Dialog, DialogContent } from "./ui/Dialog";

export function HelpDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent title="Como usar" description="Edite o build script Python e veja o visual ao vivo">
        <div className="space-y-2 text-sm">
          <p>
            O editor a esquerda recebe um build script PBIVIZ (puro Python) que define as variaveis
            globais <code className="font-mono">CSS</code>, <code className="font-mono">JS</code> e{" "}
            <code className="font-mono">CAPABILITIES</code>.
          </p>
          <p>
            Quando o codigo eh executado pelo Pyodide, esses artefatos sao extraidos e montados
            num iframe sandbox com um host Power BI simulado.
          </p>
          <p>O painel <strong>Format</strong> reflete o capabilities.objects; <strong>Data</strong> permite simular um DataView.</p>
          <ul className="list-disc pl-5 text-xs text-muted">
            <li><kbd>Ctrl+Enter</kbd> — forcar render</li>
            <li><kbd>Ctrl+S</kbd> — salvar snippet</li>
            <li><kbd>Ctrl+L</kbd> — limpar editor</li>
            <li><kbd>Ctrl+F</kbd> — buscar no codigo</li>
          </ul>
        </div>
      </DialogContent>
    </Dialog>
  );
}
