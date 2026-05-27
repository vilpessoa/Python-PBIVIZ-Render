#!/usr/bin/env python3
"""
Build script for Power_IA_TESS_v3.pbiviz  (v3.0)
v3: Direct API — proxy removed entirely.
    The browser inside the Power BI visual sandbox calls the provider
    endpoints directly (TESS, Anthropic, OpenAI, Gemini) using the
    WebAccess privilege declared in capabilities.json.

Pure Python — no Node.js, no pbiviz CLI required.
"""

import json
import zipfile
import os

GUID = "PowerIATESSV3F1E2D3C4B5A6"
DISPLAY_NAME = "Power IA TESS V3"
VISUAL_CLASS = "Visual"
API_VERSION = "2.6.0"
VERSION = "3.0.0.0"

# ─────────────────────────────────────────────────────────────
# CSS
# ─────────────────────────────────────────────────────────────
CSS = """.aiChatV3 {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: #ffffff;
  overflow: hidden;
  font-size: 13px;
  box-sizing: border-box;
}
.aiChatV3 *, .aiChatV3 *:before, .aiChatV3 *:after { box-sizing: border-box; }
.aiChatV3 .v3-header {
  background: #E85D04;
  padding: 9px 12px;
  display: flex;
  align-items: center;
  gap: 8px;
  flex-shrink: 0;
}
.aiChatV3 .v3-header-dot {
  width: 7px; height: 7px;
  border-radius: 50%;
  background: rgba(255,255,255,0.45);
  flex-shrink: 0;
}
.aiChatV3 .v3-title {
  font-size: 13px;
  font-weight: 700;
  color: #ffffff;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
}
.aiChatV3 .v3-prov-pill {
  font-size: 10px;
  background: rgba(255,255,255,0.2);
  color: white;
  padding: 2px 8px;
  border-radius: 10px;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}
.aiChatV3 .v3-hdr-right {
  display: flex;
  align-items: center;
  gap: 5px;
  flex-shrink: 0;
}
.aiChatV3 .v3-hdr-btn {
  background: rgba(255,255,255,0.15);
  border: 1px solid rgba(255,255,255,0.25);
  color: white;
  border-radius: 5px;
  padding: 3px 8px;
  font-size: 10px;
  cursor: pointer;
  white-space: nowrap;
}
.aiChatV3 .v3-hdr-btn:hover { background: rgba(255,255,255,0.28); }
.aiChatV3 .v3-messages {
  flex: 1;
  overflow-y: auto;
  padding: 12px;
  display: flex;
  flex-direction: column;
  gap: 8px;
  background: #F9FAFB;
}
.aiChatV3 .v3-messages::-webkit-scrollbar { width: 4px; }
.aiChatV3 .v3-messages::-webkit-scrollbar-thumb { background: #D1D5DB; border-radius: 2px; }
.aiChatV3 .v3-messages .msg {
  max-width: 85%;
  padding: 8px 12px;
  border-radius: 10px;
  font-size: 13px;
  line-height: 1.55;
  word-break: break-word;
}
.aiChatV3 .v3-messages .msg.user {
  align-self: flex-end;
  background: #E85D04;
  color: #ffffff;
  border-bottom-right-radius: 3px;
}
.aiChatV3 .v3-messages .msg.assistant {
  align-self: flex-start;
  background: #ffffff;
  color: #1F2937;
  border: 1px solid #E5E7EB;
  border-bottom-left-radius: 3px;
}
.aiChatV3 .v3-messages .msg.assistant h3 { font-size:1.05em; margin:5px 0 2px; }
.aiChatV3 .v3-messages .msg.assistant h4 { font-size:0.97em; margin:4px 0 2px; }
.aiChatV3 .v3-messages .msg.assistant ul,
.aiChatV3 .v3-messages .msg.assistant ol { margin:3px 0; padding-left:18px; }
.aiChatV3 .v3-messages .msg.assistant li { margin:1px 0; }
.aiChatV3 .v3-messages .msg.assistant hr { border:none; border-top:1px solid #e0e0e0; margin:5px 0; }
.aiChatV3 .v3-messages .msg.assistant code { background:#f3f4f6; padding:1px 4px; border-radius:3px; font-size:0.9em; font-family:monospace; }
.aiChatV3 .v3-messages .msg.error {
  align-self: flex-start;
  background: #FEF2F2;
  color: #991B1B;
  border: 1px solid #FECACA;
}
.aiChatV3 .v3-messages .msg.thinking {
  align-self: flex-start;
  background: #F3F4F6;
  color: #6B7280;
  border: 1px solid #E5E7EB;
  font-style: italic;
}
.aiChatV3 .v3-messages .msg.thinking .dots {
  animation: v3blink 1.2s infinite;
  display: inline-block;
}
.aiChatV3 .v3-ctx-bar {
  padding: 5px 12px;
  background: #FFF3E0;
  border-top: 1px solid #FFE0B2;
  font-size: 10px;
  display: flex;
  gap: 5px;
  align-items: flex-start;
  flex-shrink: 0;
  flex-wrap: wrap;
}
.aiChatV3 .v3-ctx-lbl { font-weight: 700; color: #BF360C; white-space: nowrap; }
.aiChatV3 .v3-ctx-val { color: #E64A19; line-height: 1.5; }
.aiChatV3 .v3-input-area {
  display: flex;
  gap: 6px;
  padding: 9px 12px;
  border-top: 1px solid #E5E7EB;
  background: #ffffff;
  align-items: flex-end;
  flex-shrink: 0;
}
.aiChatV3 .v3-textarea {
  flex: 1;
  border: 1px solid #D1D5DB;
  border-radius: 8px;
  padding: 7px 10px;
  font-size: 13px;
  font-family: inherit;
  resize: none;
  max-height: 80px;
  line-height: 1.4;
  color: #1F2937;
  background: #F9FAFB;
  outline: none;
}
.aiChatV3 .v3-textarea:focus { border-color: #E85D04; background: #ffffff; }
.aiChatV3 .v3-textarea::placeholder { color: #9CA3AF; }
.aiChatV3 .v3-send-btn {
  background: #E85D04;
  color: #ffffff;
  border: none;
  border-radius: 8px;
  padding: 7px 14px;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  flex-shrink: 0;
  white-space: nowrap;
  height: 34px;
}
.aiChatV3 .v3-send-btn:hover { opacity: 0.88; }
.aiChatV3 .v3-send-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.aiChatV3 .v3-no-config {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
  text-align: center;
  font-size: 13px;
  color: #6B7280;
  background: #F9FAFB;
  line-height: 1.6;
}
@keyframes v3blink { 0%,100%{opacity:1} 50%{opacity:0.3} }
"""

