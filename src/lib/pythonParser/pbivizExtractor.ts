/**
 * Detects and previews Power BI custom visual build scripts.
 *
 * A pbiviz build script defines CSS and JS as top-level triple-quoted strings
 * and packages them into a .pbiviz ZIP. Instead of running the script, we
 * extract CSS + JS and render a mock Power BI sandbox so the visual is visible
 * in the preview pane.
 */

import type { PBISettings } from '../storage';
import { DEFAULT_PBI_SETTINGS } from '../storage';

function extractTripleQuotedString(code: string, varName: string): string | null {
  // Handles:  VAR = """..."""  /  VAR = r"""..."""  /  VAR = '''...'''  /  VAR = r'''...'''
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

export function isPbivizScript(code: string): boolean {
  const hasCSS = /\bCSS\s*=\s*r?"""/.test(code) || /\bCSS\s*=\s*r?'''/.test(code);
  const hasJS  = /\bJS\s*=\s*r?"""/.test(code)  || /\bJS\s*=\s*r?'''/.test(code);
  return hasCSS && hasJS;
}

export function extractPbivizPreviewHtml(code: string, settings?: PBISettings): string | null {
  const css = extractTripleQuotedString(code, 'CSS');
  const js  = extractTripleQuotedString(code, 'JS');

  if (!css || !js) return null;

  const displayName = extractScalarString(code, 'DISPLAY_NAME') ?? 'Power BI Visual';
  const resolved = settings ?? DEFAULT_PBI_SETTINGS;

  return buildPreviewHtml({ css, js, displayName, settings: resolved });
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
  const { conexao, layout } = settings;

  const safeName       = layout.tituloChat.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeDisplay    = displayName.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeApiKey     = conexao.apiKey.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeAgentId    = conexao.agentId.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeModelo     = (conexao.modelo || conexao.modeloSugerido).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safePrompt     = conexao.systemPrompt.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safePlaceholder = layout.placeholderInput.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  const safeBotao      = layout.textoBotaoEnviar.replace(/\\/g, '\\\\').replace(/'/g, "\\'");

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
      persistProperties:       function() {},
      applyJsonFilter:         function() {},
      refreshHostData:         function() {},
      fetchMoreData:           function() { return false; },
      createSelectionIdBuilder: function() {
        return {
          withCategory: function() { return this; },
          withMeasure:  function() { return this; },
          createSelectionId: function() { return { equals: function() { return false; } }; }
        };
      },
      locale:       'pt-BR',
      allowInteractions: true,
      launchUrl:    function(url) { window.open(url, '_blank'); },
      instanceId:   'pbiviz-preview'
    };

    var visual = plugin.create({ element: container, host: mockHost });

    visual.update({
      dataViews: [{
        metadata: {
          objects: {
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
            }
          }
        }
      }]
    });
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
