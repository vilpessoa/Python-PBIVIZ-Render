---
name: pbiviz-reference
description: Referência técnica completa de visuais personalizados Power BI (.pbiviz): estrutura de arquivos, CLI pbiviz, capabilities.json, DataView mappings, IVisual API, serviços de interatividade, formatação e troubleshooting. Use quando precisar de informações sobre desenvolvimento de .pbiviz, capabilities, dataRoles, dataViewMappings, ISelectionManager, ITooltipService, enumerateObjectInstances, erros de certificado SSL ou empacotamento.
---

Referência técnica completa para desenvolvimento de visuais personalizados Power BI (`.pbiviz`), compilada a partir da documentação oficial Microsoft Learn, GitHub microsoft/powerbi-visuals-tools e microsoft/powerbi-visuals-api.

---

## 1. Estrutura Interna do Arquivo `.pbiviz` (ZIP)

Um `.pbiviz` é um ZIP renomeado. Renomeie para `.zip` para inspecionar.

```
package.json                    ← manifesto de recursos (não é o package.json npm)
resources/
    visual.prod.js              ← JavaScript compilado + minificado
    visual.prod.css             ← CSS compilado
    {guid}.pbiviz.json          ← capabilities + metadados serializados
```

> **Atenção:** O arquivo JS dentro do ZIP é `visual.prod.js` (não `visual.js`). O sufixo `.prod` indica build de produção. Durante `pbiviz start` (dev), pode aparecer como `visual.js`.

Para reempacotar manualmente:
```bash
unzip visual.pbiviz -d extracted/
# editar arquivos em extracted/
zip -9 -r novo-visual.pbiviz package.json resources/
```

O `package.json` interno é um manifesto gerado automaticamente:
```json
{
  "version": "1.0.0",
  "resources": [
    { "resourceId": "rId0", "sourceType": 5, "file": "resources/visual.prod.js" },
    { "resourceId": "rId1", "sourceType": 0, "file": "resources/visual.prod.css" },
    { "resourceId": "rId2", "sourceType": 1, "file": "resources/{guid}.pbiviz.json" }
  ],
  "visual": { "guid": "...", "version": "1.0.0.0" }
}
```

---

## 2. Estrutura do Projeto-Fonte

```
.vscode/
assets/
    icon.png               ← 20×20 px PNG, ícone no painel de visualizações
node_modules/
src/
    visual.ts              ← classe principal IVisual
    settings.ts            ← objetos de formatação
style/
    visual.less            ← estilos (compilados para visual.prod.css)
stringResources/
    en-US/resources.resjson
capabilities.json          ← dataRoles, dataViewMappings, objects
pbiviz.json                ← metadados e configuração do visual
package.json               ← dependências npm
tsconfig.json
```

---

## 3. `pbiviz.json` — Arquivo de Configuração do Projeto

```json
{
  "visual": {
    "name": "myVisual",
    "displayName": "My Visual",
    "guid": "myVisual1234567890",
    "visualClassName": "Visual",
    "version": "1.0.0.0",
    "description": "",
    "supportUrl": "",
    "gitHubUrl": ""
  },
  "apiVersion": "5.3.0",
  "author": { "name": "", "email": "" },
  "assets": { "icon": "assets/icon.png" },
  "style": "style/visual.less",
  "capabilities": "capabilities.json",
  "stringResources": []
}
```

| Campo | Notas |
|---|---|
| `visual.guid` | Identificador único — nunca reutilize entre visuais diferentes |
| `visual.version` | Formato obrigatório: **4 dígitos** (`1.0.0.0`, não `1.0.0`) |
| `visual.visualClassName` | Nome da classe TypeScript que implementa `IVisual` |
| `apiVersion` | Versão da API — deve coincidir com `powerbi-visuals-api` instalado |
| `externalJS` | **Obsoleto** nas tools v3+. Use imports npm + webpack |

---

## 4. CLI `pbiviz` (powerbi-visuals-tools v7.1.0)

### Instalação
```bash
npm install -g powerbi-visuals-tools
pbiviz --version
```

### Comandos

#### `pbiviz new <nome> [opções]`
Cria projeto novo com template.
```bash
pbiviz new MeuVisual -t default   # templates: default, table, slicer, rvisual, rhtml, circlecard
pbiviz new MeuVisual -f           # -f sobrescreve pasta existente
```

