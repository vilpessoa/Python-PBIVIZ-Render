import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, Check, Copy, Play, Save, Trash2 } from "lucide-react";
import { evaluatePython } from "@/lib/PythonEvaluator";

const STORAGE_KEY = "pythonHtmlRenderDraft";

const DEFAULT_CODE = `# Exemplo: Construir HTML com Python
html = "<h1>Hello, Python!</h1>"
html += "<p>Renderize HTML construído em Python</p>"
return html
`;

const PREVIEW_TEMPLATE = (body: string) => `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<style>
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; padding: 16px; background: #f8fafc; color: #1e293b; line-height: 1.6; }
h1, h2, h3, h4, h5, h6 { margin: 16px 0 8px 0; }
p { margin: 8px 0; }
a { color: #0ea5e9; text-decoration: none; }
a:hover { text-decoration: underline; }
code { background: #e2e8f0; padding: 2px 6px; border-radius: 3px; font-family: monospace; }
pre { background: #1e293b; color: #e2e8f0; padding: 12px; border-radius: 6px; overflow-x: auto; margin: 12px 0; }
button { padding: 8px 16px; border: 1px solid #cbd5e1; border-radius: 6px; background: #f1f5f9; cursor: pointer; }
button:hover { background: #e2e8f0; }
</style>
</head>
<body>
${body}
</body>
</html>`;

const PLACEHOLDER_DOC = `<!DOCTYPE html><html><body style="font-family:system-ui;background:#0f172a;color:#94a3b8;display:flex;align-items:center;justify-content:center;height:100vh;margin:0;flex-direction:column;gap:8px;">
<div style="font-size:32px;">⚡</div>
<div style="font-size:14px;">Clique em Renderizar (ou pressione Ctrl+Enter)</div>
</body></html>`;

export default function PythonHtmlRender() {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [html, setHtml] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [copied, setCopied] = useState(false);
  const editorRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved !== null) setCode(saved);
  }, []);

  const render = useCallback(() => {
    try {
      const result = evaluatePython(code);
      setHtml(result);
      setError("");
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      setError(`❌ Erro: ${msg}`);
      setHtml("");
    }
  }, [code]);

  const save = useCallback(() => {
    localStorage.setItem(STORAGE_KEY, code);
    alert("✅ Rascunho salvo!");
  }, [code]);

  const clear = useCallback(() => {
    if (window.confirm("Tem certeza? Vai limpar o editor.")) {
      setCode("");
      setHtml("");
      setError("");
    }
  }, []);

  const copy = useCallback(async () => {
    if (!html) return;
    await navigator.clipboard.writeText(html);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [html]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      const key = e.key.toLowerCase();
      if (key === "enter") { e.preventDefault(); render(); }
      else if (key === "s") { e.preventDefault(); save(); }
      else if (key === "l") { e.preventDefault(); clear(); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [render, save, clear]);

  const srcDoc = useMemo(() => (html ? PREVIEW_TEMPLATE(html) : PLACEHOLDER_DOC), [html]);

  return (
    <div className="min-h-screen flex flex-col" style={{ background: "linear-gradient(to bottom right, #0f172a, #1e293b, #0f172a)" }}>
      <header className="sticky top-0 z-50 backdrop-blur-md border-b border-slate-700" style={{ background: "rgba(15,23,42,0.95)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }}>
              🐍
            </div>
            <div>
              <h1 className="text-[18px] font-bold text-white leading-tight">Python HTML Render</h1>
              <p className="text-[12px] text-slate-400 leading-tight">Editor pragmático: Python → HTML</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <ToolbarButton onClick={render} variant="primary" title="Renderizar (Ctrl+Enter)">
              <Play size={14} /> Renderizar
            </ToolbarButton>
            <ToolbarButton onClick={save} title="Salvar (Ctrl+S)">
              <Save size={14} /> Salvar
            </ToolbarButton>
            <ToolbarButton onClick={clear} title="Limpar (Ctrl+L)">
              <Trash2 size={14} /> Limpar
            </ToolbarButton>
            {html && (
              <ToolbarButton onClick={copy} title="Copiar HTML">
                {copied ? <><Check size={14} /> Copiado!</> : <><Copy size={14} /> Copiar</>}
              </ToolbarButton>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-6 flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-3 px-4 py-3 rounded-lg" style={{ background: "rgba(127,29,29,0.2)", border: "1px solid rgba(185,28,28,0.5)", color: "#fca5a5" }}>
            <AlertCircle size={18} className="mt-0.5 shrink-0" />
            <span className="text-[13px] font-mono">{error}</span>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 flex-1" style={{ minHeight: "calc(100vh - 220px)" }}>
          <section className="flex flex-col rounded-xl overflow-hidden border border-slate-700" style={{ background: "#1e293b" }}>
            <div className="px-4 py-2 border-b border-slate-700 text-[12px] uppercase tracking-wider text-slate-400">Editor Python</div>
            <textarea
              ref={editorRef}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              spellCheck={false}
              className="flex-1 w-full p-4 bg-transparent text-slate-100 outline-none resize-none"
              style={{ fontFamily: "Fira Code, JetBrains Mono, Courier New, monospace", fontSize: 13, tabSize: 2, lineHeight: 1.6 }}
              placeholder='html = "<h1>Hello</h1>"&#10;return html'
            />
          </section>
          <section className="flex flex-col rounded-xl overflow-hidden border border-slate-700" style={{ background: "#1e293b" }}>
            <div className="px-4 py-2 border-b border-slate-700 text-[12px] uppercase tracking-wider text-slate-400">Preview HTML</div>
            <iframe
              title="preview"
              srcDoc={srcDoc}
              sandbox="allow-scripts"
              className="flex-1 w-full bg-white"
            />
          </section>
        </div>
      </main>

      <footer className="border-t border-slate-700" style={{ background: "rgba(15,23,42,0.5)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 grid grid-cols-1 md:grid-cols-3 gap-6 text-[12px] text-slate-400">
          <div>
            <div className="text-slate-300 font-semibold mb-2">⌨️ Atalhos</div>
            <div className="font-mono space-y-0.5">
              <div><span className="text-slate-200">Ctrl+Enter</span> &nbsp;Renderizar</div>
              <div><span className="text-slate-200">Ctrl+S</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Salvar</div>
              <div><span className="text-slate-200">Ctrl+L</span> &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Limpar</div>
            </div>
          </div>
          <div>
            <div className="text-slate-300 font-semibold mb-2">📚 Exemplo</div>
            <div>Construa HTML com Python, use <code className="text-slate-200">return html</code> para retornar.</div>
          </div>
          <div>
            <div className="text-slate-300 font-semibold mb-2">💾 Armazenamento</div>
            <div>Seus rascunhos são salvos em localStorage do navegador.</div>
          </div>
        </div>
      </footer>
    </div>
  );
}

function ToolbarButton({
  children,
  onClick,
  variant,
  title,
}: {
  children: React.ReactNode;
  onClick: () => void;
  variant?: "primary";
  title?: string;
}) {
  const base = "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[13px] font-medium transition-colors";
  const styles =
    variant === "primary"
      ? "text-white"
      : "text-slate-200 hover:bg-slate-700/60 border border-slate-700";
  const inline =
    variant === "primary"
      ? { background: "linear-gradient(135deg, #06b6d4, #3b82f6)" }
      : undefined;
  return (
    <button type="button" onClick={onClick} title={title} className={`${base} ${styles}`} style={inline}>
      {children}
    </button>
  );
}