# ─────────────────────────────────────────────────────────────
# JavaScript — v3.0 (direct API, no proxy)
# ─────────────────────────────────────────────────────────────
JS = r"""
var PowerIATESSV3F1E2D3C4B5A6;
(function() {
    "use strict";

    var GUID = "PowerIATESSV3F1E2D3C4B5A6";

    var DEFAULTS = {
        provider: "tess",
        apiKey: "",
        agentId: "",
        model: "",
        modeloSugerido: "tess-5",
        systemPromptText: "",
        chatTitle: "Assistente IA",
        showTitle: true,
        inputPlaceholder: "Pergunte sobre os dados...",
        sendBtnText: "Enviar",
        fontFamily: "Inter",
        msgFontSize: 13,
        inputFontSize: 12,
        colorFundoHeader: "#E85D04",
        colorTextoHeader: "#FFFFFF",
        colorFundoChat: "#F9FAFB",
        colorBolhaUsuario: "#E85D04",
        colorBolhaAssistente: "#FFFFFF",
        colorTextoBolha: "#1F2937",
        colorFundoInput: "#F9FAFB",
        colorBotaoEnviar: "#E85D04",
        colorTextoBotao: "#FFFFFF",
        showDebugContext: false
    };

    var FONT_MAP = {
        "Inter":    "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
        "Segoe UI": "'Segoe UI', Tahoma, Geneva, sans-serif",
        "Arial":    "Arial, Helvetica, sans-serif",
        "Roboto":   "'Roboto', Arial, sans-serif"
    };

    var PROV_LABELS = { tess: "TESS AI", anthropic: "Anthropic", openai: "OpenAI", gemini: "Gemini" };

    // ── Markdown → HTML (inline) ──────────────────────────────
    function _inlineMd(s) {
        s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
        s = s.replace(/\*([^*\n]+)\*/g,     "<em>$1</em>");
        s = s.replace(/`([^`\n]+)`/g,       "<code>$1</code>");
        return s;
    }

    function _parseMarkdown(raw) {
        var text = raw
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");

        var lines = text.split("\n");
        var out = [];
        var listTag = "";

        function closeList() {
            if (listTag) { out.push("</" + listTag + ">"); listTag = ""; }
        }

        for (var i = 0; i < lines.length; i++) {
            var line = lines[i];
            var tr   = line.trim();

            var hm12 = tr.match(/^#{1,2}\s+(.+)/);
            if (hm12) { closeList(); out.push("<h3>" + _inlineMd(hm12[1]) + "</h3>"); continue; }

            var hm3 = tr.match(/^#{3,}\s+(.+)/);
            if (hm3) { closeList(); out.push("<h4>" + _inlineMd(hm3[1]) + "</h4>"); continue; }

            if (/^[-*_]{3,}$/.test(tr)) { closeList(); out.push("<hr>"); continue; }

            var ulm = tr.match(/^[-*+]\s+(.+)/);
            if (ulm) {
                if (listTag !== "ul") { closeList(); out.push("<ul>"); listTag = "ul"; }
                out.push("<li>" + _inlineMd(ulm[1]) + "</li>");
                continue;
            }

            var olm = tr.match(/^\d+\.\s+(.+)/);
            if (olm) {
                if (listTag !== "ol") { closeList(); out.push("<ol>"); listTag = "ol"; }
                out.push("<li>" + _inlineMd(olm[1]) + "</li>");
                continue;
            }

            if (tr === "") {
                closeList();
                var last = out.length > 0 ? out[out.length - 1] : "";
                if (last && !/^<(h[34]|hr|ul|ol|\/ul|\/ol)/.test(last)) { out.push("<br>"); }
                continue;
            }

            closeList();
            out.push(_inlineMd(line) + "<br>");
        }

        closeList();

        var html = out.join("");
        html = html.replace(/(<br>){3,}/g, "<br><br>");
        html = html.replace(/<br>$/, "");
        return html;
    }

    function Visual(options) {
        this.host      = options.host;
        this.container = options.element;
        this.container.classList.add("aiChatV3");
        this.messages  = [];
        this.settings  = {};
        for (var k in DEFAULTS) { this.settings[k] = DEFAULTS[k]; }
        this.context   = { measures: [], categories: [], dates: [], systemPromptFromMeasure: "" };
        this.isLoading = false;
        this.messagesContainer = null;
        this.textarea  = null;
        this.sendBtn   = null;
        this.ctxValEl  = null;
        this.titleEl   = null;
        this.provPill  = null;
        this.headerEl  = null;
        this.inputAreaEl = null;
        this.ctxBar    = null;
        this.noConfigEl = null;
        this._styleTag = null;
        this._welcomeShown = false;

        this._buildLayout();
    }

    Visual.prototype._buildLayout = function() {
        var self = this;

        var styleTag = document.createElement("style");
        styleTag.setAttribute("data-pbiviz-guid", GUID);
        document.head.appendChild(styleTag);
        this._styleTag = styleTag;

        var hdr = document.createElement("div");
        hdr.className = "v3-header";
        this.headerEl = hdr;

        var dot = document.createElement("div");
        dot.className = "v3-header-dot";

        var titleEl = document.createElement("span");
        titleEl.className = "v3-title";
        titleEl.textContent = "Assistente IA";
        this.titleEl = titleEl;

        var provPill = document.createElement("span");
        provPill.className = "v3-prov-pill";
        provPill.textContent = "TESS AI";
        this.provPill = provPill;

        var hdrRight = document.createElement("div");
        hdrRight.className = "v3-hdr-right";

        var clearBtn = document.createElement("button");
        clearBtn.className = "v3-hdr-btn";
        clearBtn.textContent = "🗑 Limpar";
        clearBtn.addEventListener("click", function() {
            self.messages = [{ role: "assistant", content: "Chat limpo. Como posso ajudar?" }];
            self._renderMessages();
        });
        hdrRight.appendChild(clearBtn);

        hdr.appendChild(dot);
        hdr.appendChild(titleEl);
        hdr.appendChild(provPill);
        hdr.appendChild(hdrRight);

        var msgArea = document.createElement("div");
        msgArea.className = "v3-messages";
        this.messagesContainer = msgArea;

        var ctxBar = document.createElement("div");
        ctxBar.className = "v3-ctx-bar";
        ctxBar.style.display = "none";
        var ctxLbl = document.createElement("span");
        ctxLbl.className = "v3-ctx-lbl";
        ctxLbl.textContent = "Contexto:";
        var ctxVal = document.createElement("span");
        ctxVal.className = "v3-ctx-val";
        ctxVal.textContent = "Sem dados — arraste campos ao visual";
        this.ctxValEl = ctxVal;
        ctxBar.appendChild(ctxLbl);
        ctxBar.appendChild(ctxVal);
        this.ctxBar = ctxBar;

        var inputArea = document.createElement("div");
        inputArea.className = "v3-input-area";
        this.inputAreaEl = inputArea;

        var ta = document.createElement("textarea");
        ta.rows = 1;
        ta.className = "v3-textarea";
        ta.placeholder = "Pergunte sobre os dados...";
        this.textarea = ta;

        var sendBtn = document.createElement("button");
        sendBtn.className = "v3-send-btn";
        sendBtn.textContent = "Enviar";
        this.sendBtn = sendBtn;

        ta.addEventListener("keydown", function(evt) {
            if (evt.key === "Enter" && !evt.shiftKey) {
                evt.preventDefault();
                self._send();
            }
        });
        ta.addEventListener("input", function() {
            ta.style.height = "auto";
            ta.style.height = Math.min(ta.scrollHeight, 80) + "px";
        });
        sendBtn.addEventListener("click", function() { self._send(); });

        inputArea.appendChild(ta);
        inputArea.appendChild(sendBtn);

        var noConfig = document.createElement("div");
        noConfig.className = "v3-no-config";
        noConfig.innerHTML = "⚙️<br><br>Configure a chave de API no painel lateral.<br><small>Abra o painel Formatar → Conexão</small>";
        this.noConfigEl = noConfig;

        this.container.appendChild(hdr);
        this.container.appendChild(msgArea);
        this.container.appendChild(ctxBar);
        this.container.appendChild(inputArea);
        this.container.appendChild(noConfig);
    };

    Visual.prototype._readSettings = function(dv) {
        var objs = dv && dv.metadata && dv.metadata.objects;
        var s = this.settings;

        function get(obj, prop, def) {
            if (!objs || !objs[obj] || objs[obj][prop] === undefined || objs[obj][prop] === null) {
                return def;
            }
            var val = objs[obj][prop];
            if (typeof val === "object" && val.solid && val.solid.color !== undefined) {
                return val.solid.color;
            }
            return val;
        }

        s.provider       = get("conexao", "provedor",       DEFAULTS.provider);
        s.apiKey         = get("conexao", "apiKey",         DEFAULTS.apiKey);
        s.agentId        = get("conexao", "agentId",        DEFAULTS.agentId);
        s.model          = get("conexao", "modelo",         DEFAULTS.model);
        s.modeloSugerido = get("conexao", "modeloSugerido", DEFAULTS.modeloSugerido);
        s.systemPromptText = get("conexao", "systemPrompt", DEFAULTS.systemPromptText);

        s.colorFundoHeader     = get("aparenciaChat", "corFundoHeader",     DEFAULTS.colorFundoHeader);
        s.colorTextoHeader     = get("aparenciaChat", "corTextoHeader",     DEFAULTS.colorTextoHeader);
        s.colorFundoChat       = get("aparenciaChat", "corFundoChat",       DEFAULTS.colorFundoChat);
        s.colorBolhaUsuario    = get("aparenciaChat", "corBolhaUsuario",    DEFAULTS.colorBolhaUsuario);
        s.colorBolhaAssistente = get("aparenciaChat", "corBolhaAssistente", DEFAULTS.colorBolhaAssistente);
        s.colorTextoBolha      = get("aparenciaChat", "corTextoBolha",      DEFAULTS.colorTextoBolha);
        s.colorFundoInput      = get("aparenciaChat", "corFundoInput",      DEFAULTS.colorFundoInput);
        s.colorBotaoEnviar     = get("aparenciaChat", "corBotaoEnviar",     DEFAULTS.colorBotaoEnviar);
        s.colorTextoBotao      = get("aparenciaChat", "corTextoBotao",      DEFAULTS.colorTextoBotao);

        s.fontFamily    = get("tipografia", "familiaFonte",          DEFAULTS.fontFamily);
        s.msgFontSize   = get("tipografia", "tamanhoFonteMensagens", DEFAULTS.msgFontSize);
        s.inputFontSize = get("tipografia", "tamanhoFonteInput",     DEFAULTS.inputFontSize);

        s.chatTitle        = get("layout", "tituloChat",       DEFAULTS.chatTitle);
        s.showTitle        = get("layout", "exibirTitulo",     DEFAULTS.showTitle);
        s.inputPlaceholder = get("layout", "placeholderInput", DEFAULTS.inputPlaceholder);
        s.sendBtnText      = get("layout", "textoBotaoEnviar", DEFAULTS.sendBtnText);
        s.showDebugContext = get("layout", "debugExibirContexto", DEFAULTS.showDebugContext);
    };

    Visual.prototype._applySettings = function() {
        var s = this.settings;

        var ff = FONT_MAP[s.fontFamily] || FONT_MAP["Inter"];
        this.container.style.fontFamily = ff;

        if (this._styleTag) {
            this._styleTag.textContent = [
                ".aiChatV3 .v3-messages .msg { font-size:" + Math.max(10, Math.min(20, s.msgFontSize || 13)) + "px; }",
                ".aiChatV3 .v3-messages .msg.user { background:" + s.colorBolhaUsuario + " !important; color:" + s.colorTextoBolha + " !important; }",
                ".aiChatV3 .v3-messages .msg.assistant { background:" + s.colorBolhaAssistente + " !important; color:" + s.colorTextoBolha + " !important; }"
            ].join("\n");
        }

        if (this.headerEl) {
            this.headerEl.style.background = s.colorFundoHeader;
            this.headerEl.style.color = s.colorTextoHeader;
        }
        if (this.titleEl) {
            this.titleEl.style.color = s.colorTextoHeader;
            this.titleEl.style.display = (s.showTitle === false) ? "none" : "";
            this.titleEl.textContent = s.chatTitle || "Assistente IA";
        }
        if (this.provPill) {
            this.provPill.textContent = PROV_LABELS[s.provider] || s.provider || "IA";
        }

        if (this.messagesContainer) {
            this.messagesContainer.style.background = s.colorFundoChat;
        }

        if (this.ctxBar) {
            this.ctxBar.style.display = s.showDebugContext ? "" : "none";
        }

        if (this.textarea) {
            this.textarea.style.fontSize = Math.max(10, Math.min(18, s.inputFontSize || 12)) + "px";
            this.textarea.style.background = s.colorFundoInput;
            this.textarea.placeholder = s.inputPlaceholder || "Pergunte sobre os dados...";
        }

        if (this.sendBtn) {
            this.sendBtn.style.background = s.colorBotaoEnviar;
            this.sendBtn.style.color = s.colorTextoBotao;
            this.sendBtn.textContent = s.sendBtnText || "Enviar";
        }

        var configured = !!(s.apiKey && s.apiKey.trim());
        if (s.provider === "tess" && !(s.agentId && s.agentId.trim())) configured = false;

        if (this.messagesContainer) this.messagesContainer.style.display = configured ? "" : "none";
        if (this.inputAreaEl)       this.inputAreaEl.style.display       = configured ? "" : "none";
        if (this.noConfigEl)        this.noConfigEl.style.display        = configured ? "none" : "";
    };

    Visual.prototype._renderMessages = function() {
        if (!this.messagesContainer) return;
        var self = this;
        while (this.messagesContainer.firstChild) {
            this.messagesContainer.removeChild(this.messagesContainer.firstChild);
        }
        this.messages.forEach(function(msg) {
            var el = document.createElement("div");
            el.className = "msg " + msg.role;
            if (msg.role === "thinking") {
                el.appendChild(document.createTextNode("Consultando"));
                var dots = document.createElement("span");
                dots.className = "dots";
                dots.textContent = "...";
                el.appendChild(dots);
            } else if (msg.role === "assistant") {
                el.innerHTML = _parseMarkdown(msg.content);
            } else {
                el.textContent = msg.content;
            }
            self.messagesContainer.appendChild(el);
        });
        this.messagesContainer.scrollTop = this.messagesContainer.scrollHeight;
    };

    Visual.prototype._effectiveModel = function() {
        var s = this.settings;
        var custom = (s.model || "").trim();
        return custom || s.modeloSugerido || "tess-5";
    };

    Visual.prototype._buildContextParts = function() {
        var parts = [];
        if (this.context.measures.length > 0) {
            parts.push("📊 " + this.context.measures.map(function(m) { return m.name + ": " + m.value; }).join(" · "));
        }
        for (var i = 0; i < this.context.categories.length; i++) {
            parts.push("🏷 " + this.context.categories[i].name + " (" + this.context.categories[i].values.length + " itens)");
        }
        for (var j = 0; j < this.context.dates.length; j++) {
            parts.push("📅 " + this.context.dates[j].name + " (" + this.context.dates[j].values.length + " datas)");
        }
        return parts.join("  |  ");
    };

    Visual.prototype._buildSystemPrompt = function() {
        var s = this.settings;
        var parts = [];
        if (this.context.measures.length > 0) {
            parts.push(this.context.measures.map(function(m) { return m.name + ": " + m.value; }).join(" | "));
        }
        for (var i = 0; i < this.context.categories.length; i++) {
            parts.push(this.context.categories[i].name + ": " + this.context.categories[i].values.slice(0, 50).join(", "));
        }
        for (var j = 0; j < this.context.dates.length; j++) {
            parts.push(this.context.dates[j].name + ": " + this.context.dates[j].values.slice(0, 50).join(", "));
        }
        var ctx = parts.join("\n");

        var base = (this.context.systemPromptFromMeasure && this.context.systemPromptFromMeasure.trim())
            ? this.context.systemPromptFromMeasure.trim()
            : (s.systemPromptText && s.systemPromptText.trim())
                ? s.systemPromptText.trim()
                : "Você é um assistente de análise de dados para Power BI. Responda em português, de forma concisa e orientada a negócios.";

        if (ctx) {
            return base + "\n\nCONTEXTO DO RELATÓRIO:\n" + ctx + "\n\nBaseie suas respostas nestes valores.";
        }
        return base + "\n\nNenhum dado conectado ao visual.";
    };

    Visual.prototype._send = function() {
        var self = this;
        if (!this.textarea || this.isLoading) return;
        var text = this.textarea.value.trim();
        if (!text) return;

        var s = this.settings;
        if (!s.apiKey || !s.apiKey.trim()) {
            this.messages.push({ role: "error", content: "Configure a chave de API no painel lateral." });
            this._renderMessages();
            return;
        }

        this.textarea.value = "";
        this.textarea.style.height = "auto";
        this.messages.push({ role: "user", content: text });
        this.messages.push({ role: "thinking", content: "" });
        this._renderMessages();
        this.isLoading = true;
        if (this.sendBtn) this.sendBtn.disabled = true;

        var apiMessages = this.messages
            .filter(function(m) { return m.role === "user" || m.role === "assistant"; })
            .map(function(m) { return { role: m.role, content: m.content }; });

        this._callAPI(apiMessages).then(function(reply) {
            self.messages = self.messages.filter(function(m) { return m.role !== "thinking"; });
            self.messages.push({ role: "assistant", content: reply });
        }).catch(function(err) {
            self.messages = self.messages.filter(function(m) { return m.role !== "thinking"; });
            var detail = (err && err.message) ? err.message : "Erro ao consultar a IA. Verifique as configurações.";
            self.messages.push({ role: "error", content: detail });
        }).then(function() {
            self.isLoading = false;
            if (self.sendBtn) self.sendBtn.disabled = false;
            self._renderMessages();
            if (self.textarea) self.textarea.focus();
        });
    };

    Visual.prototype._callAPI = function(messages) {
        var s = this.settings;
        var sys = this._buildSystemPrompt();
        if (s.provider === "tess")      return this._callTess(messages, sys);
        if (s.provider === "anthropic") return this._callAnthropic(messages, sys);
        if (s.provider === "openai")    return this._callOpenAI(messages, sys);
        if (s.provider === "gemini")    return this._callGemini(messages, sys);
        return Promise.reject(new Error("Provedor desconhecido: " + s.provider));
    };

    // ── TESS (direct) ─────────────────────────────────────────
    Visual.prototype._callTess = function(messages, systemPrompt) {
        var self = this;
        var s = this.settings;
        var agentId = s.agentId;
        if (!agentId) throw new Error("ID do Agente TESS não configurado.");

        var cleaned = [];
        var foundUser = false;
        for (var i = 0; i < messages.length; i++) {
            var m = messages[i];
            if (!foundUser && m.role !== "user") continue;
            foundUser = true;
            if (m.role === "user" || m.role === "assistant") cleaned.push(m);
        }

        var builtMessages = cleaned.map(function(m, idx) {
            if (idx === 0 && m.role === "user" && systemPrompt) {
                return { role: "user", content: systemPrompt + "\n\n---\n" + m.content };
            }
            return { role: m.role, content: m.content };
        });

        if (builtMessages.length === 0) {
            return Promise.reject(new Error("Nenhuma mensagem de usuário para enviar"));
        }

        var endpoint = "https://api.tess.im/agents/" + agentId + "/execute?wait_execution=true";
        var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + s.apiKey };

        return fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: self._effectiveModel(),
                temperature: "1",
                messages: builtMessages,
                tools: "no-tools"
            })
        }).then(function(r) {
            if (!r.ok) {
                return r.json().catch(function() { return {}; }).then(function(err) {
                    var msg = (err && (err.message || (err.error && (typeof err.error === "string" ? err.error : err.error.message)) || (err.errors && JSON.stringify(err.errors)))) || ("Erro HTTP " + r.status);
                    throw new Error(msg);
                });
            }
            return r.json();
        }).then(function(data) {
            var first = data && data.responses && data.responses[0];
            if (!first) throw new Error("Resposta inválida da TESS");
            if (first.status === "succeeded") return first.output || "";
            if (first.id) return self._pollTess(first.id, 0);
            throw new Error("Status inesperado: " + first.status);
        });
    };

    Visual.prototype._pollTess = function(responseId, attempt) {
        var self = this;
        var s = this.settings;
        if (attempt >= 30) return Promise.reject(new Error("Tempo esgotado aguardando resposta da TESS"));
        var pollUrl = "https://api.tess.im/agent-responses/" + responseId;
        var pollHeaders = { "Content-Type": "application/json", "Authorization": "Bearer " + s.apiKey };
        return new Promise(function(resolve) { setTimeout(resolve, 2000); })
            .then(function() { return fetch(pollUrl, { headers: pollHeaders }); })
            .then(function(res) {
                if (!res.ok) throw new Error("Polling falhou: " + res.status);
                return res.json();
            })
            .then(function(data) {
                var r = (data && data.responses && data.responses[0]) || data;
                if (r.status === "succeeded") return r.output || "";
                if (r.status === "failed") throw new Error("TESS retornou erro no processamento");
                return self._pollTess(responseId, attempt + 1);
            });
    };

    // ── Anthropic (direct) ────────────────────────────────────
    Visual.prototype._callAnthropic = function(messages, systemPrompt) {
        var s = this.settings;
        var endpoint = "https://api.anthropic.com/v1/messages";
        var headers = {
            "Content-Type": "application/json",
            "x-api-key": s.apiKey,
            "anthropic-version": "2023-06-01",
            "anthropic-dangerous-direct-browser-access": "true"
        };
        return fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ model: this._effectiveModel(), max_tokens: 1024, system: systemPrompt, messages: messages })
        })
        .then(function(r) {
            if (!r.ok) return r.json().catch(function() { return {}; }).then(function(e) { throw new Error((e && e.error && e.error.message) || ("Erro " + r.status)); });
            return r.json();
        })
        .then(function(d) { return (d && d.content && d.content[0] && d.content[0].text) || ""; });
    };

    // ── OpenAI (direct) ───────────────────────────────────────
    Visual.prototype._callOpenAI = function(messages, systemPrompt) {
        var s = this.settings;
        var msgs = [{ role: "system", content: systemPrompt }].concat(messages);
        var endpoint = "https://api.openai.com/v1/chat/completions";
        var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + s.apiKey };
        return fetch(endpoint, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ model: this._effectiveModel(), messages: msgs, max_tokens: 1024 })
        })
        .then(function(r) {
            if (!r.ok) return r.json().catch(function() { return {}; }).then(function(e) { throw new Error((e && e.error && e.error.message) || ("Erro " + r.status)); });
            return r.json();
        })
        .then(function(d) { return (d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content) || ""; });
    };

    // ── Gemini (direct) ───────────────────────────────────────
    Visual.prototype._callGemini = function(messages, systemPrompt) {
        var self = this;
        var s = this.settings;
        var endpoint = "https://generativelanguage.googleapis.com/v1beta/models/" + self._effectiveModel() + ":generateContent?key=" + s.apiKey;
        var contents = messages.map(function(m) {
            return { role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] };
        });
        return fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                system_instruction: { parts: [{ text: systemPrompt }] },
                contents: contents,
                generationConfig: { maxOutputTokens: 1024 }
            })
        })
        .then(function(r) {
            if (!r.ok) return r.json().catch(function() { return {}; }).then(function(e) { throw new Error((e && e.error && e.error.message) || ("Erro " + r.status)); });
            return r.json();
        })
        .then(function(d) {
            return (d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts && d.candidates[0].content.parts[0] && d.candidates[0].content.parts[0].text) || "";
        });
    };

    Visual.prototype.update = function(options) {
        var dvs = options.dataViews;

        if (dvs && dvs.length > 0) {
            this._readSettings(dvs[0]);
        }

        this.context = { measures: [], categories: [], dates: [], systemPromptFromMeasure: "" };

        if (dvs && dvs.length > 0) {
            var dv = dvs[0];
            if (dv.categorical) {
                var cat = dv.categorical;

                if (cat.categories) {
                    for (var i = 0; i < cat.categories.length; i++) {
                        var c = cat.categories[i];
                        var roles = c.source.roles || {};
                        var vals = [];
                        var seen = {};
                        for (var vi = 0; vi < (c.values || []).length; vi++) {
                            var sv = c.values[vi] != null ? String(c.values[vi]) : "";
                            if (sv && !seen[sv]) { seen[sv] = true; vals.push(sv); }
                            if (vals.length >= 200) break;
                        }
                        if (roles.date) {
                            this.context.dates.push({ name: c.source.displayName, values: vals });
                        } else {
                            this.context.categories.push({ name: c.source.displayName, values: vals });
                        }
                    }
                }

                if (cat.values) {
                    for (var j = 0; j < cat.values.length; j++) {
                        var v = cat.values[j];
                        var vroles = v.source.roles || {};

                        if (vroles.systemPrompt) {
                            var spVal = (v.values || []).find(function(x) { return x != null; });
                            if (spVal != null) {
                                this.context.systemPromptFromMeasure = String(spVal);
                            }
                        } else if (v.source.isMeasure) {
                            var nums = (v.values || []).filter(function(x) { return x != null && typeof x === "number"; });
                            var avg = nums.length > 0
                                ? (nums.reduce(function(a, b) { return a + b; }, 0) / nums.length).toLocaleString("pt-BR", { maximumFractionDigits: 2 })
                                : "N/A";
                            this.context.measures.push({ name: v.source.displayName, value: avg });
                        }
                    }
                }
            }
        }

        if (this.ctxValEl) {
            this.ctxValEl.textContent = this._buildContextParts() || "Sem dados — arraste campos ao visual";
        }

        this._applySettings();

        var configured = !!(this.settings.apiKey && this.settings.apiKey.trim());
        if (this.settings.provider === "tess" && !(this.settings.agentId && this.settings.agentId.trim())) configured = false;

        if (configured && !this._welcomeShown) {
            this._welcomeShown = true;
            var provName = PROV_LABELS[this.settings.provider] || this.settings.provider;
            this.messages = [{
                role: "assistant",
                content: "Olá! Sou o **" + (this.settings.chatTitle || "Assistente IA") + "** (" + provName + "). Posso analisar as medidas e dados conectados ao relatório. O que você quer explorar?"
            }];
            this._renderMessages();
        } else if (!configured) {
            this._welcomeShown = false;
        }
    };

    Visual.prototype.enumerateObjectInstances = function(options) {
        var s = this.settings;
        var props = {};

        switch (options.objectName) {
            case "conexao":
                props = {
                    provedor:        s.provider        || DEFAULTS.provider,
                    apiKey:          s.apiKey          || "",
                    agentId:         s.agentId         || "",
                    modelo:          s.model           || "",
                    modeloSugerido:  s.modeloSugerido  || DEFAULTS.modeloSugerido,
                    systemPrompt:    s.systemPromptText || ""
                };
                break;
            case "aparenciaChat":
                props = {
                    corFundoHeader:     { solid: { color: s.colorFundoHeader     || DEFAULTS.colorFundoHeader } },
                    corTextoHeader:     { solid: { color: s.colorTextoHeader     || DEFAULTS.colorTextoHeader } },
                    corFundoChat:       { solid: { color: s.colorFundoChat       || DEFAULTS.colorFundoChat } },
                    corBolhaUsuario:    { solid: { color: s.colorBolhaUsuario    || DEFAULTS.colorBolhaUsuario } },
                    corBolhaAssistente: { solid: { color: s.colorBolhaAssistente || DEFAULTS.colorBolhaAssistente } },
                    corTextoBolha:      { solid: { color: s.colorTextoBolha      || DEFAULTS.colorTextoBolha } },
                    corFundoInput:      { solid: { color: s.colorFundoInput      || DEFAULTS.colorFundoInput } },
                    corBotaoEnviar:     { solid: { color: s.colorBotaoEnviar     || DEFAULTS.colorBotaoEnviar } },
                    corTextoBotao:      { solid: { color: s.colorTextoBotao      || DEFAULTS.colorTextoBotao } }
                };
                break;
            case "tipografia":
                props = {
                    familiaFonte:          s.fontFamily    || DEFAULTS.fontFamily,
                    tamanhoFonteMensagens: s.msgFontSize   || DEFAULTS.msgFontSize,
                    tamanhoFonteInput:     s.inputFontSize || DEFAULTS.inputFontSize
                };
                break;
            case "layout":
                props = {
                    tituloChat:          s.chatTitle        || DEFAULTS.chatTitle,
                    exibirTitulo:        s.showTitle !== undefined ? s.showTitle : DEFAULTS.showTitle,
                    placeholderInput:    s.inputPlaceholder || DEFAULTS.inputPlaceholder,
                    textoBotaoEnviar:    s.sendBtnText      || DEFAULTS.sendBtnText,
                    debugExibirContexto: s.showDebugContext !== undefined ? s.showDebugContext : DEFAULTS.showDebugContext
                };
                break;
            default:
                return [];
        }

        return [{ objectName: options.objectName, properties: props, selector: null }];
    };

    Visual.prototype.destroy = function() {
        if (this._styleTag && this._styleTag.parentNode) {
            this._styleTag.parentNode.removeChild(this._styleTag);
        }
    };

    var _exports = {};
    (function() {
        var pbiviz = window.powerbi;
        var pluginDef = {
            name: GUID,
            displayName: "Power IA TESS V3",
            class: "Visual",
            apiVersion: "2.6.0",
            create: function(options) { return new Visual(options); },
            custom: true
        };
        if (typeof pbiviz !== "undefined") {
            pbiviz.visuals = pbiviz.visuals || {};
            pbiviz.visuals.plugins = pbiviz.visuals.plugins || {};
            pbiviz.visuals.plugins[GUID] = pluginDef;
        }
        _exports.default = pluginDef;
    })();

    PowerIATESSV3F1E2D3C4B5A6 = _exports;
})();
"""

