export type VEMessage =
  | { type: 'python:locate'; loc: string; clientX: number; clientY: number }
  | { type: 'python:cursorAt'; offset: number };

// Overlay script injected into the iframe when Visual Edits is active.
// Uses CSS attribute classes (with !important) to override any user CSS —
// same approach as the working DAX-HTML-Render implementation.
export const VE_OVERLAY_SCRIPT = `
<style id="py-ve-style">
  [data-py-ve-hover] { outline: 2px solid #3B82F6 !important; outline-offset: -2px !important; cursor: pointer !important; }
  [data-py-ve-active] { outline: 2px solid #F97316 !important; outline-offset: -2px !important; }
</style>
<script>
(function(){
  var lastHover = null;
  var lastActive = null;
  function clearHover(){
    if(lastHover){ lastHover.removeAttribute('data-py-ve-hover'); lastHover=null; }
  }
  function clearActive(){
    if(lastActive){ lastActive.removeAttribute('data-py-ve-active'); lastActive=null; }
  }
  function findLoc(el){
    while(el && el!==document.body){
      if(el.getAttribute && el.getAttribute('data-py-loc')) return el;
      el=el.parentNode;
    }
    return null;
  }
  document.addEventListener('mouseover',function(e){
    var el=findLoc(e.target);
    if(el===lastHover) return;
    clearHover();
    if(el){ el.setAttribute('data-py-ve-hover',''); lastHover=el; }
  },true);
  document.addEventListener('mouseout',function(){ clearHover(); },true);
  document.addEventListener('click',function(e){
    var el=findLoc(e.target);
    if(!el) return;
    e.preventDefault(); e.stopPropagation();
    parent.postMessage({
      type:'python:locate',
      loc:el.getAttribute('data-py-loc'),
      clientX:e.clientX,
      clientY:e.clientY
    },'*');
  },true);
  window.addEventListener('message',function(e){
    var d=e.data||{};
    if(d.type==='python:cursorAt'){
      var off=d.offset|0;
      var nodes=document.querySelectorAll('[data-py-loc]');
      var best=null,bestLen=Infinity;
      for(var i=0;i<nodes.length;i++){
        var loc=nodes[i].getAttribute('data-py-loc')||'';
        var parts=loc.split('-');
        var s=parts[0]|0,end=parts[1]|0;
        if(off>=s && off<=end){
          var len=end-s;
          if(len<bestLen){ best=nodes[i]; bestLen=len; }
        }
      }
      if(best===lastActive) return;
      clearActive();
      if(best){
        best.setAttribute('data-py-ve-active','');
        lastActive=best;
        try{best.scrollIntoView({block:'nearest',behavior:'smooth'});}catch(_){}
      }
    }
  });
})();
</script>`;
