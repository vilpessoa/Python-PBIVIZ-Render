# Remover um provedor de LLM (sem rastros)

O Assistente de IA é modular: o núcleo (`api/_ai/`) é agnóstico de provedor e cada
modelo é um arquivo isolado em `api/_ai/providers/`. Remover um provedor **não**
afeta o motor de edição nem os demais provedores.

> A API da **TESS** é enterprise e de uso restrito. Se você for distribuir ou
> vender esta ferramenta para terceiros, remova o provedor TESS seguindo os
> passos abaixo. Ao final, troque `AI_PROVIDER` para outro provedor registrado
> (ex.: `anthropic`) e o sistema continua funcionando normalmente.

## Remover um provedor (ex.: TESS)

1. **Apague o arquivo do provedor:**
   ```bash
   rm -f api/_ai/providers/tess.ts
   ```

2. **Remova o registro** em `api/_ai/registry.ts`:
   - apague o `import { tessProvider } ...` no topo;
   - apague a linha `registerProvider(tessProvider);`.

3. **Limpe os segredos:** remova `TESS_API_KEY` e `TESS_AGENT_ID` do `.env.example`,
   do seu `.env.local` e do painel **Vercel → Settings → Environment Variables**.

4. **Aponte para outro provedor:** defina `AI_PROVIDER=anthropic` (ou outro
   provedor registrado) nas envs.

## Remover o Assistente de IA por completo

Além dos passos acima para cada provedor:

1. Apague os arquivos do assistente:
   ```bash
   rm -rf api/ai.ts api/_ai
   rm -rf src/components/ai/tess
   rm -f  src/services/aiService.ts
   rm -f  src/lib/tessConfig.ts
   rm -f  src/dev/aiDevMiddleware.ts
   ```
2. Em `vite.config.ts`, remova os três blocos marcados com
   `// === Assistente IA (remover ao desativar) ===`.
3. Em `src/components/PythonEditorToolbar.tsx` e `src/App.tsx`, remova os imports
   `TessChat`/`TessFab`/`TESS_ENABLED`, o estado/props relacionados e os blocos
   `{TESS_ENABLED && ( ... )}`.
4. Limpe as envs (`AI_PROVIDER`, `*_API_KEY`, `VITE_TESS_ENABLED`).

## Verificar

```bash
grep -rni "tess" src api .env.example   # ao remover só a TESS, não deve sobrar nada dela
npm run lint && npm run build           # deve compilar sem erros
```

## Organização do módulo (para reaproveitar em outros projetos)

- **Portátil (transporte multi-LLM):** `api/_ai/{types,registry,index}.ts` +
  `api/_ai/providers/*`.
- **Específico deste editor (Python pragmático):** `api/_ai/editEngine.ts` e
  `api/_ai/system-prompt.ts`.