# ─────────────────────────────────────────────────────────────
# Capabilities — v3.0 (proxy removed)
# ─────────────────────────────────────────────────────────────
CAPABILITIES = {
    "dataRoles": [
        {
            "name": "measure",
            "kind": "Measure",
            "displayName": "Medidas DAX",
            "description": "Medidas calculadas (ex: Total Vendas, GoldRate)"
        },
        {
            "name": "category",
            "kind": "Grouping",
            "displayName": "Dimensões (País, Categoria...)",
            "description": "Colunas de texto ou categorias"
        },
        {
            "name": "date",
            "kind": "Grouping",
            "displayName": "Datas / Períodos",
            "description": "Colunas de data, ano ou período"
        },
        {
            "name": "systemPrompt",
            "kind": "Measure",
            "displayName": "Prompt do Sistema (medida)",
            "description": "Medida DAX que retorna texto — substitui o System Prompt fixo. Ex: [MeuPrompt]"
        }
    ],
    "dataViewMappings": [
        {
            "conditions": [
                {
                    "measure":      {"max": 20},
                    "category":     {"max": 10},
                    "date":         {"max": 5},
                    "systemPrompt": {"max": 1}
                }
            ],
            "categorical": {
                "categories": {
                    "select": [
                        {"bind": {"to": "category"}},
                        {"bind": {"to": "date"}}
                    ],
                    "dataReductionAlgorithm": {"top": {"count": 200}}
                },
                "values": {
                    "select": [
                        {"bind": {"to": "measure"}},
                        {"bind": {"to": "systemPrompt"}}
                    ]
                }
            }
        }
    ],
    "objects": {
        "conexao": {
            "displayName": "Conexão",
            "properties": {
                "provedor": {
                    "displayName": "Provedor",
                    "type": {
                        "enumeration": [
                            {"value": "tess",      "displayName": "TESS AI"},
                            {"value": "anthropic", "displayName": "Anthropic"},
                            {"value": "openai",    "displayName": "OpenAI"},
                            {"value": "gemini",    "displayName": "Gemini"}
                        ]
                    }
                },
                "apiKey": {
                    "displayName": "Chave de API",
                    "type": {"text": True}
                },
                "agentId": {
                    "displayName": "ID do Agente (TESS)",
                    "type": {"text": True}
                },
                "modeloSugerido": {
                    "displayName": "Modelo sugerido",
                    "description": "Selecione um modelo pré-definido. O campo 'Modelo personalizado' tem prioridade se preenchido.",
                    "type": {
                        "enumeration": [
                            {"value": "tess-5",                    "displayName": "TESS AI: tess-5"},
                            {"value": "tess-4",                    "displayName": "TESS AI: tess-4"},
                            {"value": "tess-3",                    "displayName": "TESS AI: tess-3"},
                            {"value": "claude-sonnet-4-20250514",  "displayName": "Anthropic: claude-sonnet-4"},
                            {"value": "claude-haiku-4-5-20251001", "displayName": "Anthropic: claude-haiku-4-5"},
                            {"value": "claude-opus-4-5",           "displayName": "Anthropic: claude-opus-4-5"},
                            {"value": "gpt-4o",                    "displayName": "OpenAI: gpt-4o"},
                            {"value": "gpt-4o-mini",               "displayName": "OpenAI: gpt-4o-mini"},
                            {"value": "gpt-4-turbo",               "displayName": "OpenAI: gpt-4-turbo"},
                            {"value": "gpt-3.5-turbo",             "displayName": "OpenAI: gpt-3.5-turbo"},
                            {"value": "gemini-2.0-flash",          "displayName": "Gemini: gemini-2.0-flash"},
                            {"value": "gemini-1.5-pro",            "displayName": "Gemini: gemini-1.5-pro"},
                            {"value": "gemini-1.5-flash",          "displayName": "Gemini: gemini-1.5-flash"}
                        ]
                    }
                },
                "modelo": {
                    "displayName": "Modelo personalizado (sobrepõe o sugerido)",
                    "description": "Deixe vazio para usar o Modelo sugerido acima.",
                    "type": {"text": True}
                },
                "systemPrompt": {
                    "displayName": "Prompt do Sistema (texto ou medida)",
                    "description": "Texto fixo de instrução. Se conectar a medida 'Prompt do Sistema', ela tem prioridade.",
                    "type": {"text": True}
                }
            }
        },
        "aparenciaChat": {
            "displayName": "Aparência - Chat",
            "properties": {
                "corFundoHeader":     {"displayName": "Cor de fundo do cabeçalho",   "type": {"fill": {"solid": {"color": True}}}},
                "corTextoHeader":     {"displayName": "Cor do texto do cabeçalho",   "type": {"fill": {"solid": {"color": True}}}},
                "corFundoChat":       {"displayName": "Cor de fundo do chat",        "type": {"fill": {"solid": {"color": True}}}},
                "corBolhaUsuario":    {"displayName": "Cor das bolhas do usuário",   "type": {"fill": {"solid": {"color": True}}}},
                "corBolhaAssistente": {"displayName": "Cor das bolhas do assistente","type": {"fill": {"solid": {"color": True}}}},
                "corTextoBolha":      {"displayName": "Cor do texto das bolhas",     "type": {"fill": {"solid": {"color": True}}}},
                "corFundoInput":      {"displayName": "Cor de fundo do input",       "type": {"fill": {"solid": {"color": True}}}},
                "corBotaoEnviar":     {"displayName": "Cor do botão Enviar",         "type": {"fill": {"solid": {"color": True}}}},
                "corTextoBotao":      {"displayName": "Cor do texto do botão",       "type": {"fill": {"solid": {"color": True}}}}
            }
        },
        "tipografia": {
            "displayName": "Aparência - Tipografia",
            "properties": {
                "familiaFonte": {
                    "displayName": "Família da fonte",
                    "type": {
                        "enumeration": [
                            {"value": "Inter",    "displayName": "Inter"},
                            {"value": "Segoe UI", "displayName": "Segoe UI"},
                            {"value": "Arial",    "displayName": "Arial"},
                            {"value": "Roboto",   "displayName": "Roboto"}
                        ]
                    }
                },
                "tamanhoFonteMensagens": {"displayName": "Tamanho da fonte das mensagens", "type": {"numeric": True}},
                "tamanhoFonteInput":     {"displayName": "Tamanho da fonte do input",      "type": {"numeric": True}}
            }
        },
        "layout": {
            "displayName": "Aparência - Layout",
            "properties": {
                "tituloChat":       {"displayName": "Título do chat",       "type": {"text": True}},
                "exibirTitulo":     {"displayName": "Exibir título",        "type": {"bool": True}},
                "placeholderInput": {"displayName": "Placeholder do input", "type": {"text": True}},
                "textoBotaoEnviar": {"displayName": "Texto do botão Enviar","type": {"text": True}},
                "debugExibirContexto": {
                    "displayName": "Modo debug — exibir barra de contexto",
                    "description": "Exibe a barra com os dados do Power BI conectados. Útil para diagnóstico.",
                    "type": {"bool": True}
                }
            }
        }
    },
    "privileges": [
        {
            "name": "WebAccess",
            "essential": True,
            "parameters": [
                "https://api.tess.im",
                "https://api.anthropic.com",
                "https://api.openai.com",
                "https://generativelanguage.googleapis.com"
            ]
        }
    ],
    "supportsMultiVisualSelection": True
}

