# CLAUDE.md

Este arquivo orienta o Claude Code (claude.ai/code) ao trabalhar com código neste repositório.

## ⚡ Início Rápido (Fluxo Solo — GitHub + Vercel Auto-Deploy)

**Setup:** Claude Code Web → Repositório GitHub → Vercel (SEM PRs, commits diretos na main)

### ⚠️ REGRA IMPORTANTE
**NÃO criar Pull Requests. NÃO fazer merge. Commits diretos na branch `main`.**
Vercel detecta automaticamente e faz deploy. Simples assim.

### Fluxo de Sessão
```bash
# Início
cd ~/Python-PBIVIZ-Render
git pull origin main

# Editar código (usar Claude Code UI normalmente)

# Testar localmente
npm install      (se adicionou deps)
npm run dev      # http://localhost:5173
npm run lint     # verificação de sintaxe

# Commitar & Fazer Push (auto-dispara deploy da Vercel)
git add .
git commit -m "tipo: descrição (feat/fix/refactor/docs/style)"
git push origin main

# Deploy (2-5 min) — acompanhe em https://vercel.com/vilpessoa/python-pbiviz-render
```

### Exemplos de Commit Message
- `feat: adicionar context menu de Visual Edits debugging`
- `fix: tratamento do parser Python para augmented assignment (+=)`
- `refactor: separar pythonParser em evaluator + htmlProcessor`
- `docs: atualizar CLAUDE.md com workflow`
- `style: melhorar contraste do painel de erro em dark mode`

### Checklist Pré-Push
- ✓ `npm run lint` passou sem erros?
- ✓ `npm run build` compila OK?
- ✓ Testou no navegador (localhost:5173) — funciona?
- ✓ Commit message está clara?
- ✓ Pronto pra ir ao vivo? (sem volta — use git revert se errou)

### Reverter Rápido (se cometeu erro)
```bash
git revert HEAD          # Cria commit de desfazimento
git push origin main     # Deploya versão anterior
```

### Comandos Git Úteis
```bash
git log --oneline -5           # Últimos 5 commits
git diff HEAD                  # Mudanças não commitadas
git status                     # Estado atual
git stash / git stash pop      # Guardar/recuperar temporariamente
```

### URL de Deploy
**Live:** https://python-pbiviz-render.vercel.app

---

## Visão Geral do Projeto

**Python HTML Render** é um editor web de código Python pragmático que gera HTML em tempo real. É um clone funcional do DAX-HTML-Render, mas substitui o parser DAX por um avaliador Python customizado. A UI é um editor de painel dividido (esquerda) com preview HTML (direita).

**Funcionalidades Principais:**
- Preview HTML ao vivo com iframe sandbox
- Avaliador Python pragmático (apenas atribuição, concatenação, return)
- Persistência em localStorage
- Atalhos: `Ctrl+Enter` render, `Ctrl+S` salvar snippet, `Ctrl+L` limpar, `Ctrl+F` buscar, `Ctrl+±` zoom
- Gerenciamento de snippets de código
- Dark mode & 5 temas de editor de código
- Suporte a visualização de Power BI (pbiviz)
- Debug de Visual Edits (destaque de localização na fonte)

**Stack:** React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, CodeMirror 6

## Arquitetura

### Layout de Painel Dividido (App.tsx)
O componente principal `App` orquestra:
- **Painel esquerdo:** `PythonEditor` (baseado em CodeMirror) com `PythonEditorToolbar`
- **Painel direito:** `HtmlPreview` (sandbox iframe) com painéis de configuração
- **Cabeçalho:** Toggle de tema, switch de render ao vivo, dropdown de snippets, ajuda
- **Barra de Status:** Linha/coluna, tempo de render, contagem de erros/warnings

O estado flui para baixo; callbacks sobem. Configurações persistem em localStorage via `useDebounce()` (código salva em 1000ms, configurações imediatamente).

### Parser Python (src/lib/pythonParser/)
Ponto de entrada: `parsePython(src, pbivizSettings?)` retorna `ParseResult`:
- **evaluator.ts:** Analisa e avalia Python pragmático (sem f-strings, sem imports). Rastreia atribuições de variáveis em ordem, trata `return` e atribuição aumentada `+=`. Saída: `{ html, rawValue, warnings, error, errorLine, errorPos }`.
- **pbivizExtractor.ts:** Detecta scripts visuais Power BI (CSS/JS entre aspas triplas) e extrai preview HTML.
- **htmlProcessor.ts:** Encapsula texto simples em `<pre>` se necessário.
- **errorEnhancer.ts:** Melhora mensagens de erro.
- **types.ts:** Interface `ParseResult`.

