---
name: run-python-pbiviz-render
description: Build, run, and drive python-pbiviz-render. Use when asked to start the app, run it, take a screenshot of its UI, interact with the running editor, test a code change visually, or verify a feature works in the browser.
---

App web React + Vite (Python HTML Render) — editor de código Python com preview HTML em tempo real. Drive via dev server + Playwright com Chromium pré-instalado em `/opt/pw-browsers`. Não há `chromium-cli` neste container; usa-se o módulo Playwright diretamente via Node.

## Pré-requisitos

Playwright e Chromium já estão disponíveis no container:

```bash
node -e "require('/opt/node22/lib/node_modules/playwright')" && echo "ok"
ls /opt/pw-browsers/chromium-1194/chrome-linux/chrome
```

Nenhum `apt-get` necessário — tudo pré-instalado.

## Setup

```bash
npm install
```

## Build

```bash
npm run build   # TypeScript + Vite → dist/
```

> **Atenção:** `npm run lint` falha — o projeto não tem `eslint.config.js` (exigido pelo ESLint v10). Use `npm run build` para validar TypeScript.

## Run (caminho do agente)

### 1. Inicie o servidor de dev em background

```bash
npm run dev > /tmp/dev.log 2>&1 &
echo $! > /tmp/dev.pid
timeout 30 bash -c 'until curl -sf http://localhost:5173 >/dev/null 2>&1; do sleep 1; done' && echo "pronto"
```

Para encerrar:

```bash
kill $(cat /tmp/dev.pid) 2>/dev/null; pkill -f vite 2>/dev/null
```

### 2. Interaja via Playwright

Use o script inline abaixo. Screenshots salvam em `/tmp/shots/`.

```bash
mkdir -p /tmp/shots
PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers node --input-type=module <<'EOF'
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-gpu'] });
const page = await browser.newPage();
await page.setViewportSize({ width: 1400, height: 900 });
await page.goto('http://localhost:5173', { waitUntil: 'networkidle' });

// Screenshot do estado inicial
await page.screenshot({ path: '/tmp/shots/inicial.png' });

// Digitar código Python no editor
await page.locator('.cm-editor').click();
await page.keyboard.press('Control+a');
await page.keyboard.type('html = "<h1>Olá mundo!</h1><p>Testando render</p>"');

// Renderizar com Ctrl+Enter
await page.keyboard.press('Control+Enter');
await page.waitForTimeout(800);
await page.screenshot({ path: '/tmp/shots/apos-render.png' });

// Verificar erros de console
const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
console.log('Erros de console:', errors.length === 0 ? 'nenhum' : errors);

await browser.close();
console.log('Screenshots em /tmp/shots/');
EOF
```

### Ações comuns

| Ação | Como fazer via Playwright |
|---|---|
| Digitar código | `page.locator('.cm-editor').click()` → `keyboard.type(...)` |
| Renderizar | `keyboard.press('Control+Enter')` |
| Limpar editor | `keyboard.press('Control+l')` |
| Salvar snippet | `keyboard.press('Control+s')` |
| Toggle dark mode | `page.locator('button').nth(2).click()` (3º botão no header) |
| Ler conteúdo do iframe | `page.frameLocator('iframe').locator('body').innerHTML()` |
| Screenshot de elemento | `page.locator('.cm-editor').screenshot({ path: '...' })` |

Screenshots → `/tmp/shots/`.

## Run (caminho humano)

```bash
npm run dev   # → http://localhost:5173 no browser. Ctrl+C para parar.
```

## Gotchas

- **`chromium-cli` não existe neste container** — use Playwright diretamente com `PLAYWRIGHT_BROWSERS_PATH=/opt/pw-browsers` e o módulo em `/opt/node22/lib/node_modules/playwright`.
- **`npm run lint` falha** — o projeto não tem `eslint.config.js`. Use `npm run build` para checar TypeScript. Erro esperado: `ESLint couldn't find an eslint.config.(js|mjs|cjs) file.`
- **Módulo Playwright via ESM** — o import path precisa usar `.mjs`: `'/opt/node22/lib/node_modules/playwright/index.mjs'`. Alternativa CJS: `require('/opt/node22/lib/node_modules/playwright')` no script com `--input-type=commonjs`.
- **Vite porta 5173** — se outra instância estiver rodando, mata com `pkill -f vite` antes de reiniciar, senão ocorre `EADDRINUSE`.
- **`waitUntil: 'networkidle'`** funciona bem para este app — o CodeMirror e os componentes carregam síncronamente sem long-polls.
- **Leitura do iframe** — o conteúdo do iframe (preview HTML) é acessível via `page.frameLocator('iframe').locator('body')` sem restrição de CORS porque é `srcdoc` ou `blob:`.

## Troubleshooting

- **`timeout 30` retorna erro antes do servidor subir**: O Vite sobe em ~300ms neste container. Se falhar, verifique `/tmp/dev.log` com `cat /tmp/dev.log`.
- **Screenshot em branco / tela de loading**: Use `waitUntil: 'networkidle'` + `waitForTimeout(500)` após interações que disparam re-render.
- **`Cannot find module '/opt/node22/lib/node_modules/playwright'`**: Confira com `ls /opt/node22/lib/node_modules/playwright/` — o módulo está em `/opt/node22/`.