ICON_BASE64 = "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABQAAAAUCAYAAACNiR0NAAAAGXRFWHRTb2Z0d2FyZQBBZG9iZSBJbWFnZVJlYWR5ccllPAAAA2RpVFh0WE1MOmNvbS5hZG9iZS54bXAAAAAAADw/eHBhY2tldCBiZWdpbj0i77u/IiBpZD0iVzVNME1wQ2VoaUh6cmVTek5UY3prYzlkIj8+IDx4OnhtcG1ldGEgeG1sbnM6eD0iYWRvYmU6bnM6bWV0YS8iIHg6eG1wdGs9IkFkb2JlIFhNUCBDb3JlIDUuMC1jMDYwIDYxLjEzNDc3NywgMjAxMC8wMi8xMi0xNzozMjowMCAgICAgICAgIj4gPHJkZjpSREYgeG1sbnM6cmRmPSJodHRwOi8vd3d3LnczLm9yZy8xOTk5LzAyLzIyLXJkZi1zeW50YXgtbnMjIj4gPHJkZjpEZXNjcmlwdGlvbiByZGY6YWJvdXQ9IiIgeG1sbnM6eG1wTU09Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9tbS8iIHhtbG5zOnN0UmVmPSJodHRwOi8vbnMuYWRvYmUuY29tL3hhcC8xLjAvc1R5cGUvUmVzb3VyY2VSZWYjIiB4bWxuczp4bXA9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8iIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJGMzkxN0NBRDNFMDExQTcxQ0JFODI3ODBCQUE5RSIgeG1wTU06RG9jdW1lbnRJRD0ieG1wLmRpZDo3NEY1QjA1NUQ0OTAxMUUwQTgxREI2NjMxMkNEMUNEMyIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDo3NEY1QjA1NEQ0OTAxMUUwQTgxREI2NjMxMkNEMUNEMyIgeG1wOkNyZWF0b3JUb29sPSJBZG9iZSBQaG90b3Nob3AgQ1M1IFdpbmRvd3MiPiA8eG1wTU06RGVyaXZlZEZyb20gc3RSZWY6aW5zdGFuY2VJRD0ieG1wLmlpZDo5Mjk5RDU1ODBGRDRFMDExQTcxQ0JFODI3ODBCQUE5RSIgc3RSZWY6ZG9jdW1lbnRJRD0ieG1wLmRpZDpBOEJGMzkxN0NBRDNFMDExQTcxQ0JFODI3ODBCQUE5RSIvPiA8L3JkZjpEZXNjcmlwdGlvbj4gPC9yZGY6UkRGPiA8L3g6eG1wbWV0YT4gPD94cGFja2V0IGVuZD0iciI/PpDoNX0AAAI3SURBVHjarJRLSFVRFIY9t7SiRDGLoEEPCRJRaCSYkxCiFCXCF+LIMExQLkilgumgwkbdBuWDRC2EomhURCOjgagkXEgKLUKhidobM6H0+i34rxyPnuvEA5/rXPda/1l7739vJxKJxG3ls93+hEKhTILxJhgMftmsiPxdhHw4CfepeR8dCyjWwwB0kZy3iVgCoQ2ewnmXxhrBD7Cgr/ZQVA17fDRPw2UYhzK6G99IsBse6/0QNME+H8FT4EA/YiPqOgA1q4IMzBNuw6iKjkCpj+Av+AdnEEmD3bxfhzvuDk30HaEaLsEkXCO53rN+Bwg5qsvTuj/TjGYtx9nINhRmEx7AYWiFW7AXOuEcbPOUvIZ2mnrl+PkQUbNEh4QHNKUSDdsSBWEOlmxTEfvs26FL9Khe211if6Acgee+xo7xzMgBxfq9qPe3fgWBGN2lEnqtG9nExM7CV3jp3bDos2bKJB0nHFRxAxRpA/5CIXyHh5ABv6GZqd9dJ6iz2SjbxMMypGhJFtTlNzu3kK7xgDxpove8U66FK2A+s6nul5gVVMEL+Ak7lG/T+g9JcIOGar2CRUoogxMwpP/bLTJMB9bRhDbkk5bBUU0y3ES0xS04CBfN9RSHiY90vJK0BHaSzG9h2eejS3RJeVfdtrGzuGyd8CX7Yq6ExuCH63jaVMPkFOv6OibB6DKs2+VEQp+WYBoqERn2sVWWRNN0YurIfeL14U6YkpkLYCSG6e0yqdCxvKBLIm5FgAEAV0nKuwMYRUsAAAAASUVORK5CYII="


