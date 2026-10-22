/* ---------- state in the URL hash, events, startup ---------- */
let STATE={...DEF}, VIEW="comic";
function readHash(){
  const h=new URLSearchParams(location.hash.slice(1));
  STATE={...DEF};
  legacyHash(h);
  for(const k in CHOICES){ const v=h.get(k); if(v && CHOICES[k].opts.some(o=>o.v===v)) STATE[k]=v; }
  normalize(STATE);
  let v=h.get("view"); if(v==="flow"||v==="branches") v="decision"; // the Flow tab is the decision view; "decision" and "branches" are older names
  VIEW=["comic","sequence","decision","criteria"].includes(v)?v:"comic";
  // view toggles, kept only in the views that show their button
  document.body.classList.toggle("wide",h.get("fullwidth")==="1"&&(VIEW==="sequence"||VIEW==="decision"));
  document.body.classList.toggle("crit",h.get("showcriteria")==="1"&&(VIEW==="sequence"||VIEW==="decision"));
}
function writeHash(){
  const h=new URLSearchParams();
  if(VIEW!=="comic") h.set("view",VIEW==="decision"?"flow":VIEW);
  if(document.body.classList.contains("wide")&&(VIEW==="sequence"||VIEW==="decision")) h.set("fullwidth","1");
  if(document.body.classList.contains("crit")&&(VIEW==="sequence"||VIEW==="decision")) h.set("showcriteria","1");
  for(const k in CHOICES) if(STATE[k]!==DEF[k]) h.set(k,STATE[k]);
  const s=h.toString();
  try{ history.replaceState(null,"",s?"#"+s:location.pathname+location.search); }catch(e){}
}

const panels=()=>[...document.querySelectorAll("#comic .panel")];
const panelAt=i=>panels()[i]||null;
const panelIndex=el=>{ const f=el&&el.closest&&el.closest("#comic .panel"); return f?panels().indexOf(f):null; };
function render(anchorIdx,oldTop){
  document.querySelectorAll(".viewtab").forEach(b=>b.setAttribute("aria-selected",b.dataset.view===VIEW));
  ["comic","sequence","decision","criteria"].forEach(v=>document.getElementById(v).hidden=(v!==VIEW));
  const wbtn=document.getElementById("widebtn"); if(wbtn){ const w=VIEW==="decision"||VIEW==="sequence"; wbtn.hidden=!w; if(!w) document.body.classList.remove("wide"); wbtn.setAttribute("aria-pressed",document.body.classList.contains("wide")); }
  const cbtn=document.getElementById("critbtn"); if(cbtn){ const c=VIEW==="sequence"||VIEW==="decision"; cbtn.hidden=!c; if(!c) document.body.classList.remove("crit"); cbtn.setAttribute("aria-pressed",document.body.classList.contains("crit")); }
  const mbtn=document.getElementById("mmdbtn"); if(mbtn) mbtn.hidden=!(VIEW==="sequence"||VIEW==="decision");
  renderTitle();
  if(VIEW==="comic") renderComic(); else if(VIEW==="sequence") renderSeq(); else if(VIEW==="decision") renderDecision(); else renderCriteria();
  // keep the panel where the choice was made in place (by position: a choice can move its criterion to a later panel)
  if(anchorIdx!=null && oldTop!=null && VIEW==="comic"){
    const el=panelAt(anchorIdx);
    if(el) window.scrollBy(0, el.getBoundingClientRect().top-oldTop);
  }
}
function choose(opt){
  const set=opt.getAttribute("data-set");
  const idx=panelIndex(opt), top=idx!=null?panelAt(idx).getBoundingClientRect().top:null;
  const box=document.querySelector(`#${VIEW} .seqscroll`), sl=box?box.scrollLeft:0, stp=box?box.scrollTop:0;
  const wx=window.scrollX, wy=window.scrollY;
  let key=null;
  if(set){ Object.assign(STATE,JSON.parse(set)); }
  else { key=opt.getAttribute("data-k"); STATE[key]=opt.getAttribute("data-v"); }
  normalize(STATE); writeHash(); render(idx,top);
  if(VIEW!=="comic"){ const nb=document.querySelector(`#${VIEW} .seqscroll`); if(nb){ nb.scrollLeft=sl; nb.scrollTop=stp; } window.scrollTo(wx,wy); }
}
// copy the open diagram as Mermaid text; the Clipboard API needs a secure context, older browsers fall back to execCommand
function copyText(t){
  if(navigator.clipboard&&window.isSecureContext) return navigator.clipboard.writeText(t);
  return new Promise((ok,ko)=>{ const ta=document.createElement("textarea"); ta.value=t; ta.setAttribute("readonly",""); ta.style.cssText="position:fixed;top:0;opacity:0";
    document.body.appendChild(ta); ta.select(); let done=false; try{ done=document.execCommand("copy"); }catch(e){} ta.remove(); done?ok():ko(); });
}
let mmdTimer=null;
function copyMermaid(btn){
  const crit=document.body.classList.contains("crit"), css=getComputedStyle(document.documentElement);
  const txt=VIEW==="sequence"?seqMermaid(STATE,crit):flowMermaid(STATE,crit,k=>css.getPropertyValue("--c-"+k).trim());
  const say=m=>{ btn.textContent=m; clearTimeout(mmdTimer); mmdTimer=setTimeout(()=>{ btn.textContent="Copy Mermaid"; },1500); };
  copyText(txt).then(()=>say("Copied"),()=>say("Copy failed"));
}
document.addEventListener("click",e=>{
  const opt=e.target.closest(".wopt"); if(opt){ choose(opt); return; }
  const cb=e.target.closest(".critbtn"); if(cb){ const on=document.body.classList.toggle("crit"); cb.setAttribute("aria-pressed",on); writeHash(); const wy=window.scrollY; render(); window.scrollTo(window.scrollX,wy); return; }
  const mb=e.target.closest(".mmdbtn"); if(mb){ copyMermaid(mb); return; }
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
  if(sel.dataset.egg){ EGG[sel.dataset.egg]=sel.value; const wy=window.scrollY; render(); window.scrollTo(window.scrollX,wy); return; }
  const idx=panelIndex(sel), top=idx!=null?panelAt(idx).getBoundingClientRect().top:null, key=sel.getAttribute("data-k");
  // an entry of a panel's own menu carries the criteria it sets, as JSON
  if(sel.value.startsWith("{")) Object.assign(STATE,JSON.parse(sel.value)); else STATE[key]=sel.value;
  normalize(STATE); writeHash(); render(idx,top);
  const again=idx!=null&&panelAt(idx)&&panelAt(idx).querySelector("select.wselect"); if(again) again.focus({preventScroll:true});
});
window.addEventListener("hashchange",()=>{ readHash(); render(); });
// the sequence diagram fills the available width: lay it out again when the window is resized
let resizeTimer=null;
window.addEventListener("resize",()=>{ clearTimeout(resizeTimer); resizeTimer=setTimeout(()=>{ if(VIEW==="sequence"){ const wy=window.scrollY; renderSeq(); window.scrollTo(window.scrollX,wy); } },150); });
readHash(); render();