#### `pbiviz start [opções]`
Compila e sobe servidor HTTPS local para teste em tempo real no Power BI Service.
```bash
pbiviz start
pbiviz start -p 8080              # porta customizada
pbiviz start --no-stats           # pula geração de stats
pbiviz start --skip-api           # pula verificação de versão da API
```
> Requer certificado SSL instalado. Ver seção 9 (Troubleshooting).

#### `pbiviz package [opções]`
Gera `.pbiviz` em `dist/`. Sobrescreve builds anteriores.
```bash
pbiviz package
pbiviz package --no-minify        # JavaScript não minificado (útil para debug)
pbiviz package --resources        # gera recursos separados (js, css, json)
pbiviz package --no-pbiviz --resources  # só recursos, sem .pbiviz
pbiviz package --certification-audit    # audita problemas de certificação (v6.1.0+)
pbiviz package --certification-fix      # corrige automaticamente (v6.1.0+)
pbiviz package -c 9               # nível de compressão ZIP 0-9 (padrão: 6)
```

#### `pbiviz update [versão]`
Atualiza definições de tipo da API e schemas JSON.
```bash
pbiviz update             # atualiza para o mais recente
pbiviz update 5.3.0       # versão específica
```
> Em tools v3.4.0+, a flag `--api` foi removida. Para atualizar a API:
> ```bash
> npm install --save-dev powerbi-visuals-api@latest
> ```

#### `pbiviz install-cert`
Instala certificado localhost para `pbiviz start`.
```bash
pbiviz install-cert
```

#### `pbiviz lint [--fix]`
Executa ESLint. `--fix` aplica correções automáticas.

#### `pbiviz mcp [--init]` *(v7.1.0+)*
Inicia servidor MCP para integração com assistentes de IA.
```bash
pbiviz mcp --init    # cria .vscode/mcp.json
```

---

## 5. `capabilities.json` — Referência Completa

### Estrutura raiz

```json
{
  "privileges": [],
  "dataRoles": [],
  "dataViewMappings": [],
  "objects": {},
  "tooltips": {},
  "sorting": {},
  "drilldown": {},
  "expandCollapse": {},
  "supportsHighlight": false,
  "supportsEmptyDataView": false,
  "supportsMultiVisualSelection": false,
  "supportsLandingPage": false,
  "supportsSynchronizingFilterState": false,
  "supportsKeyboardFocus": false,
  "supportsOnObjectFormatting": false,
  "advancedEditModeSupport": 0
}
```

### `privileges` (obrigatório desde API v4.6.0)
```json
"privileges": [
  { "name": "WebAccess",       "essential": true, "parameters": ["https://*.example.com"] },
  { "name": "ExportContent",   "essential": true },
  { "name": "LocalStorage",    "essential": true },
  { "name": "AADAuthentication","essential": false, "parameters": ["COM", "GCC"] }
]
```

### `dataRoles` — Campos/Field Wells

```json
"dataRoles": [
  {
    "name": "category",
    "displayName": "Category",
    "kind": "Grouping",
    "description": "Campo de dimensão",
    "requiredTypes": [{ "text": true }, { "numeric": true }]
  },
  {
    "name": "measure",
    "displayName": "Values",
    "kind": "Measure"
  }
]
```

| `kind` | Valor Numérico | Uso |
|---|---|---|
| `"Grouping"` | 0 | Dimensões categóricas (eixo X, colunas, legenda) |
| `"Measure"` | 1 | Valores numéricos agregados |
| `"GroupingOrMeasure"` | 2 | Aceita qualquer um dos dois |

### `dataViewMappings` — Tipos de Mapeamento

#### `single` — Um valor escalar
```json
"dataViewMappings": [{ "single": { "role": "measure" } }]
```
```typescript
const value = dataView.single.value; // ex: 94163140.35
```

#### `categorical` — Categorias + Valores
```json
"dataViewMappings": [{
  "conditions": [
    { "category": { "max": 1 }, "measure": { "min": 1, "max": 5 } }
  ],
  "categorical": {
    "categories": {
      "for": { "in": "category" },
      "dataReductionAlgorithm": { "top": { "count": 1000 } }
    },
    "values": {
      "select": [{ "bind": { "to": "measure" } }]
    }
  }
}]
```
```typescript
const cats  = dataView.categorical.categories[0].values;  // rótulos
const vals  = dataView.categorical.values[0].values;       // números
const highl = dataView.categorical.values[0].highlights;   // highlights (nullable)
```

