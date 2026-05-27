# Python-PBIVIZ-Render

IDE web para visualizar **ao vivo** o layout de um Power BI custom visual (PBIVIZ) gerado por um build script Python — sem rodar o `pbiviz` CLI nem abrir o Power BI Desktop.

Inspirado no [DAX-HTML-Render](https://github.com/vilpessoa/DAX-HTML-Render), adaptado para o fluxo do projeto [chatAI-powerbi-tess](https://github.com/vilpessoa/chatAI-powerbi-tess).

## Como funciona

1. Voce edita o build script Python (que define `CSS`, `JS`, `CAPABILITIES`, `GUID`).
2. O codigo eh executado **no proprio browser** via Pyodide (WebAssembly).
3. As variaveis sao extraidas e montadas em um iframe sandbox com:
   - `window.powerbi.visuals.plugins` simulado
   - `IVisualHost` mock (selectionManager, colorPalette, tooltipService...)
   - `DataView` construido a partir do painel **Data**
   - `metadata.objects` controlado pelo painel **Format** (gerado automaticamente do `capabilities.objects`)
4. Mudancas no Python re-rodam o build (debounce); mudancas no Format/Data so disparam `update()` no visual.

## Stack

React 19, TypeScript, Vite, TailwindCSS, Radix UI, CodeMirror 6, Framer Motion, Sonner, Pyodide.

## Dev

```bash
npm install
npm run dev
```

## Features

- Editor CodeMirror com syntax Python (Dracula/Light)
- Preview ao vivo em iframe sandbox
- Painel Format auto-gerado do `capabilities.objects` (text, bool, numeric, fill, enum)
- Painel Data para simular measures/categories/dates conectadas ao visual
- Snippets salvos em localStorage
- Tema claro/escuro
- Atalhos: `Ctrl+Enter` render, `Ctrl+S` snippet, `Ctrl+L` limpar, `Ctrl+F` buscar
- Assistente IA via Gemini (refatorar/formatar/comentar/debugar) — exige `GEMINI_API_KEY` no Vercel ou chave salva nas configuracoes
- Status bar com tempo de build, GUID detectado, erros