def build_pbiviz_json():
    visual_meta = {
        "name": GUID,
        "displayName": DISPLAY_NAME,
        "guid": GUID,
        "visualClassName": VISUAL_CLASS,
        "version": VERSION,
        "description": "Chatbox com IA para Power BI — v3.0: chamada direta às APIs (sem proxy)",
        "supportUrl": "https://tess.im",
        "gitHubUrl": ""
    }
    pbiviz = {
        "visual": visual_meta,
        "author": {"name": "Power IA TESS", "email": "admin@example.com"},
        "apiVersion": API_VERSION,
        "style": "style/visual.less",
        "stringResources": {},
        "capabilities": CAPABILITIES,
        "content": {
            "js": JS,
            "css": CSS,
            "iconBase64": ICON_BASE64
        },
        "visualEntryPoint": "",
        "externalJS": [],
        "assets": {"icon": "assets/icon.png"}
    }
    return json.dumps(pbiviz, ensure_ascii=False, separators=(',', ':'))


def build_package_json():
    resource_file = f"resources/{GUID}.pbiviz.json"
    pkg = {
        "version": VERSION,
        "author": {"name": "Power IA TESS", "email": "admin@example.com"},
        "resources": [
            {"resourceId": "rId0", "sourceType": 5, "file": resource_file}
        ],
        "visual": {
            "name": GUID,
            "displayName": DISPLAY_NAME,
            "guid": GUID,
            "visualClassName": VISUAL_CLASS,
            "version": VERSION,
            "description": "Chatbox com IA para Power BI — v3.0 (sem proxy)",
            "supportUrl": "https://tess.im",
            "gitHubUrl": ""
        },
        "metadata": {"pbivizjson": {"resourceId": "rId0"}}
    }
    return json.dumps(pkg, indent="\t", ensure_ascii=False)


