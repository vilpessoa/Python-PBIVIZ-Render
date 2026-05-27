# Arquitetura

```
[Editor (CodeMirror Python)] --(debounce)--> [Pyodide Worker]
                                                |
                                                | toJs(CSS/JS/CAPABILITIES/GUID)
                                                v
                          [App state] -> [DataView Factory] -> [Iframe Bridge]
                                |                                      |
                                v                                      v
                       [Format Panel] --(objects)----> [Mock PowerBI Host inside iframe]
                       [Data Panel]   --(dataView)---> plugin.create + instance.update
```

## Camadas

- **src/workers/pyodide.worker.ts** — carrega Pyodide do CDN, executa o script e retorna `{css, js, capabilities, guid, stdout, stderr, durationMs}`.
- **src/lib/pyodideClient.ts** — proxy postMessage com sequencia/cancelamento.
- **src/lib/capabilitiesSchema.ts** — converte `capabilities.objects` em schema de formulario.
- **src/lib/dataViewFactory.ts** — constroi um DataView categorical PBI-compativel.
- **src/lib/mockHost.ts** — script injetado no iframe que cria `window.powerbi.visuals.plugins` e `__buildMockHost()`.
- **src/lib/iframeBridge.ts** — gera o HTML shell do iframe e implementa o protocolo `RENDER`.
- **src/components/PbivizPreview.tsx** — host do iframe + ResizeObserver para viewport dinamico.
- **src/components/ObjectsSettingsPanel.tsx** — Format pane auto-gerado.
- **src/components/DataViewBuilder.tsx** — editor de campos do DataView.
