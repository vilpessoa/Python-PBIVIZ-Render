# Remoção completa do Assistente TESS (sem rastros)

> A API da TESS é **enterprise** e de uso restrito. Se você for distribuir ou
> vender esta ferramenta para terceiros, siga **todos** os passos abaixo para
> remover qualquer vestígio da integração. Ao final, o sistema continua
> funcionando normalmente — apenas sem o assistente de IA.

## 1. Apagar os arquivos exclusivos da TESS

```bash
rm -rf api/tess.ts api/_tess
rm -rf src/components/ai/tess
rm -f  src/services/tessService.ts
rm -f  src/lib/tessConfig.ts
rm -f  src/dev/tessDevMiddleware.ts
```

## 2. Reverter `vite.config.ts`

Remova os três blocos marcados com `// === TESS (remover ao desativar) ===`:
- o `import { tessDevPlugin } ...` no topo;
- o `Object.assign(process.env, loadEnv(...))`;
- o `tessDevPlugin()` dentro de `plugins`.

(Se o `loadEnv` não for usado em mais nada, volte o import para apenas
`import { defineConfig } from 'vite'`.)

## 3. Remover a UI do editor

- **`src/components/PythonEditorToolbar.tsx`**: apague o `import { TessChatButton }`,
  o `import { TESS_ENABLED }`, as props `tessChatOpen`/`onToggleTessChat` da
  interface e da assinatura, e o bloco `{TESS_ENABLED && ( ... TessChatButton ... )}`.
- **`src/App.tsx`**: apague os imports `TessChat`/`TESS_ENABLED`, o estado
  `tessChatOpen`, as props `tessChatOpen`/`onToggleTessChat` passadas à toolbar e
  o bloco `{TESS_ENABLED && (<TessChat ... />)}`.

## 4. Limpar configuração e segredos

- Remova `TESS_API_KEY`, `TESS_AGENT_ID` e `VITE_TESS_ENABLED` do `.env.example`,
  do seu `.env.local` e do painel **Vercel → Settings → Environment Variables**.
- (Opcional) Remova `@vercel/node` de `devDependencies` no `package.json` se não
  houver outras funções em `api/`.

## 5. Verificar

```bash
grep -ri "tess" src api .env.example   # não deve retornar nada
npm run lint && npm run build          # deve compilar sem erros
```

Pronto — zero rastros da TESS.
