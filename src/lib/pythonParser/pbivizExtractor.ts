/**
 * Detects and previews Power BI custom visual build scripts.
 *
 * A pbiviz build script defines CSS and JS as top-level triple-quoted strings.
 * We extract CSS + JS, plus any recognized config variables, then render a mock
 * Power BI sandbox with real dataViews so the visual behaves as expected.
 */

import type { ExtractedPbivizConfig } from './types';
import type { PBISettings } from '../storage';
import { DEFAULT_PBI_SETTINGS } from '../storage';

function extractTripleQuotedString(code: string, varName: string): string | null {
  const re = new RegExp(
    `\\b${varName}\\s*=\\s*r?(?:"""([\\s\\S]*?)"""|'''([\\s\\S]*?)''')`,
  );
  const m = re.exec(code);
  if (!m) return null;
  return m[1] !== undefined ? m[1] : m[2] !== undefined ? m[2] : null;
}

function extractScalarString(code: string, varName: string): string | null {
  const re = new RegExp(`\\b${varName}\\s*=\\s*["']([^"'\\n]+)["']`);
  const m = re.exec(code);
  return m ? m[1] : null;
}

function esc(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

export function isPbivizScript(code: string): boolean {
  const hasCSS = /\bCSS\s*=\s*r?"""/.test(code) || /\bCSS\s*=\s*r?'''/.test(code);
  const hasJS  = /\bJS\s*=\s*r?"""/.test(code)  || /\bJS\s*=\s*r?'''/.test(code);
  return hasCSS && hasJS;
}

/**
 * Scans the Python source for known config variable names and returns
 * their values. These override any panel settings when building the preview.
 *
 * Recognized variables:
 *   Conexão:      API_KEY, PROVEDOR, AGENT_ID, MODELO, SYSTEM_PROMPT
 *   Layout:       TITULO_CHAT (or DISPLAY_NAME), PLACEHOLDER, TEXTO_BOTAO
 *   Aparência:    COR_FUNDO_CABECALHO, COR_TEXTO_CABECALHO, COR_FUNDO_CHAT,
 *                 COR_BOLHAS_USUARIO, COR_BOLHAS_ASSISTENTE
 */
export function extractPbivizConfig(code: string): ExtractedPbivizConfig {
  const result: ExtractedPbivizConfig = {};

  const apiKey       = extractScalarString(code, 'API_KEY');
  const provedor     = extractScalarString(code, 'PROVEDOR');
  const agentId      = extractScalarString(code, 'AGENT_ID');
  const modelo       = extractScalarString(code, 'MODELO');
  const systemPrompt = extractTripleQuotedString(code, 'SYSTEM_PROMPT')
                    ?? extractScalarString(code, 'SYSTEM_PROMPT');

  if (apiKey !== null || provedor !== null || agentId !== null || modelo !== null || systemPrompt !== null) {
    result.conexao = {};
    if (apiKey !== null)       result.conexao.apiKey = apiKey;
    if (provedor !== null)     result.conexao.provedor = provedor;
    if (agentId !== null)      result.conexao.agentId = agentId;
    if (modelo !== null)       result.conexao.modelo = modelo;
    if (systemPrompt !== null) result.conexao.systemPrompt = systemPrompt;
  }

  // TITULO_CHAT takes precedence over DISPLAY_NAME
  const tituloChat      = extractScalarString(code, 'TITULO_CHAT')
                       ?? extractScalarString(code, 'DISPLAY_NAME');
  const placeholderInput = extractScalarString(code, 'PLACEHOLDER');
  const textoBotaoEnviar = extractScalarString(code, 'TEXTO_BOTAO');

  if (tituloChat !== null || placeholderInput !== null || textoBotaoEnviar !== null) {
    result.layout = {};
    if (tituloChat !== null)       result.layout.tituloChat = tituloChat;
    if (placeholderInput !== null) result.layout.placeholderInput = placeholderInput;
    if (textoBotaoEnviar !== null) result.layout.textoBotaoEnviar = textoBotaoEnviar;
  }

  const corFundoCabecalho   = extractScalarString(code, 'COR_FUNDO_CABECALHO');
  const corTextoCabecalho   = extractScalarString(code, 'COR_TEXTO_CABECALHO');
  const corFundoChat        = extractScalarString(code, 'COR_FUNDO_CHAT');
  const corBolhasUsuario    = extractScalarString(code, 'COR_BOLHAS_USUARIO');
  const corBolhasAssistente = extractScalarString(code, 'COR_BOLHAS_ASSISTENTE');

  if (corFundoCabecalho !== null || corTextoCabecalho !== null || corFundoChat !== null
      || corBolhasUsuario !== null || corBolhasAssistente !== null) {
    result.aparenciaChat = {};
    if (corFundoCabecalho !== null)   result.aparenciaChat.corFundoCabecalho = corFundoCabecalho;
    if (corTextoCabecalho !== null)   result.aparenciaChat.corTextoCabecalho = corTextoCabecalho;
    if (corFundoChat !== null)        result.aparenciaChat.corFundoChat = corFundoChat;
    if (corBolhasUsuario !== null)    result.aparenciaChat.corBolhasUsuario = corBolhasUsuario;
    if (corBolhasAssistente !== null) result.aparenciaChat.corBolhasAssistente = corBolhasAssistente;
  }

  return result;
}

function mergeWithExtracted(settings: PBISettings, extracted: ExtractedPbivizConfig): PBISettings {
  return {
    ...settings,
    conexao:      { ...settings.conexao,      ...(extracted.conexao      ?? {}) },
    layout:       { ...settings.layout,       ...(extracted.layout       ?? {}) },
    aparenciaChat:{ ...settings.aparenciaChat, ...(extracted.aparenciaChat ?? {}) },
  };
}

export function extractPbivizPreviewHtml(
  code: string,
  settings?: PBISettings,
): { html: string; extractedConfig: ExtractedPbivizConfig } | null {
  const css = extractTripleQuotedString(code, 'CSS');
  const js  = extractTripleQuotedString(code, 'JS');
  if (!css || !js) return null;

  const displayName    = extractScalarString(code, 'DISPLAY_NAME') ?? 'Power BI Visual';
  const extractedConfig = extractPbivizConfig(code);
  const resolved        = settings ?? DEFAULT_PBI_SETTINGS;
  const effectiveSettings = mergeWithExtracted(resolved, extractedConfig);

  return {
    html: buildPreviewHtml({ css, js, displayName, settings: effectiveSettings }),
    extractedConfig,
  };
}

function buildPreviewHtml({
  css,
  js,
  displayName,
  settings,
}: {
  css: string;
  js: string;
  displayName: string;
  settings: PBISettings;
}): string {
  const { conexao, layout, aparenciaChat, dados } = settings;

  const safeName        = esc(layout.tituloChat);
  const safeDisplay     = esc(displayName);
  const safeApiKey      = esc(conexao.apiKey);
  const safeAgentId     = esc(conexao.agentId);
  const safeModelo      = esc(conexao.modelo || conexao.modeloSugerido);
  const safePrompt      = esc(conexao.systemPrompt);
  const safePlaceholder = esc(layout.placeholderInput);
  const safeBotao       = esc(layout.textoBotaoEnviar);
  // Escape </script> inside JSON to avoid early tag close
  const dadosJson = JSON.stringify(dados ?? { colunas: [], medidas: [] })
    .replace(/<\/script>/gi, '<\\/script>');

  return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${displayName} — Preview</title>
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
html,body{width:100%;height:100%;overflow:hidden;background:#f3f4f6}
#__pbi_container{width:100%;height:100%}
${css}
</style>
</head>
<body>
<div id="__pbi_container"></div>
<script>
// ── Mock Power BI host ─────────────────────────────────────────
window.powerbi = { visuals: { plugins: {} } };

// ── Visual bundle ──────────────────────────────────────────────
${js}

// ── Bootstrap ─────────────────────────────────────────────────
(function() {
  try {
    var plugins = window.powerbi && window.powerbi.visuals && window.powerbi.visuals.plugins;
    if (!plugins) throw new Error('window.powerbi.visuals.plugins not found');
    var keys = Object.keys(plugins);
    if (!keys.length) throw new Error('No visual plugin registered');

    var plugin    = plugins[keys[0]];
    var container = document.getElementById('__pbi_container');

    var mockHost = {
      createSelectionManager: function() {
        return {
          select: function() { return Promise.resolve(); },
          clear:  function() { return Promise.resolve(); },
          registerOnSelectCallback: function() {},
          hasSelection: function() { return false; }
        };
      },
      createTooltipService: function() {
        return { show: function() {}, hide: function() {}, move: function() {} };
      },
      eventService: {
        renderingStarted:  function() {},
        renderingFinished: function() {},
        renderingFailed:   function() {}
      },
      persistProperties:        function() {},
      applyJsonFilter:          function() {},
      refreshHostData:          function() {},
      fetchMoreData:            function() { return false; },
      createSelectionIdBuilder: function() {
        return {
          withCategory:      function() { return this; },
          withMeasure:       function() { return this; },
          createSelectionId: function() { return { equals: function() { return false; } }; }
        };
      },
      locale:            'pt-BR',
      allowInteractions: true,
      launchUrl:         function(url) { window.open(url, '_blank'); },
      instanceId:        'pbiviz-preview'
    };

    var visual = plugin.create({ element: container, host: mockHost });

    // ── Mock data (from painel "Dados") ────────────────────────
    var __dados = ${dadosJson};

    function __parseDados() {
      var colunas = (__dados.colunas || []).map(function(c) {
        var vals = typeof c.valores === 'string'
          ? c.valores.split(',').map(function(v) { return v.trim(); }).filter(function(v) { return v !== ''; })
          : (c.valores || []);
        return { nome: c.nome, tipo: c.tipo || 'text', valores: vals };
      });
      var medidas = (__dados.medidas || []).map(function(m) {
        return { nome: m.nome, valor: parseFloat(String(m.valor)) || 0 };
      });
      return { colunas: colunas, medidas: medidas };
    }

    function __buildDataViews(settingsObjects) {
      var d        = __parseDados();
      var colunas  = d.colunas;
      var medidas  = d.medidas;
      var numRows  = colunas.length > 0 ? colunas[0].valores.length : 0;

      function makeType(tipo) {
        if (tipo === 'numeric') return { numeric: true };
        if (tipo === 'boolean') return { bool: true };
        return { text: true };
      }

      var colMeta = colunas.map(function(c, i) {
        return {
          displayName: c.nome, queryName: 'Table.' + c.nome,
          type: makeType(c.tipo), index: i, roles: { Category: true }
        };
      });
      var measMeta = medidas.map(function(m, i) {
        return {
          displayName: m.nome, queryName: 'Table.' + m.nome,
          type: { numeric: true }, isMeasure: true,
          index: colunas.length + i, roles: { Values: true }
        };
      });

      var categories = colunas.map(function(c, i) {
        return {
          source: colMeta[i],
          values: c.valores,
          identity: c.valores.map(function(v, j) { return { key: String(j) }; }),
          identityFields: []
        };
      });

      var valueColumns = medidas.map(function(m, i) {
        var numVal = m.valor;
        return {
          source:   measMeta[i],
          values:   Array(Math.max(numRows, 1)).fill(numVal),
          subtotal: numVal * Math.max(numRows, 1),
          maxLocal: numVal,
          minLocal: numVal
        };
      });
      valueColumns.grouped = function() {
        return [{ name: '', values: valueColumns, identity: null }];
      };

      var tableRows = numRows > 0
        ? Array.from({ length: numRows }, function(_, ri) {
            return colunas.map(function(c) { return c.valores[ri] !== undefined ? c.valores[ri] : null; })
              .concat(medidas.map(function(m) { return m.valor; }));
          })
        : [];

      return [{
        metadata: {
          columns: colMeta.concat(measMeta),
          objects: settingsObjects
        },
        categorical: {
          categories: categories,
          values: valueColumns
        },
        table: {
          columns: colMeta.concat(measMeta),
          rows: tableRows
        }
      }];
    }

    // ── Settings injetadas do Python/painel ────────────────────
    var __settingsObjects = {
      conexao: {
        provedor:       '${conexao.provedor}',
        apiKey:         '${safeApiKey}',
        agentId:        '${safeAgentId}',
        modelo:         '${safeModelo}',
        modeloSugerido: '${conexao.modeloSugerido}',
        systemPrompt:   '${safePrompt}'
      },
      layout: {
        tituloChat:          '${safeName}',
        exibirTitulo:        ${layout.exibirTitulo},
        placeholderInput:    '${safePlaceholder}',
        textoBotaoEnviar:    '${safeBotao}',
        debugExibirContexto: ${layout.debugExibirContexto},
        displayName:         '${safeDisplay}'
      },
      aparenciaChat: {
        corFundoCabecalho:   '${aparenciaChat.corFundoCabecalho}',
        corTextoCabecalho:   '${aparenciaChat.corTextoCabecalho}',
        corFundoChat:        '${aparenciaChat.corFundoChat}',
        corBolhasUsuario:    '${aparenciaChat.corBolhasUsuario}',
        corBolhasAssistente: '${aparenciaChat.corBolhasAssistente}'
      }
    };

    function __doUpdate() {
      var vp = {
        width:  container.offsetWidth  || 400,
        height: container.offsetHeight || 300
      };
      visual.update({
        viewport:  vp,
        type:      2,
        dataViews: __buildDataViews(__settingsObjects)
      });
    }

    __doUpdate();

    if (window.ResizeObserver) {
      new ResizeObserver(function() { __doUpdate(); }).observe(container);
    }

  } catch (err) {
    document.body.innerHTML =
      '<div style="padding:20px;font-family:monospace;font-size:13px;color:#991b1b;' +
      'background:#fef2f2;border:1px solid #fecaca;border-radius:8px;margin:16px;">' +
      '<b>Erro no preview pbiviz:</b><br>' + (err && err.message ? err.message : String(err)) +
      '</div>';
  }
})();
</script>
</body>
</html>`;
}
