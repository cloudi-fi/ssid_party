/* ---------- state in the URL hash, events, startup ---------- */
let STATE={...DEF}, VIEW="comic";
function readHash(){
  const h=new URLSearchParams(location.hash.slice(1));
  STATE={...DEF};
  legacyHash(h);
  for(const k in CHOICES){ const v=h.get(k); if(v && CHOICES[k].opts.some(o=>o.v===v)) STATE[k]=v; }
  normalize(STATE);
  let v=h.get("view"); if(v==="branches") v="decision";
  VIEW=["comic","sequence","decision","criteria"].includes(v)?v:"comic";
  // view toggles, kept only in the views that show their button
  document.body.classList.toggle("wide",h.get("fullwidth")==="1"&&(VIEW==="sequence"||VIEW==="decision"));
  document.body.classList.toggle("crit",h.get("showcriteria")==="1"&&(VIEW==="sequence"||VIEW==="decision"));
}
function writeHash(){
  const h=new URLSearchParams();
  if(VIEW!=="comic") h.set("view",VIEW);
  if(document.body.classList.contains("wide")&&(VIEW==="sequence"||VIEW==="decision")) h.set("fullwidth","1");
  if(document.body.classList.contains("crit")&&(VIEW==="sequence"||VIEW==="decision")) h.set("showcriteria","1");
  for(const k in CHOICES) if(STATE[k]!==DEF[k]) h.set(k,STATE[k]);
  const s=h.toString();
  try{ history.replaceState(null,"",s?"#"+s:location.pathname+location.search); }catch(e){}
}

function render(anchorKey,oldTop){
  document.querySelectorAll(".viewtab").forEach(b=>b.setAttribute("aria-selected",b.dataset.view===VIEW));
  ["comic","sequence","decision","criteria"].forEach(v=>document.getElementById(v).hidden=(v!==VIEW));
  const wbtn=document.getElementById("widebtn"); if(wbtn){ const w=VIEW==="decision"||VIEW==="sequence"; wbtn.hidden=!w; if(!w) document.body.classList.remove("wide"); wbtn.setAttribute("aria-pressed",document.body.classList.contains("wide")); }
  const cbtn=document.getElementById("critbtn"); if(cbtn){ const c=VIEW==="sequence"||VIEW==="decision"; cbtn.hidden=!c; if(!c) document.body.classList.remove("crit"); cbtn.setAttribute("aria-pressed",document.body.classList.contains("crit")); }
  if(VIEW==="comic") renderComic(); else if(VIEW==="sequence") renderSeq(); else if(VIEW==="decision") renderDecision(); else renderCriteria();
  if(anchorKey!=null && oldTop!=null && VIEW==="comic"){
    const el=document.querySelector(`#comic [data-choice="${anchorKey}"]`);
    if(el) window.scrollBy(0, el.getBoundingClientRect().top-oldTop);
  }
}
function choose(opt){
  const set=opt.getAttribute("data-set");
  const host=opt.closest("[data-choice]"), top=host?host.getBoundingClientRect().top:null;
  const box=document.querySelector(`#${VIEW} .seqscroll`), sl=box?box.scrollLeft:0, stp=box?box.scrollTop:0;
  const wx=window.scrollX, wy=window.scrollY;
  let key=null;
  if(set){ Object.assign(STATE,JSON.parse(set)); }
  else { key=opt.getAttribute("data-k"); STATE[key]=opt.getAttribute("data-v"); }
  normalize(STATE); writeHash(); render(key,top);
  if(VIEW!=="comic"){ const nb=document.querySelector(`#${VIEW} .seqscroll`); if(nb){ nb.scrollLeft=sl; nb.scrollTop=stp; } window.scrollTo(wx,wy); }
}
document.addEventListener("click",e=>{
  const opt=e.target.closest(".wopt"); if(opt){ choose(opt); return; }
  const cb=e.target.closest(".critbtn"); if(cb){ const on=document.body.classList.toggle("crit"); cb.setAttribute("aria-pressed",on); writeHash(); const wy=window.scrollY; render(); window.scrollTo(window.scrollX,wy); return; }
  const wb=e.target.closest(".widebtn"); if(wb){ const on=document.body.classList.toggle("wide"); wb.setAttribute("aria-pressed",on); writeHash(); if(VIEW==="sequence"){ const wy=window.scrollY; render(); window.scrollTo(window.scrollX,wy); } return; }
  const tab=e.target.closest(".viewtab"); if(tab){ VIEW=tab.dataset.view; writeHash(); render(); window.scrollTo(0,0); return; }
  if(e.target.closest("#critapply")){ applyCriteria(); return; }
  if(e.target.closest("#critreset")){ renderCriteria({ok:true,msg:"Reloaded."}); return; }
});
document.addEventListener("keydown",e=>{
  if(e.target&&e.target.id==="critta"&&(e.metaKey||e.ctrlKey)&&e.key==="Enter"){ e.preventDefault(); applyCriteria(); return; }
  const opt=e.target.closest&&e.target.closest("g.wopt");
  if(opt && (e.key==="Enter"||e.key===" ")){ e.preventDefault(); choose(opt); }
});
document.addEventListener("change",e=>{
  const sel=e.target.closest&&e.target.closest("select.wselect"); if(!sel) return;
  const host=sel.closest("[data-choice]"), top=host?host.getBoundingClientRect().top:null, key=sel.getAttribute("data-k");
  STATE[key]=sel.value; normalize(STATE); writeHash(); render(key,top);
  const again=document.getElementById("wi-"+key); if(again) again.focus({preventScroll:true});
});
window.addEventListener("hashchange",()=>{ readHash(); render(); });
readHash(); render();