def main():
    output_dir  = os.path.dirname(os.path.abspath(__file__))
    output_path = os.path.join(output_dir, "Power_IA_TESS_v3.pbiviz")

    pbiviz_json_content  = build_pbiviz_json()
    package_json_content = build_package_json()
    resource_name        = f"resources/{GUID}.pbiviz.json"

    print(f"Building {output_path}...")
    print(f"  GUID        : {GUID}")
    print(f"  version     : {VERSION}")
    print(f"  apiVersion  : {API_VERSION}")
    print(f"  JS length   : {len(JS):,} chars")
    print(f"  CSS length  : {len(CSS):,} chars")
    print(f"  pbiviz.json : {len(pbiviz_json_content):,} bytes")

    with zipfile.ZipFile(output_path, "w", zipfile.ZIP_DEFLATED) as zf:
        zf.writestr("package.json", package_json_content)
        zf.writestr(resource_name, pbiviz_json_content)

    size = os.path.getsize(output_path)
    print(f"  Output size : {size:,} bytes")
    print(f"\nDone! -> {output_path}")

    print("\nVerifying ZIP contents:")
    with zipfile.ZipFile(output_path, "r") as zf:
        for info in zf.infolist():
            print(f"  {info.filename}  ({info.file_size:,} bytes uncompressed)")


if __name__ == "__main__":
    main()
