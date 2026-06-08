---
name: pbiviz-reference
description: "Referência técnica completa de visuais personalizados Power BI (.pbiviz): guia de início rápido, estrutura de arquivos, CLI pbiviz, capabilities.json, DataView mappings, IVisual API, D3.js, serviços de interatividade, formatação, geração de .pbiviz a partir de Python e troubleshooting. Use quando precisar de informações sobre desenvolvimento de .pbiviz, capabilities, dataRoles, dataViewMappings, ISelectionManager, ITooltipService, enumerateObjectInstances, D3.js, geração de visuais a partir de código Python, erros de certificado SSL ou empacotamento."
---

Referência técnica completa para desenvolvimento de visuais personalizados Power BI (`.pbiviz`), compilada a partir da documentação oficial Microsoft Learn, GitHub microsoft/powerbi-visuals-tools e microsoft/powerbi-visuals-api.

---

## 0. Guia de Início Rápido (do zero ao primeiro visual)

### Pré-requisitos
1. **Node.js LTS** — baixe em [nodejs.org](https://nodejs.org). Inclui o `npm`.
2. **pbiviz CLI** — instale globalmente:
   ```bash
   npm install -g powerbi-visuals-tools
   ```
3. **Editor** — [Visual Studio Code](https://code.visualstudio.com) (recomendado).

### Criar e rodar o projeto
```bash
pbiviz new MeuVisual          # cria pasta MeuVisual/ com template
cd MeuVisual
npm install                   # instala dependências
pbiviz start                  # compila e sobe servidor HTTPS local
```

### Testar no Power BI Service (Developer Mode)
1. Acesse [app.powerbi.com](https://app.powerbi.com)
2. Ícone de engrenagem → **Configurações** → aba **Desenvolvedor** → ative **Habilitar visual de desenvolvedor para teste**
3. Em um relatório em modo de edição: painel Visualizações → três pontinhos (`...`) → **Adicionar visual de desenvolvedor** (ícone `</>`)
4. O visual se atualiza em tempo real enquanto `pbiviz start` estiver rodando

> Developer Mode só funciona no **Power BI Service** — não está disponível no Desktop nem em dispositivos móveis.

### Empacotar para distribuição
```bash
pbiviz package                # gera dist/MeuVisual.pbiviz
```
Importe no Power BI Desktop: **Visualizações** → três pontinhos → **Importar um visual de um arquivo**.

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

## 7. D3.js — Integração com Visuais Power BI

D3.js é a biblioteca de visualização mais usada com Power BI custom visuals. Renderiza gráficos como elementos SVG manipulados por dados.

### Instalação
```bash
npm install d3 --save
npm install @types/d3 --save-dev
```

### Skeleton completo com D3 (`src/visual.ts`)

```typescript
"use strict";

import "./../style/visual.less";
import powerbi from "powerbi-visuals-api";
import VisualConstructorOptions = powerbi.extensibility.visual.VisualConstructorOptions;
import VisualUpdateOptions      = powerbi.extensibility.visual.VisualUpdateOptions;
import IVisual                  = powerbi.extensibility.visual.IVisual;
import * as d3 from "d3";

export class Visual implements IVisual {
    private target: HTMLElement;
    private svg: d3.Selection<SVGSVGElement, unknown, null, undefined>;

    constructor(options: VisualConstructorOptions) {
        this.target = options.element;

        // Cria SVG uma vez no constructor — não re-criar a cada update
        this.svg = d3.select(this.target)
            .append("svg")
            .attr("width", "100%")
            .attr("height", "100%");
    }

    public update(options: VisualUpdateOptions): void {
        // Limpa o SVG a cada update para evitar sobreposição
        this.svg.selectAll("*").remove();

        // Guard: dados ausentes ou incompletos
        if (!options?.dataViews?.[0]?.categorical) return;

        const categorical = options.dataViews[0].categorical;
        const categories  = categorical.categories?.[0]?.values ?? [];
        const values      = categorical.values?.[0]?.values     ?? [];

        // Estrutura os dados em objetos
        const dataSet = categories.map((cat, i) => ({
            category: String(cat),
            value:    Number(values[i] ?? 0)
        }));

        // Renderização simples: lista textual via D3
        this.svg.append("g")
            .selectAll("text")
            .data(dataSet)
            .enter()
            .append("text")
            .attr("x", 20)
            .attr("y", (_d, i) => 30 + i * 25)
            .attr("fill", "#333333")
            .style("font-family", "Segoe UI, sans-serif")
            .style("font-size", "14px")
            .text(d => `${d.category}: ${d.value}`);
    }
}
```

### Padrões essenciais com D3 em visuais Power BI

| Situação | Abordagem |
|---|---|
| Criar SVG | No `constructor` — uma vez só |
| Limpar antes de re-renderizar | `this.svg.selectAll("*").remove()` no início do `update()` |
| Escalar elementos ao viewport | `options.viewport.width` / `options.viewport.height` |
| Cores do tema Power BI | `host.colorPalette.getColor(key).value` |
| Tooltip ao hover | `host.tooltipService.show(...)` dentro de `.on("mouseover", ...)` |
| Seleção ao click | `selectionManager.select(id)` dentro de `.on("click", ...)` |

### D3 + viewport responsivo
```typescript
public update(options: VisualUpdateOptions): void {
    const { width, height } = options.viewport;
    this.svg
        .attr("width", width)
        .attr("height", height);
    // ... escalas D3 usando width/height
}
```

---

## 8. Serviços `IVisualHost` (via `options.host`)

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

## 9. ISelectionManager — API de Seleção

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

## 10. ITooltipService

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

## 11. enumerateObjectInstances vs getFormattingModel

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

## 12. Ciclo de Vida do Visual

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

## 13. Padrão de Guard para DataView

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

## 14. Troubleshooting

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

## 15. Links Oficiais

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

## 16. Gerando um `.pbiviz` a partir de Python — Estrutura Genérica e Reaproveitável

Esta seção descreve uma **convenção pragmática** para descrever um visual Power BI inteiramente em um único arquivo-fonte Python, e como esse arquivo pode ser convertido em um pacote `.pbiviz` válido. O objetivo é que qualquer agente de IA, ao receber um pedido como "crie um `.pbiviz` a partir deste código Python", saiba exatamente qual estrutura de variáveis procurar e como montar o pacote final — **independentemente de qual ferramenta** (este projeto, um script próprio, ou outro gerador) realiza a conversão.

### 16.1 Convenção de variáveis Python de nível superior

Um arquivo Python que descreve um visual declara variáveis simples no escopo global. Um gerador (humano ou agente) lê esse arquivo e extrai os seguintes valores:

| Variável | Obrigatória | Formato | Papel no `.pbiviz` |
|---|---|---|---|
| `CSS` | Não (string vazia se ausente) | string triple-quoted: `CSS = """ ... """` ou `'''...'''` | Estilos do visual (CSS) |
| `JS` | Não (string vazia se ausente) | string triple-quoted: `JS = """ ... """` ou `'''...'''` | Lógica/renderização do visual (JavaScript/TypeScript compilado) |
| `DISPLAY_NAME` | Não (default: nome genérico, ex. `"Python Visual"`) | escalar: `DISPLAY_NAME = "Meu Visual"` | Nome exibido do visual no Power BI |
| `VERSION` | Não (default: `"1.0.0.0"`) | escalar: `VERSION = "1.0.0.0"` | Versão do pacote e do visual |
| `API_VERSION` | Não (default: versão estável recente, ex. `"2.6.0"` ou `"5.3.0"`) | escalar: `API_VERSION = "5.3.0"` | Versão da API `powerbi-visuals-api` alvo |
| `GUID` | Não (default: gerado, ex. `"PythonVisual" + timestamp`) | escalar: `GUID = "meuVisual123"` | Identificador único do visual (usado no nome do arquivo de recurso e nos manifestos) |
| dict `capabilities` (ou `CAPABILITIES`) | Não (default: `{ "dataRoles": [], "dataViewMappings": [], "objects": {} }`) | literal de dicionário Python: `capabilities = { "dataRoles": [...], "dataViewMappings": [...], "objects": {...} }` | Vira o `capabilities.json` embutido — segue exatamente o schema oficial descrito na seção 5 |

Convenções de extração recomendadas para um gerador (sem precisar de um parser Python completo / AST):
- **Blocos triple-quoted** (`CSS`, `JS`): localizar `NOME = """..."""` ou `NOME = '''...'''` via regex e capturar o conteúdo bruto entre as aspas.
- **Escalares** (`DISPLAY_NAME`, `VERSION`, `API_VERSION`, `GUID`): localizar `NOME = "valor"` ou `NOME = 'valor'` e capturar o valor entre aspas.
- **Dicionário `capabilities`**: localizar o literal `{ ... }` atribuído à variável e converter a sintaxe de dict Python (aspas simples, `True`/`False`/`None`) para JSON válido antes de fazer `JSON.parse`/`json.loads`.

Essa convenção é deliberadamente simples — qualquer pessoa (ou agente) pode escrever um único arquivo `.py` com essas variáveis, sem precisar montar manualmente a árvore de diretórios do projeto-fonte oficial (seção 2).

### 16.2 Do arquivo Python ao pacote `.pbiviz` — fluxo de conversão

Independentemente da ferramenta usada, o fluxo lógico de conversão é:

1. **Ler o arquivo-fonte Python** e extrair `CSS`, `JS`, `DISPLAY_NAME`, `VERSION`, `API_VERSION`, `GUID` e `capabilities` conforme a convenção acima (aplicando os defaults quando a variável estiver ausente).
2. **Montar o manifesto `package.json`** do pacote, com `version`, `author`, `resources[]` (apontando para o arquivo de recurso) e os metadados `visual{ name, displayName, guid, visualClassName, version }`.
3. **Montar o arquivo de recurso** (`resources/{guid}.pbiviz.json`), contendo `visual{}`, `apiVersion`, `style`, `capabilities` e o conteúdo do visual — `content.js` e `content.css` recebendo, respectivamente, o `JS` e o `CSS` extraídos — além de um ícone (pode ser um PNG simples embutido como data URI base64, já que o Power BI exige um ícone para listar o visual).
4. **Compactar os arquivos em um ZIP** sem comprimir/gerar entradas de diretório (equivalente a `zipfile.writestr` em Python, ou bibliotecas como `fflate`/`zipSync` em JS/TS) e salvar com a extensão `.pbiviz`.

Esse fluxo gera um pacote **mínimo e funcional** (dois arquivos: `package.json` + `resources/{guid}.pbiviz.json`, com `content` embutido), adequado para prototipagem rápida e visualização do visual no Power BI. Ele difere do pipeline oficial `pbiviz package` (seção 4), que compila um projeto-fonte completo (`visual.ts`, `style/visual.less`, `capabilities.json`, etc.) em recursos `visual.prod.js`/`visual.prod.css` separados — um processo mais robusto, voltado para certificação/publicação no AppSource.

### 16.3 Estrutura mínima resultante do `.pbiviz`

```
meu-visual.pbiviz (ZIP)
├── package.json                  # manifesto: version, author, resources[], visual{}, metadata
└── resources/
    └── {guid}.pbiviz.json        # recurso único: visual{}, apiVersion, style, stringResources,
                                  # capabilities{}, content{ js, css, iconBase64 }
```

Pontos-chave dessa estrutura mínima:
- **`content` embutido**: o JS e o CSS do visual ficam como strings diretamente dentro de `resources/{guid}.pbiviz.json`, em `content.js` e `content.css` — não como arquivos separados no pacote.
- **Ícone embutido**: `content.iconBase64` pode ser um data URI (`data:image/png;base64,...`), dispensando uma pasta `assets/` física dentro do ZIP.
- **Referências declarativas** como `style: "style/visual.less"` e `assets.icon: "assets/icon.png"` podem ser mantidas por compatibilidade de schema mesmo sem os arquivos físicos correspondentes existirem no pacote — o conteúdo real já está embutido em `content`.
- **`metadata.pbivizjson.resourceId`** no `package.json` referencia o recurso único declarado em `resources[]` (convencionalmente `rId0`).

### 16.4 Por que essa estrutura é útil para um agente de IA

Ao receber um pedido para "criar um `.pbiviz` a partir de código Python", um agente que conhece essa convenção pode:
- Gerar (ou validar) um arquivo Python com as variáveis `CSS`, `JS`, `DISPLAY_NAME`, `VERSION`, `API_VERSION`, `GUID` e `capabilities` corretamente formatadas.
- Construir, a partir desse arquivo, um `.pbiviz` mínimo e funcional sem precisar montar o projeto-fonte oficial completo (Node.js + `pbiviz` CLI) — útil para prototipagem rápida, demos e testes.
- Preencher `capabilities` seguindo o schema oficial (seção 5), garantindo que `dataRoles` e `dataViewMappings` sejam compatíveis com o Power BI real.
- Usar essa mesma estrutura como ponto de partida e, quando necessário (visual pronto para certificação/AppSource), migrar para o projeto-fonte oficial e o pipeline `pbiviz package`.