Com agrupamento em série (small multiples):
```json
"values": {
  "group": {
    "by": "series",
    "select": [{ "bind": { "to": "measure" } }],
    "dataReductionAlgorithm": { "top": { "count": 60 } }
  }
}
```

#### `table` — Tabela Plana
```json
"dataViewMappings": [{
  "table": {
    "rows": {
      "select": [
        { "for": { "in": "column" } },
        { "for": { "in": "value" } }
      ],
      "dataReductionAlgorithm": { "top": { "count": 2000 } }
    }
  }
}]
```
```typescript
dataView.table.rows     // DataViewTableRow[] — array de arrays
dataView.table.columns  // DataViewMetadataColumn[]
```

#### `matrix` — Matriz Hierárquica (Pivot)
```json
"dataViewMappings": [{
  "matrix": {
    "rows":    { "for": { "in": "rowRole" }, "dataReductionAlgorithm": { "top": { "count": 400 } } },
    "columns": { "for": { "in": "colRole" }, "dataReductionAlgorithm": { "top": { "count": 100 } } },
    "values":  { "select": [{ "for": { "in": "measureRole" } }] }
  }
}]
```
```typescript
dataView.matrix.rows.root.children     // nós da árvore de linhas
dataView.matrix.columns.root.children  // nós da árvore de colunas
```

#### Algoritmos de Data Reduction
| Algoritmo | Comportamento |
|---|---|
| `{ "top": { "count": N } }` | Primeiros N registros (padrão, máx 30.000) |
| `{ "bottom": { "count": N } }` | Últimos N registros |
| `{ "sample": { "count": N } }` | Amostragem uniforme incluindo primeiro e último |
| `{ "window": { "count": N } }` | Por janela/lote (equivale ao `top` atualmente) |

### `objects` — Propriedades de Formatação
```json
"objects": {
  "dataColors": {
    "displayName": "Data Colors",
    "properties": {
      "fill":    { "displayName": "Color", "type": { "fill": { "solid": { "color": true } } } },
      "opacity": { "displayName": "Opacity", "type": { "numeric": true } },
      "show":    { "displayName": "Show", "type": { "bool": true } },
      "fontSize":{ "displayName": "Font Size", "type": { "formatting": { "fontSize": true } } },
      "align":   { "type": { "formatting": { "alignment": true } } }
    }
  }
}
```

### `sorting`
```json
// Padrão — usuário escolhe campo e direção no menu de contexto
"sorting": { "default": {} }

// Implícito — Power BI ordena automaticamente
"sorting": {
  "implicit": {
    "clauses": [
      { "role": "category", "direction": 1 },  // 1 = Ascending
      { "role": "measure",  "direction": 2 }   // 2 = Descending
    ]
  }
}

// Custom — desenvolvedor controla via código TypeScript
"sorting": { "custom": {} }
```

### `drilldown`
```json
"drilldown": { "roles": ["category"] }
```
> A role referenciada deve ter `kind: "Grouping"` e `"max": 1` em `conditions`.

### Flags booleanas úteis
| Flag | Padrão | Efeito |
|---|---|---|
| `supportsHighlight` | `false` | `true`: recebe dados completos + array `highlights` em paralelo |
| `supportsEmptyDataView` | `false` | `true`: `update()` chamado mesmo sem campos vinculados |
| `supportsLandingPage` | `false` | `true`: exibe landing page antes de campos serem adicionados |
| `advancedEditModeSupport` | `0` | `1`= suportado, `2`= obrigatório |

---

## 6. IVisual API — TypeScript

### Importações corretas
```typescript
import powerbi from "powerbi-visuals-api";

import IVisual               = powerbi.extensibility.visual.IVisual;
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions   = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisualHost           = powerbi.extensibility.visual.IVisualHost;
import EnumerateVisualObjectInstancesOptions = powerbi.EnumerateVisualObjectInstancesOptions;
import VisualObjectInstance  = powerbi.VisualObjectInstance;
import DataView              = powerbi.DataView;
```

> O pacote exporta um **namespace default** — não use destructuring direto.

### Interface `IVisual`
```typescript
interface IVisual {
    update<T>(options: VisualUpdateOptions, viewModel?: T): void;  // OBRIGATÓRIO
    destroy?(): void;
    getFormattingModel?(): visuals.FormattingModel | undefined;    // API 5.1+
}
// enumerateObjectInstances — não está na interface mas é chamado pelo host se presente
```

