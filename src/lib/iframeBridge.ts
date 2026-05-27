import { MOCK_HOST_SCRIPT } from "./mockHost";

export function buildPreviewShell() {
  return `<!doctype html>
<html><head><meta charset="utf-8"><style>
html,body{margin:0;padding:0;height:100%;background:#fff;font-family:Inter,system-ui,sans-serif}
#root{width:100%;height:100%;display:flex}
#err{position:absolute;top:0;left:0;right:0;background:#fef2f2;color:#991b1b;padding:8px 12px;font-size:12px;font-family:monospace;border-bottom:1px solid #fecaca;white-space:pre-wrap;display:none;z-index:99999}
</style></head>
<body>
<div id="err"></div>
<div id="root"></div>
<script>${MOCK_HOST_SCRIPT}<\/script>
<script>
(function(){
  var instance = null;
  var styleTag = null;
  var lastGuid = null;
  var hadJsLoaded = false;
  var errEl = document.getElementById("err");

  function showErr(msg) { errEl.textContent = msg; errEl.style.display = "block"; }
  function clearErr() { errEl.style.display = "none"; }

  function applyCss(css) {
    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.setAttribute("data-pbiviz-render", "1");
      document.head.appendChild(styleTag);
    }
    styleTag.textContent = css || "";
  }

  function loadJs(js, guid) {
    try {
      (0, eval)(js);
      lastGuid = guid;
      hadJsLoaded = true;
      return true;
    } catch (e) {
      showErr("JS load error: " + (e && e.message || e));
      return false;
    }
  }

  function createInstance(guid) {
    try {
      var plugin = window.powerbi.visuals.plugins[guid];
      if (!plugin) { showErr("Plugin nao encontrado: " + guid); return false; }
      var el = document.getElementById("root");
      while (el.firstChild) el.removeChild(el.firstChild);
      var host = window.__buildMockHost();
      instance = plugin.create({ host: host, element: el });
      return true;
    } catch (e) {
      showErr("create() error: " + (e && e.message || e));
      return false;
    }
  }

  function callUpdate(dataView, viewport) {
    if (!instance) return;
    try {
      instance.update({
        dataViews: dataView ? [dataView] : [],
        viewport: viewport || { width: window.innerWidth, height: window.innerHeight },
        type: 2,
        jsonFilters: [],
        operationKind: 0
      });
      clearErr();
    } catch (e) {
      showErr("update() error: " + (e && e.message || e) + "\\n" + (e && e.stack || ""));
    }
  }

  window.addEventListener("message", function(ev) {
    var d = ev.data;
    if (!d || d.type !== "RENDER") return;
    try {
      if (d.reset || d.guid !== lastGuid) {
        instance = null;
        hadJsLoaded = false;
        var oldStyles = document.querySelectorAll("style[data-pbiviz-guid]");
        oldStyles.forEach(function(s){ s.parentNode && s.parentNode.removeChild(s); });
        if (window.powerbi && window.powerbi.visuals && window.powerbi.visuals.plugins) {
          window.powerbi.visuals.plugins = {};
        }
      }
      applyCss(d.css);
      if (!hadJsLoaded) {
        if (!loadJs(d.js, d.guid)) return;
        if (!createInstance(d.guid)) return;
      }
      callUpdate(d.dataView, d.viewport);
    } catch (e) {
      showErr(String(e && e.message || e));
    }
  });

  parent.postMessage({ type: "PREVIEW_READY" }, "*");
})();
<\/script>
</body></html>`;
}