### Storage (src/lib/storage.ts)
Persiste em localStorage sob a chave `pythonHtmlRenderDraft`:
- Código atual
- Snippets salvos (templates criados pelo usuário)
- Tema (light/dark), viewport preset, tamanho da fonte do editor, zoom, proporção de painel dividido
- Tema do editor Python (Dracula, Nord, Tokyo Night, etc.)
- Configurações PBI (conexão, layout, cores)

### Componentes UI
- **PythonEditor:** Wrapper CodeMirror com syntax highlighting Python, marcadores de erro, rastreamento de cursor
- **HtmlPreview:** Sandbox iframe, renderiza HTML do resultado, painel de erro, lista de warnings
- **VisualEditsMenu:** Menu de contexto para localizar atribuições de variáveis na fonte
- **PBISettingsPanel:** Configura visual de chat Power BI (cores, prompts, etc.)
- **SearchBar:** Extensão find do CodeMirror
- **Dialogs:** SaveSnippetDialog, HelpDialog

### Hotkeys (hook useHotkeys)
Mapa com estado em `App.tsx` via `useMemo`. Usa ref para capturar últimos handlers, evitando closures obsoletos de dependência.

## Desenvolvimento

### Setup & Execução
```bash
npm install
npm run dev        # Servidor Vite em http://localhost:5173
npm run build      # Build TypeScript + Vite para produção
npm run lint       # ESLint
```

### Padrões-Chave

**Fluxo de Avaliação Python:**
1. Texto do editor → callback `renderCode()` (manual ou auto-render)
2. `parsePython(src, pbivizSettings)` → avalia + encapsula HTML
3. Resultado (`html`, `error`, `warnings`) → componente `HtmlPreview`
4. Erros: posição (`errorPos`, `errorLine`, `errorCol`) usada para destaque no editor

**Persistência de Estado:**
- Código: debounce 1000ms (salva apenas quando usuário pausa)
- Configurações: imediato (tema, zoom, painel dividido, etc.)
- Snippet CRUD: imediato

**Gatilhos de Re-render:**
- Manual: `Ctrl+Enter` ou botão "Render"
- Auto (se `liveRender` habilitado): mudanças de código (debounce 400ms)
- Mudança de configuração: configurações PBI (debounce 300ms)

**Tratamento de Erros:**
- Erros de parse: exceção `ParseError` com `.pos` e `.endPos` para destaque de intervalo
- Erros de avaliação: capturados, linha/coluna computadas via `posToLineCol(src, pos)`
- Feedback ao usuário: notificações toast via Sonner

### Organização de Arquivos
```
src/
  App.tsx                      # Orquestrador principal, árvore de estado
  components/
    PythonEditor.tsx           # Editor CodeMirror
    HtmlPreview.tsx            # Sandbox iframe, configurações
    PythonEditorToolbar.tsx    # Botões render/save/clear
    AppHeader.tsx              # tema, snippets, ajuda
    [componentes ui...]
  lib/
    pythonParser/              # Pipeline de avaliação Python
    storage.ts                 # localStorage + tipos
    useDebounce, useHotkeys    # hooks customizados
  hooks/
  data/                        # sampleDefault
```

### Notas Importantes
- **Sem async:** Avaliador Python é totalmente síncrono (sem await, sem API calls além de Gemini AI na toolbar).
- **Sandbox:** HtmlPreview usa iframe + Content-Security-Policy para renderizar HTML do usuário com segurança.
- **Power BI:** Detecção pbiviz é heurística (procura por padrões CSS/JS entre aspas triplas). Preview usa dados mock.
- **Python Pragmático:** Suporta apenas `var = expr`, `var += expr` e `return expr`. Sem imports, loops, funções ou f-strings. Usa parser simples escrito à mão (não AST Python completo).
- **Copy to clipboard:** Usa `navigator.clipboard` (falha graciosamente com toast).
- **Timezone:** Sem tratamento de timezone; todos os timestamps são locais.

---

## Deploy

**Plataforma:** Vercel (auto-deploy ao fazer push na main)  
**Gatilho:** Webhook GitHub (push para `main` → build Vercel → ao vivo)  
**Comando de build:** `npm run build`  
**Diretório de output:** `dist/`

Dashboard Vercel: https://vercel.com/vilpessoa/python-pbiviz-render

Nenhuma configuração CI/CD necessária — Vercel auto-detecta projeto Vite + Node.js.

---

## Linguagem de Comunicação

**Comunique com o Claude sempre em PT-BR.**  
**Qualer descrição de PR e .MD devem ser em PT-BR**
Responda em português brasileiro. Este repositório segue padrão PT-BR em mensagens e documentação.