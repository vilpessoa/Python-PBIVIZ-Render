export type VEMessage =
  | { type: 'python:locate'; loc: string; clientX: number; clientY: number }
  | { type: 'python:cursorAt'; offset: number };

// Overlay script injected into the iframe when Visual Edits is active.
// Starts enabled immediately (only embedded when VE is on),
// eliminating the race condition with postMessage timing.
export const VE_OVERLAY_SCRIPT = `
<script>
(function() {
  var _active = null;

  function findLoc(el) {
    var cur = el;
    while (cur && cur !== document.body) {
      var loc = cur.getAttribute && cur.getAttribute('data-py-loc');
      if (loc) return { el: cur, loc: loc };
      cur = cur.parentElement;
    }
    return null;
  }

  function applyStyle(el, style) {
    if (!el) return;
    Object.assign(el.style, style);
  }

  function clearActive() {
    if (_active) {
      applyStyle(_active, { outline: '', outlineOffset: '', cursor: '' });
      _active = null;
    }
  }

  function setActive(el) {
    clearActive();
    if (el) {
      applyStyle(el, { outline: '2px solid rgba(249,115,22,0.85)', outlineOffset: '1px', cursor: 'pointer' });
      _active = el;
    }
  }

  document.addEventListener('mouseover', function(e) {
    var found = findLoc(e.target);
    if (found && found.el !== _active) {
      applyStyle(found.el, { outline: '2px solid rgba(59,130,246,0.8)', outlineOffset: '1px', cursor: 'pointer' });
    }
  });

  document.addEventListener('mouseout', function(e) {
    var found = findLoc(e.target);
    if (found && found.el !== _active) {
      applyStyle(found.el, { outline: '', outlineOffset: '', cursor: '' });
    }
  });

  document.addEventListener('click', function(e) {
    var found = findLoc(e.target);
    if (!found) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(found.el);
    window.parent.postMessage({ type: 'python:locate', loc: found.loc, clientX: e.clientX, clientY: e.clientY }, '*');
  });

  window.addEventListener('message', function(e) {
    var d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'python:cursorAt') {
      var offset = d.offset;
      var els = document.querySelectorAll('[data-py-loc]');
      var best = null;
      var bestSize = Infinity;
      els.forEach(function(el) {
        var loc = el.getAttribute('data-py-loc');
        if (!loc) return;
        var parts = loc.split('-');
        if (parts.length < 2) return;
        var start = parseInt(parts[0], 10);
        var end = parseInt(parts[1], 10);
        if (offset >= start && offset <= end) {
          var size = end - start;
          if (size < bestSize) { bestSize = size; best = el; }
        }
      });
      if (best) {
        setActive(best);
        try { best.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); } catch(_) {}
      } else {
        clearActive();
      }
    }
  });
})();
</script>`;
