export type VEMessage =
  | { type: 'python:locate'; loc: string; clientX: number; clientY: number }
  | { type: 'python:setMode'; enabled: boolean }
  | { type: 'python:cursorAt'; offset: number };

export const VE_OVERLAY_SCRIPT = `
<script>
(function() {
  let _enabled = false;
  let _cursorOffset = -1;
  let _active = null;

  function findLoc(el) {
    let cur = el;
    while (cur && cur !== document.body) {
      const loc = cur.getAttribute && cur.getAttribute('data-py-loc');
      if (loc) return { el: cur, loc };
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
      applyStyle(_active, { outline: '', outlineOffset: '' });
      _active = null;
    }
  }

  function setActive(el) {
    clearActive();
    if (el) {
      applyStyle(el, { outline: '2px solid rgba(249,115,22,0.85)', outlineOffset: '1px' });
      _active = el;
    }
  }

  document.addEventListener('mouseover', function(e) {
    if (!_enabled) return;
    const found = findLoc(e.target);
    if (found) applyStyle(found.el, { outline: '2px solid rgba(59,130,246,0.8)', outlineOffset: '1px' });
  });

  document.addEventListener('mouseout', function(e) {
    if (!_enabled) return;
    const found = findLoc(e.target);
    if (found && found.el !== _active) applyStyle(found.el, { outline: '', outlineOffset: '' });
  });

  document.addEventListener('click', function(e) {
    if (!_enabled) return;
    const found = findLoc(e.target);
    if (!found) return;
    e.preventDefault();
    e.stopPropagation();
    setActive(found.el);
    window.parent.postMessage({ type: 'python:locate', loc: found.loc, clientX: e.clientX, clientY: e.clientY }, '*');
  });

  window.addEventListener('message', function(e) {
    const d = e.data;
    if (!d || typeof d !== 'object') return;
    if (d.type === 'python:setMode') {
      _enabled = d.enabled;
      if (!_enabled) clearActive();
    } else if (d.type === 'python:cursorAt') {
      _cursorOffset = d.offset;
      if (!_enabled) return;
      const els = document.querySelectorAll('[data-py-loc]');
      let best = null;
      let bestSize = Infinity;
      els.forEach(function(el) {
        const loc = el.getAttribute('data-py-loc');
        if (!loc) return;
        const parts = loc.split('-');
        if (parts.length < 2) return;
        const start = parseInt(parts[0], 10);
        const end = parseInt(parts[1], 10);
        if (_cursorOffset >= start && _cursorOffset <= end) {
          const size = end - start;
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