### `VisualConstructorOptions`
```typescript
interface VisualConstructorOptions {
    element: HTMLElement;  // container DOM criado pelo Power BI
    host:    IVisualHost;  // coleção de serviços do host
}
```

### `VisualUpdateOptions`
```typescript
interface VisualUpdateOptions {
    viewport:       { height: number; width: number };
    dataViews:      DataView[];
    type:           VisualUpdateType;   // bitmask — o que mudou
    viewMode?:      ViewMode;           // 0=View, 1=Edit, 2=InFocusEdit
    editMode?:      EditMode;           // 0=Default, 1=Advanced
    operationKind?: VisualDataChangeOperationKind;  // 0=Create, 1=Append, 2=Segment
    jsonFilters?:   IFilter[];
    isInFocus?:     boolean;
    formatMode?:    boolean;
}
```

**`VisualUpdateType` (bitmask):**
| Flag | Valor | Quando ativa |
|---|---|---|
| `Data` | 2 | Dados alterados |
| `Resize` | 4 | Viewport redimensionado |
| `ViewMode` | 8 | Modo view/edit alternado |
| `Style` | 16 | Tema/estilo alterado |
| `ResizeEnd` | 32 | Fim do drag de resize |

### Implementação mínima completa
```typescript
export class Visual implements IVisual {
    private target: HTMLElement;
    private host: IVisualHost;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;
        this.host = options.host;
        // setup DOM único aqui
    }

    public update(options: VisualUpdateOptions): void {
        if (!options?.dataViews?.[0]) {
            this.renderEmptyState();
            return;
        }
        const dataView = options.dataViews[0];
        const { width, height } = options.viewport;
        // re-renderizar a cada chamada
    }

    public enumerateObjectInstances(
        options: EnumerateVisualObjectInstancesOptions
    ): VisualObjectInstance[] {
        return [{
            objectName: options.objectName,
            selector: null,
            properties: {}
        }];
    }

    public destroy(): void {
        // remover event listeners, cancelar timers
    }
}
```

---

## 7. Serviços `IVisualHost`

Acesso via `options.host` no constructor:

| Serviço | Como acessar | Tipo |
|---|---|---|
| Selection | `host.createSelectionManager()` | `ISelectionManager` |
| Selection ID Builder | `host.createSelectionIdBuilder()` | `ISelectionIdBuilder` |
| Tooltips | `host.tooltipService` | `ITooltipService` |
| Localization | `host.createLocalizationManager()` | `ILocalizationManager` |
| Color Palette | `host.colorPalette` | `ISandboxExtendedColorPalette` |
| Locale string | `host.locale` | `string` (ex: `"pt-BR"`) |
| Persistir props | `host.persistProperties(changes)` | `void` |
| Aplicar filtro | `host.applyJsonFilter(...)` | `void` |
| Carregar mais dados | `host.fetchMoreData(aggregateSegments?)` | `boolean` |
| Abrir URL | `host.launchUrl(url)` | `void` |
| Render events | `host.eventService` | `IVisualEventService` |
| Modal dialog | `host.openModalDialog(...)` | `IPromise<ModalDialogResult>` |
| Download | `host.downloadService` | `IDownloadService` |
| Auth AAD | `host.acquireAADTokenService` | `IAcquireAADTokenService` |

---

## 8. ISelectionManager — API de Seleção

```typescript
private selectionManager: ISelectionManager;

constructor(options: VisualConstructorOptions) {
    this.selectionManager = options.host.createSelectionManager();
}
```

```typescript
interface ISelectionManager {
    select(selectionId: ISelectionId | ISelectionId[], multiSelect?: boolean): IPromise<ISelectionId[]>;
    getSelectionIds(): ISelectionId[];
    clear(): IPromise<{}>;
    showContextMenu(selectionId: ISelectionId, position: IPoint): IPromise<{}>;
    hasSelection(): boolean;
    registerOnSelectCallback(callback: (ids: ISelectionId[]) => void): void;
}
```

- `multiSelect: true` → Ctrl+Click (não apaga seleção anterior)
- `showContextMenu` disponível desde API v2.2.0
- `registerOnSelectCallback` — chamado quando outro visual filtra este

