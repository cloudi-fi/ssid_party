#!/usr/bin/env node
// Exhaustive consistency check for index.html and the scripts it loads
// usage: node tests/check.js [path/to/index.html]
// Enumerates every valid criteria combination (DFS over applicable options), walks every story and reports:
//   loop / dangling (a story that neither ends nor reaches the dancefloor) / unreached nodes /
//   "undefined" or NaN in any rendered view / speech-bubble overlaps or out-of-bounds in comic panels /
//   a current option hidden from its title menu / box or chip collisions in the decision diagram.
const fs=require("fs"), nodePath=require("path"), vm=require("vm");
const file=process.argv[2]||"index.html";
const html=fs.readFileSync(file,"utf8");
// the page's classic scripts, in page order, each run as its own script in one shared context (as in a browser)
const scripts=[...html.matchAll(/<script src="([^"]+)"><\/script>/g)].map(m=>nodePath.join(nodePath.dirname(file),m[1]));
const els={};function el(id){return els[id]||(els[id]={id,hidden:false,innerHTML:"",value:"",setAttribute(){}});}
const ctx=vm.createContext({console,URLSearchParams,
  document:{body:{classList:{remove(){},toggle(){return true},contains(){return false}}},getElementById:el,querySelectorAll:()=>[],querySelector:()=>null,addEventListener(){}},
  window:{addEventListener(){},scrollBy(){},scrollTo(){}},location:{hash:"",pathname:"/",search:"",href:"https://x/y"},history:{replaceState(){}}});
for(const f of scripts) vm.runInContext(fs.readFileSync(f,"utf8"),ctx,{filename:f});
const T=vm.runInContext(`({NN:N,P:path,FP:fullPath,CC:CHOICES,DD:DEF,rc:renderComic,rs:renderSeq,rd:renderDecision,set:s=>{STATE=s},L:layout,norm:normalize,opts:optsFor})`,ctx);
const {NN,P,FP,CC,DD,rc,rs,rd}=T;
function rects(f,rx){return [...f.matchAll(new RegExp('<rect x="([\\d.-]+)" y="([\\d.-]+)" width="([\\d.]+)" height="([\\d.]+)" rx="'+rx+'"','g'))].map(m=>({x:+m[1],y:+m[2],w:+m[3],h:+m[4]}));}
function ov(a,b){return a.x<b.x+b.w&&b.x<a.x+a.w&&a.y<b.y+b.h&&b.y<a.y+a.h;}
// NOTE: CHOICES order matters: a criterion whose applicability depends on another one must be declared after it.
const keys=Object.keys(CC); const states=[];
(function dfs(i,st){ if(i===keys.length){ const c={...st}; T.norm(c); states.push(c); return; }
  const k=keys[i]; const ok=T.opts(k,{...DD,...st}); if(!ok.length){ dfs(i+1,{...st,[k]:DD[k]}); return; }
  for(const o of ok) dfs(i+1,{...st,[k]:o.v}); })(0,{});
const uniq=new Map(states.map(s=>[JSON.stringify(s),s]));
let issues=0; const visited=new Set(), stories=new Set();
for(const s of uniq.values()){
  const fp=FP(s); fp.forEach(x=>visited.add(x));
  if(new Set(fp).size!==fp.length){issues++;console.log("loop",JSON.stringify(s));}
  const last=NN[fp[fp.length-1]]; if(!last.end&&!last.ok){issues++;console.log("dangling",fp[fp.length-1],JSON.stringify(s));}
  const key=P(s).join(","); if(stories.has(key)) continue; stories.add(key);
  T.set({...s}); rc(); rs(); rd();
  for(const k of ["comic","sequence","decision"]) if(/undefined|NaN/.test(els[k].innerHTML)){issues++;console.log("bad",k,JSON.stringify(s));}
  els.comic.innerHTML.split("<figure").slice(1).forEach((f,i)=>{const r=rects(f,13);for(let a=0;a<r.length;a++){if(r[a].x<4||r[a].x+r[a].w>436||r[a].y<4){issues++;console.log("oob",P(s)[i],JSON.stringify(s));}for(let b=a+1;b<r.length;b++)if(ov(r[a],r[b])){issues++;console.log("overlap",P(s)[i],JSON.stringify(s));}}});
  for(const id of P(s)){ const ch=NN[id].choice; if(ch && T.opts(ch,s).length>1 && !T.opts(ch,s).some(o=>o.v===s[ch])){issues++;console.log("hidden current option",id,ch,JSON.stringify(s));} }
}
const unreached=Object.keys(NN).filter(x=>!visited.has(x)); if(unreached.length){issues++;console.log("unreached",unreached);}
const L=T.L(); const bx=Object.entries(L.box).map(([id,b])=>({id,x:b.x-86,y:b.top,w:172,h:b.h}));
for(let i=0;i<bx.length;i++)for(let j=i+1;j<bx.length;j++)if(ov(bx[i],bx[j])){issues++;console.log("box overlap",bx[i].id,bx[j].id);}
T.set({...DD}); rd(); const ch=rects(els.decision.innerHTML,8);
for(let i=0;i<ch.length;i++)for(let j=i+1;j<ch.length;j++)if(ov(ch[i],ch[j])){issues++;console.log("chip overlap",ch[i],ch[j]);}
console.log("valid states:",uniq.size,"distinct stories:",stories.size,"diagram:",L.ncol,"cols x",L.nrow,"rows, W",L.W,"H",L.H,"| issues:",issues);
process.exit(issues?1:0);
