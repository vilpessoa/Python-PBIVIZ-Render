export interface VELocateTokens {
  tag: string;
  id: string;
  classes: string[];
  text: string;
  attrs: Array<{ name: string; value: string }>;
}

export type VEMessage =
  | { type: 'python:locate'; tokens: VELocateTokens; clientX: number; clientY: number }
  | { type: 'python:cursorAt'; offset: number };

// Overlay script injected into the iframe when Visual Edits is active.
// Hover destaca qualquer elemento; clique envia uma assinatura de tokens
// (tag, id, classes, texto, atributos) ao parent para que ele procure
// correspondências no código-fonte Python.
export const VE_OVERLAY_SCRIPT = `
<style id="py-ve-style">
  [data-py-ve-hover] { outline: 2px solid #3B82F6 !important; outline-offset: -2px !important; cursor: pointer !important; }
  [data-py-ve-active] { outline: 2px solid #F97316 !important; outline-offset: -2px !important; }
</style>
<script>
(function(){
  var lastHover = null;
  var lastActive = null;
  function clearHover(){ if(lastHover){ try{lastHover.removeAttribute('data-py-ve-hover');}catch(_){ } lastHover=null; } }
  function clearActive(){ if(lastActive){ try{lastActive.removeAttribute('data-py-ve-active');}catch(_){ } lastActive=null; } }
  function isElement(n){ return n && n.nodeType===1 && n.tagName; }

  document.addEventListener('mouseover',function(e){
    var el=e.target;
    if(!isElement(el)) return;
    if(el===document.body || el===document.documentElement) return;
    if(el===lastHover) return;
    clearHover();
    try{ el.setAttribute('data-py-ve-hover',''); lastHover=el; }catch(_){ }
  },true);
  document.addEventListener('mouseout',function(){ clearHover(); },true);

  document.addEventListener('click',function(e){
    var el=e.target;
    if(!isElement(el)) return;
    e.preventDefault(); e.stopPropagation();
    clearActive();
    try{ el.setAttribute('data-py-ve-active',''); lastActive=el; }catch(_){ }

    var tag = (el.tagName||'').toLowerCase();
    var id = el.id || '';
    var classes = [];
    if(el.classList){ for(var i=0;i<el.classList.length;i++) classes.push(el.classList[i]); }
    var text = (el.textContent||'').replace(/\\s+/g,' ').trim().slice(0,80);
    var attrs = [];
    if(el.attributes){
      for(var j=0;j<el.attributes.length;j++){
        var a=el.attributes[j];
        if(a.name==='class'||a.name==='id'||a.name==='style') continue;
        if(a.name.indexOf('data-py-')===0) continue;
        var v=String(a.value||'');
        if(!v) continue;
        attrs.push({name:a.name, value:v.slice(0,60)});
      }
    }
    parent.postMessage({
      type:'python:locate',
      tokens:{tag:tag,id:id,classes:classes,text:text,attrs:attrs},
      clientX:e.clientX,
      clientY:e.clientY
    },'*');
  },true);
})();
</script>`;
