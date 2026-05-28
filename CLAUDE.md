# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## ⚡ Quick Start (Solo Workflow — GitHub + Vercel Auto-Deploy)

**Setup:** Claude Code Web → GitHub repo → Vercel (no PRs, direct commits to main)

### Session Flow
```bash
# Start
cd ~/Python-PBIVIZ-Render
git pull origin main

# Edit code (use Claude Code UI normally)

# Test locally
npm install      (if added deps)
npm run dev      # http://localhost:5173
npm run lint     # syntax check

# Commit & Push (auto-triggers Vercel deploy)
git add .
git commit -m "type: description (feat/fix/refactor/docs/style)"
git push origin main

# Deploy (2-5 min) — check https://vercel.com/vilpessoa/python-pbiviz-render
```

### Commit Message Examples
- `feat: add Visual Edits debugging context menu`
- `fix: Python parser handling for augmented assignment (+=)`
- `refactor: split pythonParser into evaluator + htmlProcessor`
- `docs: update CLAUDE.md with workflow`
- `style: improve dark mode color contrast on error panel`

### Pre-Push Checklist
- ✓ `npm run lint` passes
- ✓ `npm run build` succeeds
- ✓ Tested in browser (localhost:5173) — works?
- ✓ Commit message is clear
- ✓ Ready to go live? (no revert without git revert + new commit)

### Quick Revert (if mistake)
```bash
git revert HEAD          # Creates undo commit
git push origin main     # Deploys previous version
```

### Useful Git Commands
```bash
git log --oneline -5           # Last 5 commits
git diff HEAD                  # Unstaged changes
git status                     # Current state
git stash / git stash pop      # Temp save/restore
```

### Deploy URL
**Live:** https://python-pbiviz-render.vercel.app

---

## Project Overview

**Python HTML Render** is a web editor for pragmatic Python code that generates HTML in real-time. It's a functional clone of DAX-HTML-Render but replaces the DAX parser with a custom Python evaluator. The UI is a split-pane editor (left) with HTML preview (right).

**Key Features:**
- Live HTML preview with iframe sandbox
- Pragmatic Python evaluator (assignment, concatenation, return statements only)
- localStorage persistence
- Hotkeys: `Ctrl+Enter` render, `Ctrl+S` save snippet, `Ctrl+L` clear, `Ctrl+F` search, `Ctrl+±` zoom
- Code snippets management
- Dark mode & 5 code editor themes
- Power BI visualization preview support (pbiviz)
- Visual edits debugging (source location highlighting)

**Stack:** React 19, TypeScript, Vite, TailwindCSS, Lucide Icons, CodeMirror 6

## Architecture

### Split-Pane Layout (App.tsx)
The main `App` component orchestrates:
- **Left pane:** `PythonEditor` (CodeMirror-based) with `PythonEditorToolbar`
- **Right pane:** `HtmlPreview` (iframe sandbox) with settings panels
- **Header:** Theme toggle, live render switch, snippets dropdown, help
- **StatusBar:** Line/col, render time, error/warning counts

State flows downward; callbacks bubble up. Settings persist to localStorage via `useDebounce()` (code saves at 1000ms, settings immediately).

### Python Parser (src/lib/pythonParser/)
Entry point: `parsePython(src, pbivizSettings?)` returns `ParseResult`:
- **evaluator.ts:** Parses and evaluates pragmatic Python (no f-strings, no imports). Tracks variable assignments in order, handles `return` and `+=` augmented assignment. Outputs `{ html, rawValue, warnings, error, errorLine, errorPos }`.
- **pbivizExtractor.ts:** Detects Power BI visual scripts (triple-quoted CSS/JS) and extracts preview HTML.
- **htmlProcessor.ts:** Wraps plain text in `<pre>` if needed.
- **errorEnhancer.ts:** Improves error messages.
- **types.ts:** `ParseResult` interface.

### Storage (src/lib/storage.ts)
Persists to localStorage under key `pythonHtmlRenderDraft`:
- Current code
- Saved snippets (user-created templates)
- Theme (light/dark), viewport preset, editor font size, zoom, split pane ratio
- Python editor theme (Dracula, Nord, Tokyo Night, etc.)
- PBI settings (connection, layout, colors)

### UI Components
- **PythonEditor:** CodeMirror wrapper with Python syntax highlighting, error markers, cursor tracking
- **HtmlPreview:** iframe sandbox, renders parse result HTML, error panel, warnings list
- **VisualEditsMenu:** Context menu for locating variable assignments in source
- **PBISettingsPanel:** Configure Power BI chat visual (colors, prompts, etc.)
- **SearchBar:** CodeMirror find extension
- **Dialogs:** SaveSnippetDialog, HelpDialog

### Hotkeys (useHotkeys hook)
Stateful map in `App.tsx` via `useMemo`. Use ref to capture latest handlers avoiding dependency stale closures.

## Development

### Setup & Run
```bash
npm install
npm run dev        # Vite dev server on http://localhost:5173
npm run build      # TypeScript + Vite production build
npm run lint       # ESLint
```

### Key Patterns

**Python Evaluation Flow:**
1. Editor text → `renderCode()` callback (manual or auto-render)
2. `parsePython(src, pbivizSettings)` → evaluates + wraps HTML
3. Result (`html`, `error`, `warnings`) → `HtmlPreview` component
4. Errors: position (`errorPos`, `errorLine`, `errorCol`) used for highlighting in editor

**State Persistence:**
- Code: debounced 1000ms (only save when user pauses)
- Settings: immediate (theme, zoom, split, etc.)
- Snippet CRUD: immediate

**Re-render Triggers:**
- Manual: `Ctrl+Enter` or "Render" button
- Auto (if `liveRender` enabled): code changes (400ms debounce)
- Settings change: PBI settings (300ms debounce)

**Error Handling:**
- Parse errors: `ParseError` exception with `.pos` and `.endPos` for range highlighting
- Evaluation errors: caught, line/col computed via `posToLineCol(src, pos)`
- User feedback: toast notifications via Sonner

### File Organization
```
src/
  App.tsx                      # Main orchestrator, state tree
  components/
    PythonEditor.tsx           # CodeMirror editor
    HtmlPreview.tsx            # iframe sandbox, settings
    PythonEditorToolbar.tsx    # render/save/clear buttons
    AppHeader.tsx              # theme, snippets, help
    [ui components...]
  lib/
    pythonParser/              # Python evaluation pipeline
    storage.ts                 # localStorage + types
    useDebounce, useHotkeys    # custom hooks
  hooks/
  data/                        # sampleDefault
```

### Important Notes
- **No async:** Python evaluator is fully synchronous (no await, no API calls beyond Gemini AI in toolbar).
- **Sandbox:** HtmlPreview uses iframe + Content-Security-Policy to safely render user HTML.
- **Power BI:** pbiviz detection is heuristic-based (looks for triple-quoted CSS/JS patterns). Preview uses mock data.
- **Pragmatic Python:** Only supports `var = expr`, `var += expr`, and `return expr`. No imports, loops, functions, or f-strings. Uses simple hand-written parser (not full Python AST).
- **Copy to clipboard:** Use `navigator.clipboard` (fails gracefully with toast).
- **Timezone:** No timezone handling; all timestamps are local.

---

## Deployment

**Platform:** Vercel (auto-deploy on push to main)  
**Trigger:** GitHub webhook (push to `main` → Vercel build → live)  
**Build command:** `npm run build`  
**Output dir:** `dist/`

Vercel dashboard: https://vercel.com/vilpessoa/python-pbiviz-render

No CI/CD configuration needed — Vercel auto-detects Vite + Node.js project.