```typescript
// Exemplo com context menu
element.addEventListener('contextmenu', (e) => {
    this.selectionManager.showContextMenu(selectionId, { x: e.clientX, y: e.clientY });
    e.preventDefault();
});
```

---

## 9. ITooltipService

```typescript
private tooltipService: ITooltipService = options.host.tooltipService;

// Mostrar
this.tooltipService.show({
    coordinates: [event.clientX, event.clientY],
    isTouchEvent: false,
    dataItems: [{ displayName: "Valor", value: d.value.toString() }],
    identities: [d.selectionId]
});

// Mover
this.tooltipService.move({ coordinates: [e.clientX, e.clientY], isTouchEvent: false, identities: [] });

// Esconder
this.tooltipService.hide({ isTouchEvent: false, immediately: false });
```

---

## 10. enumerateObjectInstances vs getFormattingModel

### Legado (pré-API 5.1)
```typescript
public enumerateObjectInstances(
    options: EnumerateVisualObjectInstancesOptions
): VisualObjectInstance[] {
    const instances: VisualObjectInstance[] = [];
    switch (options.objectName) {
        case 'dataColors':
            instances.push({
                objectName: 'dataColors',
                selector: ColorHelper.normalizeSelector(id.getSelector()),
                properties: { fill: { solid: { color: '#ff0000' } } }
            });
            break;
    }
    return instances;
}
```

### Moderno — `getFormattingModel` (API 5.1+)
Requer `"apiVersion": "5.1.0"` ou superior no `pbiviz.json`.
```typescript
import { formattingSettings } from "powerbi-visuals-utils-formattingmodel";

class VisualSettings extends formattingSettings.Model {
    public colorCard = new ColorCard();
    public cards = [this.colorCard];
}

class ColorCard extends formattingSettings.SimpleCard {
    public fill = new formattingSettings.ColorPicker({
        name: "fill",
        displayName: "Fill Color",
        value: { value: "#000000" }
    });
    public name = "dataColors";
    public displayName = "Data Colors";
    public slices = [this.fill];
}

// No visual.ts:
public getFormattingModel(): powerbi.visuals.FormattingModel {
    return this.formattingSettingsService.buildFormattingModel(this.formattingSettings);
}
```

---

## 11. Ciclo de Vida do Visual

```
Power BI carrega .pbiviz
        │
        ▼
new Visual(VisualConstructorOptions)   ← chamado UMA VEZ
  • Armazenar element, host
  • Criar estrutura DOM (svg, div)
  • Inicializar selectionManager, localizationManager
        │
        ▼  (a cada mudança de dados, resize, filtro, tema…)
visual.update(VisualUpdateOptions)     ← chamado MUITAS VEZES
  • Verificar options.type (bitmask) para saber o que re-renderizar
  • options.dataViews[0] → dados vinculados
  • options.viewport → { width, height }
        │
        ├──► enumerateObjectInstances(options)  ← ao abrir painel de formato
        │    • options.objectName = grupo do capabilities.json
        │    • retornar valores atuais das propriedades
        │
        └──► destroy()  ← ao remover o visual
               • Remover listeners
               • Cancelar subscriptions
```

---

## 12. Padrão de Guard para DataView

**Crítico:** Power BI silencia todos os erros do visual. Sem guard, o DOM congela no último estado válido sem feedback ao usuário.

```typescript
public update(options: VisualUpdateOptions): void {
    // Guard principal
    if (!options?.dataViews?.[0]) {
        this.renderEmptyState();
        return;
    }

    const dataView = options.dataViews[0];

    // Guard para categorical
    const categorical = dataView?.categorical;
    if (!categorical?.categories?.[0]) return;

    const categories = categorical.categories[0];
    const values = categorical.values?.[0];

    // Wrap obrigatório em try/catch para capturar erros que o PBI engole
    try {
        this.render(categories, values, options.viewport);
    } catch (e) {
        console.error('[Visual Error]', e);
    }
}
```

> **Mudança na API 2.1:** `undefined` foi substituído por `null` em dataViews. Use `=== null` em código moderno, não `=== undefined`.

---

## 13. Troubleshooting

### Certificado SSL com `pbiviz start`

**Erros:** `NET::ERR_CERT_AUTHORITY_INVALID`, `NET::ERR_CERT_COMMON_NAME_INVALID`, `ERR_SSL_VERSION_OR_CIPHER_MISMATCH`

