# Python HTML Render

Editor web split-screen: escreva Python pragmático (atribuição, concatenação e `return`) e visualize o HTML gerado em tempo real, com persistência em `localStorage`.

Clone funcional do [DAX-HTML-Render](https://github.com/vilpessoa/DAX-HTML-Render), trocando o parser DAX (Power BI) por um avaliador Python pragmático.

## Stack

React 19, TypeScript, Vite, TailwindCSS, Lucide Icons.

## Dev

```bash
npm install
npm run dev
```

## Features

- Editor de código (textarea) com fonte monoespaçada
- Preview HTML em `iframe` sandbox
- Toolbar: Renderizar, Salvar, Limpar, Copiar HTML (com feedback)
- Atalhos: `Ctrl+Enter` renderiza, `Ctrl+S` salva, `Ctrl+L` limpa
- Persistência em `localStorage` (chave `pythonHtmlRenderDraft`)
- Painel de erro acima do grid quando o parser falha
- Dark mode (slate/navy)
- Footer com atalhos, exemplo e info de armazenamento

## Parser Python suportado

- Atribuição: `html = "..."`
- Concatenação: `html += "..."`
- Soma de strings/variáveis: `html = a + b + "..."`
- Comentários `# ...`
- `return <expr>` — se ausente, concatena variáveis na ordem de atribuição
