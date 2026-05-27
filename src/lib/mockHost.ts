// Returns a string that, when evaluated inside the preview iframe,
// installs window.powerbi.visuals.plugins and provides buildHost() for IVisualHost.
export const MOCK_HOST_SCRIPT = `
(function() {
  if (!window.powerbi) window.powerbi = {};
  if (!window.powerbi.visuals) window.powerbi.visuals = {};
  if (!window.powerbi.visuals.plugins) window.powerbi.visuals.plugins = {};

  var PALETTE = ["#118DFF","#12239E","#E66C37","#6B007B","#E044A7","#744EC2","#D9B300","#D64550"];

  function noop() {}
  function makeSelectionIdBuilder() {
    var b = {};
    b.withCategory = function() { return b; };
    b.withMeasure = function() { return b; };
    b.withSeries = function() { return b; };
    b.createSelectionId = function() { return {}; };
    return b;
  }
  function makeSelectionManager() {
    return {
      select: function() { return Promise.resolve([]); },
      hasSelection: function() { return false; },
      clear: function() { return Promise.resolve(); },
      showContextMenu: function() { return Promise.resolve(); },
      getSelectionIds: function() { return []; },
      registerOnSelectCallback: noop,
    };
  }
  function makeColorPalette() {
    var i = 0, used = {};
    return {
      getColor: function(key) {
        if (used[key]) return used[key];
        var c = PALETTE[i++ % PALETTE.length];
        used[key] = { value: c };
        return used[key];
      },
      reset: function() { i = 0; used = {}; return this; },
      isHighContrast: false,
    };
  }
  function makeTooltipService() {
    return { show: noop, hide: noop, move: noop, enabled: function() { return false; } };
  }
  function makeEventService() {
    return {
      renderingStarted: noop, renderingFinished: noop, renderingFailed: noop,
    };
  }

  window.__buildMockHost = function() {
    return {
      createSelectionIdBuilder: makeSelectionIdBuilder,
      createSelectionManager: makeSelectionManager,
      colorPalette: makeColorPalette(),
      tooltipService: makeTooltipService(),
      eventService: makeEventService(),
      persistProperties: noop,
      applyJsonFilter: noop,
      launchUrl: function(u) { try { window.open(u, "_blank"); } catch(e){} },
      locale: "pt-BR",
      allowInteractions: true,
      hostCapabilities: { allowInteractions: true },
      instanceId: "mock-instance",
      refreshHostData: noop,
      displayWarningIcon: noop,
      fetchMoreData: function() { return false; },
      switchFocusModeState: noop,
      authenticationService: { getAADToken: function() { return Promise.resolve(""); } },
      createLocalizationManager: function() {
        return { getDisplayName: function(k) { return k; } };
      },
    };
  };
})();
`;