**Passos de correção (em ordem):**
```bash
npm install -g powerbi-visuals-tools@latest  # 1. Atualizar tools
pbiviz --clean                                # 2. Limpar certificados antigos
pbiviz install-cert                           # 3. Reinstalar certificado
# Confirmar: "Local certificate successfully installed."
```

**Se persistir no Windows:** `certmgr.msc` → Trusted Root Certification Authorities → importar `.cer` de `node_modules/certs/` manualmente.

**Workaround rápido no Chrome:** `chrome://flags/#allow-insecure-localhost` → Enable.

---

### Visual não aparece / "Visual is not supported"

| Causa | Solução |
|---|---|
| Power BI Desktop desatualizado | Atualizar para versão mais recente |
| Incompatibilidade de apiVersion | Verificar `apiVersion` no `pbiviz.json` vs API instalada |
| Arquivo `.pbiviz` corrompido | Re-importar |
| Developer visual no Desktop | Não suportado — requer Power BI Service |
| Bug Desktop Fev/2025 | Dialog boxes falham — reverter para Jan/2025 |

---

### Debugging

**Problema:** Power BI engole todos os erros silenciosamente.

**Técnicas eficazes:**
1. Usar `debugger;` no código em vez de breakpoints (breakpoints são perdidos no reload)
2. DevTools → Sources → "Pause on caught exceptions"
3. Desligar Auto-Reload durante debug
4. Sempre wrapping em `try/catch` com `console.error`
5. `console.log(JSON.stringify(options.dataViews))` no `update()` para inspecionar estrutura real

---

### Erros comuns de build/package

| Erro | Causa | Solução |
|---|---|---|
| `pbiviz command not found` | Node.js não instalado | `npm install -g powerbi-visuals-tools` |
| `Package install failed` | Deps corrompidas | `pbiviz new` + reinstalar |
| `Cannot read property 'guid' of undefined` | Versão global vs local divergem | `npm install powerbi-visuals-tools --save-dev` |
| `pbiviz update` não reconhecido | tools ≥ v3.4.0 removeu flag `--api` | `npm install --save-dev powerbi-visuals-api@latest` |

---

## 14. Links Oficiais

| Recurso | URL |
|---|---|
| Estrutura do projeto | https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-project-structure |
| Empacotar visual | https://learn.microsoft.com/en-us/power-bi/developer/visuals/package-visual |
| Capabilities | https://learn.microsoft.com/en-us/power-bi/developer/visuals/capabilities |
| DataView Mappings | https://learn.microsoft.com/en-us/power-bi/developer/visuals/dataview-mappings |
| Visual API | https://learn.microsoft.com/en-us/power-bi/developer/visuals/visual-api |
| Selection API | https://learn.microsoft.com/en-us/power-bi/developer/visuals/selection-api |
| Tooltips | https://learn.microsoft.com/en-us/power-bi/developer/visuals/add-tooltips |
| Localization | https://learn.microsoft.com/en-us/power-bi/developer/visuals/localization |
| Format Pane | https://learn.microsoft.com/en-us/power-bi/developer/visuals/format-pane-general |
| Sorting | https://learn.microsoft.com/en-us/power-bi/developer/visuals/sort-options |
| Drill-Down | https://learn.microsoft.com/en-us/power-bi/developer/visuals/drill-down-support |
| Debug | https://learn.microsoft.com/en-us/power-bi/developer/visuals/visuals-how-to-debug |
| Troubleshoot | https://learn.microsoft.com/en-us/power-bi/developer/visuals/power-bi-custom-visuals-troubleshoot |
| SSL Certificate | https://learn.microsoft.com/en-us/power-bi/developer/visuals/create-ssl-certificate |
| API Changelog | https://learn.microsoft.com/en-us/power-bi/developer/visuals/changelog |
| schema.capabilities.json | https://github.com/microsoft/powerbi-visuals-api/blob/main/schema.capabilities.json |
| schema.pbiviz.json | https://github.com/microsoft/powerbi-visuals-api/blob/main/schema.pbiviz.json |
| powerbi-visuals-tools (GitHub) | https://github.com/microsoft/PowerBI-visuals-tools |
| powerbi-visuals-api (GitHub) | https://github.com/microsoft/powerbi-visuals-api |
| Formatting Model Utils | https://github.com/microsoft/powerbi-visuals-utils-formattingmodel |
| Tooltip Utils | https://github.com/Microsoft/powerbi-visuals-utils-tooltiputils |
