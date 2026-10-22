/* ---------- renderers: comic, sequence, decision, criteria ---------- */
function panelSVG(id,st){
  const p=N[id];
  let s=`<svg viewBox="0 0 ${W} ${FLOOR+30}" role="img" aria-label="${esc(V(p.note,st))}">`;
  s+=bg(V(p.bg,st));
  const actors=V(p.a,st);
  for(const a of actors){
    if(a.k==="ray"&&a.seated){ s+=rayDesk(a.x,OURS("ray",st),!!a.phone); continue; }
    const band=a.band || (a.k==="dave"&&st.radius==="known"&&rayCheckers(st)?"--band-green":null);
    const phone=a.k==="dave" ? (a.nophone?"none":st.os) : null;
    s+=figure(a.k,a.x,{band,mood:a.mood||"smile",headSpin:a.headSpin||false,phone,antennas:a.k==="phyre"&&fwBo(st),cloudHead:(a.k==="phyre"&&cloud(st))||(a.k==="dippy"&&cloudDhcp(st))||(a.k==="soso"&&idSrc(st)==="entraid"),zombie:!!a.zombie,ours:OURS(a.k,st),handset:!!a.phone});
  }
  for(const a of actors){ const b=V(a.b,st); if(b) s+=bubble(a.x,b,{kind:a.kind||"speech",align:a.al||"center",top:a.top||false,color:CH[a.k].color,shift:a.bx||0}); }
  return s+`</svg>`;
}
function titleSel(key){
  const c=CHOICES[key], opts=optsFor(key,STATE), cur=opts.find(o=>o.v===STATE[key]);
  let body="", g=null;
  for(const o of opts){
    if(o.group!==g){ if(g!==null) body+=`</optgroup>`; g=o.group; if(g) body+=`<optgroup label="${esc(g)}">`; }
    body+=`<option value="${o.v}"${o.v===STATE[key]?" selected":""}>${esc(NB(FULL(V(o.title,STATE))))}</option>`;
  }
  if(g) body+=`</optgroup>`;
  return `<span class="narr nsel"><span class="ntxt">${esc(NB(FULL(V(cur.title,STATE))))}<span class="caret" aria-hidden="true">▾</span></span><select class="wselect tsel" id="wi-${key}" data-k="${key}" aria-label="Change this step (${esc(c.tq)})">${body}</select></span>`;
}
// the page title is the SSID picker: the name as text, with a transparent select over it (as in the panel titles);
// each SSID has its own tagline, a film title (Night at the Museum, Eyes Wide Shut)
function renderTitle(){
  const h=document.getElementById("title"); if(!h) return;
  const c=CHOICES.ssid, cur=c.opts.find(o=>o.v===STATE.ssid)||c.opts[0];
  h.classList.toggle("long",cur.label.length>16); // phones: the 802.1X name is set a little smaller, to stay on one line
  h.innerHTML=`<span class="nsel hsel"><span class="ntxt">${esc(cur.label)}<span class="caret" aria-hidden="true">▾</span></span><select class="wselect tsel" id="wi-ssid" data-k="ssid" aria-label="Choose the SSID">`+
    c.opts.map(o=>`<option value="${o.v}"${o.v===cur.v?" selected":""}>${esc(o.label)}</option>`).join("")+`</select></span>`;
  const tl=document.getElementById("tagline"); if(tl) tl.textContent=cur.sub;
}
function whatIf(key){
  const c=CHOICES[key];
  return `<div class="whatif"><label class="wq" for="wi-${key}">${esc(c.q)}</label><span class="wsel"><select class="wselect" id="wi-${key}" data-k="${key}">`+
    c.opts.map(o=>`<option value="${o.v}"${STATE[key]===o.v?" selected":""}>${esc(o.label)}</option>`).join("")+`</select></span></div>`;
}
function renderComic(){
  const ids=path(STATE);
  let h=ids.map((id,i)=>{ const p=N[id], ch=hasChoice(id,STATE);
    return `<figure class="panel" id="p-${id}" ${ch?`data-choice="${p.choice}"`:""}>
      <div class="cap"><span class="pnum">${i+1}</span>${ch?titleSel(p.choice):`<span class="narr">${esc(NB(FULL(V(p.narr,STATE))))}</span>`}<span class="loc">${esc(p.loc)}</span></div>
      ${panelSVG(id,STATE)}
      <div class="foot"><span class="tag">${tagHTML(tagOf(id,STATE))}</span><span class="note">${esc(NB(V(p.note,STATE)))}</span></div>
    </figure>`; }).join("");
  const lastId=ids[ids.length-1];
  if(N[lastId].end) h+=`<div class="endcard"><b>The end.</b> Dave never reaches the dancefloor with this configuration.</div>`;
  else if(ids.includes("nHack")) h+=`<div class="endcard endwarn"><b>The end.</b> Dave Ice is on the network — and nobody ever checked who he is. The DHCP blacklist was the only barrier, and it only withholds a lease.</div>`;
  document.getElementById("comic").innerHTML=h;
}

/* ---------- sequence diagram ---------- */
// lanes drawn in the sequence diagram: all of them with "Show criteria", otherwise only the actors in the story
let SLANES=LANES, LGAP=108, SW=120+(LANES.length-1)*108;
const LX=i=>60+i*LGAP;
function chipSVG(x,y,label,key,val){
  const w=label.length*6.1+18, on=STATE[key]===val;
  return {w, svg:`<g class="wopt chip" data-k="${key}" data-v="${val}" role="button" tabindex="0" aria-pressed="${on}">
    <rect x="${x}" y="${y}" width="${w}" height="18" rx="9" fill="${on?"var(--ink)":"var(--surface)"}" stroke="${on?"var(--ink)":"var(--ink-2)"}" stroke-width="1.2" ${on?"":'stroke-dasharray="3 2"'}/>
    <text x="${x+9}" y="${y+13}" font-family="var(--font-sans)" font-size="11" fill="${on?"var(--surface)":"var(--ink)"}">${esc(label)}</text></g>`};
}
function msgSVG(m,y){
  const fi=SLANES.indexOf(m.f), ti=SLANES.indexOf(m.t), col=CH[m.f].color, lw=m.l.length*6.1+12;
  let s="";
  if(fi===ti){
    const x=LX(fi);
    s+=`<path d="M${x} ${y-8} h26 v14 h-22" fill="none" stroke="${col}" stroke-width="1.8"/><polygon points="${x+2},${y+6} ${x+10},${y+2} ${x+10},${y+10}" fill="${col}"/>`;
    const tx=x+32+lw<=SW-4?x+32:Math.max(8,x-lw-4); // label right of the loop, or left of the lane when the right edge is too close
    s+=`<rect x="${tx-4}" y="${y-8}" width="${lw}" height="16" rx="3" fill="var(--surface)"/><text x="${tx+2}" y="${y+4}" font-family="var(--font-sans)" font-size="11" fill="var(--ink)">${esc(m.l)}</text>`;
  } else {
    const x1=LX(fi), x2=LX(ti), d=x2>x1?1:-1, xe=x2-d*2;
    s+=`<line x1="${x1}" y1="${y}" x2="${xe-d*7}" y2="${y}" stroke="${col}" stroke-width="1.8" ${m.r?'stroke-dasharray="5 4"':""}/><polygon points="${xe},${y} ${xe-d*9},${y-5} ${xe-d*9},${y+5}" fill="${col}"/>`;
    let tx=(x1+x2)/2-lw/2; tx=Math.max(4,Math.min(tx,SW-lw-4));
    s+=`<rect x="${tx}" y="${y-19}" width="${lw}" height="15" rx="3" fill="var(--surface)"/><text x="${tx+6}" y="${y-8}" font-family="var(--font-sans)" font-size="11" fill="var(--ink)">${esc(m.l)}</text>`;
  }
  return s+`<circle cx="${LX(fi)}" cy="${y}" r="3" fill="${col}"/>`;
}
// sequence-diagram lane headers only: the device's OS, the controller's and the firewall's brand (stand-ins: Cisco for Meraki, Juniper for Mist, CommScope for Ruckus)
const VENDOR_LOGO={"cisco-wlc":"cisco",aruba:"aruba",meraki:"cisco",mist:"juniper-networks","ruckus-ap":"commscope","ruckus-smartzone":"commscope",fortigate:"fortinet"};
const FW_LOGO={zscaler:"zscaler",netskope:"netskope",fortigate:"fortinet"};
const OS_LOGO={ios:"img/os/apple.svg",android:"img/os/android.svg",iot:"emoji:🤖"};
function laneLogo(k,s){
  if(OURS(k,s)) return CF_LOGO;
  if(k==="dave") return OS_LOGO[s.os];
  if(k==="troller") return `img/vendors/${VENDOR_LOGO[s.vendor]}.svg`;
  if(k==="phyre"&&(cloud(s)||fwL(s))) return `img/vendors/${FW_LOGO[s.fwvendor]}.svg`;
  if(k==="soso"&&idSrc(s)) return {ldap:"img/vendors/ldap.png",entraid:"img/vendors/entra-id.svg"}[idSrc(s)]||null;
  if(k==="soso"&&!secure(s)) return "img/vendors/entra-id.svg"; // the SSO IdP: most often Entra ID (or Okta)
  return null;
}
// the lanes of a sequence diagram: every component with "Show criteria", otherwise only those the story's messages involve
function seqLanes(ids,s,crit){
  const used=new Set(); for(const id of ids) for(const m of V(N[id].seq,s)||[]){ used.add(m.f); used.add(m.t); }
  return crit?LANES:LANES.filter(k=>used.has(k));
}
const SEQ_HACK="Internet access · identity never verified (DHCP blacklist bypassed)";
function renderSeq(){
  const host=document.getElementById("sequence");
  const avail=host&&host.clientWidth?host.clientWidth-4:0; // the lanes spread over the available width (page or full width)
  const ids=path(STATE), rowH=34, crit=document.body.classList.contains("crit"); // messages only, unless "Show criteria" adds the alt frames, labels and choice chips
  SLANES=seqLanes(ids,STATE,crit);
  LGAP=Math.max(108,Math.floor((avail-120)/(SLANES.length-1))||108); SW=120+(SLANES.length-1)*LGAP;
  let y=14, body="";
  for(const id of ids){
    const p=N[id], seq=V(p.seq,STATE);
    if(crit&&hasChoice(id,STATE)){
      const c=CHOICES[p.choice], top=y+4; y+=12; // clear of a self-message label just above
      let hx=58, chips="", line=0;
      const lab=`[${c.tq}]`;
      chips+=`<text x="${hx}" y="${y+13}" font-family="var(--font-sans)" font-size="11" font-weight="500" fill="var(--ink)">${esc(lab)}</text>`;
      hx+=lab.length*6.4+10;
      for(const o of optsFor(p.choice,STATE)){ let ch=chipSVG(hx,y,o.t,p.choice,o.v); if(hx+ch.w>SW-16){ y+=24; hx=58; ch=chipSVG(hx,y,o.t,p.choice,o.v);} chips+=ch.svg; hx+=ch.w+6; }
      y+=26;
      let msgs=""; for(const m of seq){ y+=rowH-8; msgs+=msgSVG(m,y); y+=8; }
      y+=12;
      body+=`<rect x="10" y="${top}" width="${SW-20}" height="${y-top}" rx="4" fill="none" stroke="var(--ink-2)" stroke-width="1.2" stroke-dasharray="6 4"/>`;
      body+=`<path d="M10 ${top} h40 v14 l-6 6 h-34 Z" fill="var(--surface-2)" stroke="var(--ink-2)" stroke-width="1.2"/><text x="16" y="${top+15}" font-family="var(--font-sans)" font-size="11" font-weight="500" fill="var(--ink)">alt</text>`;
      body+=chips+msgs; y+=10;
    } else {
      for(const m of seq){ y+=rowH-8; body+=msgSVG(m,y); y+=8; }
    }
  }
  y+=18;
  if(ids.includes("nHack")&&N[ids[ids.length-1]].ok){ const x=LX(0); body+=`<text x="${x-8}" y="${y+4}" font-family="var(--font-sans)" font-size="11" font-weight="500" fill="var(--c-fail)">${SEQ_HACK}</text>`; y+=20; }
  if(N[ids[ids.length-1]].end){ const x=LX(0); body+=`<line x1="${x-12}" y1="${y-8}" x2="${x+12}" y2="${y+8}" stroke="var(--c-fail)" stroke-width="2.4"/><line x1="${x+12}" y1="${y-8}" x2="${x-12}" y2="${y+8}" stroke="var(--c-fail)" stroke-width="2.4"/><text x="${x+20}" y="${y+4}" font-family="var(--font-sans)" font-size="11" fill="var(--c-fail)">no Internet access</text>`; y+=20; }
  const H=y+10;
  let lines=""; SLANES.forEach((k,i)=>{ lines+=`<line x1="${LX(i)}" y1="0" x2="${LX(i)}" y2="${H}" stroke="var(--line)" stroke-width="1.2" stroke-dasharray="4 4"/>`; });
  let head=`<svg viewBox="0 0 ${SW} 40" width="${SW}" height="40" aria-hidden="true">`;
  SLANES.forEach((k,i)=>{ const x=LX(i); head+=`<rect x="${x-48}" y="5" width="96" height="30" rx="6" fill="var(--surface)" stroke="${CH[k].color}" stroke-width="2"/>`+nameLabel(x,24,techName(k,STATE),"var(--ink)",laneLogo(k,STATE)); });
  head+=`</svg>`;
  document.getElementById("sequence").innerHTML=`<div class="seqhead"><div class="seqheadin" style="min-width:${SW}px">${head}</div></div><div class="seqscroll seqbody"><div class="seqinner" style="min-width:${SW}px">
    <svg viewBox="0 0 ${SW} ${H}" width="${SW}" height="${H}" role="img" aria-label="Sequence diagram">${lines}${body}</svg></div></div>`;
  const sb=document.querySelector("#sequence .seqbody"), sh=document.querySelector("#sequence .seqhead");
  if(sb&&sh){ sb.addEventListener("scroll",()=>{ sh.scrollLeft=sb.scrollLeft; }); sh.scrollLeft=sb.scrollLeft; }
}

/* ---------- decision diagram (auto layout) ---------- */
const DCW=196, DBW=172, DROW=118, DPAD=16;
function graphEdges(){
  const E=[];
  for(const id in N){
    const nx=N[id].next; if(!nx) continue;
    if(typeof nx==="string") E.push({f:id,t:nx});
    else if(nx.k){
      const opts=[...CHOICES[nx.k].opts].sort((a,b)=>(b.v===DEF[nx.k])-(a.v===DEF[nx.k]));
      for(const o of opts) if(nx.map[o.v]) E.push({f:id,t:nx.map[o.v],l:o.t,set:{[nx.k]:o.v}});
    } else for(const c of nx.cases) E.push({f:id,t:c.to,l:c.l,set:c.set});
  }
  return E;
}
let LAYOUT=null;
function layout(){
  if(LAYOUT) return LAYOUT;
  const E=graphEdges(), out={}, inc={};
  for(const id in N){ out[id]=[]; inc[id]=0; }
  E.forEach(e=>{ out[e.f].push(e); inc[e.t]++; });
  const order=[], seen={};
  (function topo(u){ if(seen[u]) return; seen[u]=1; out[u].forEach(e=>topo(e.t)); order.unshift(u); })("n1");
  const row={n1:0}; order.forEach(u=>out[u].forEach(e=>{ row[e.t]=Math.max(row[e.t]??0,(row[u]??0)+1); }));
  const col={}; let nextCol=0;
  (function place(u,c){ if(u in col) return; col[u]=c; out[u].forEach((e,i)=>place(e.t, i===0?c:++nextCol)); })("n1",0);
  const chains={};
  for(const u in col){ const c=col[u]; (chains[c]=chains[c]||{c,ids:[],min:1e9,max:-1}); chains[c].ids.push(u); chains[c].min=Math.min(chains[c].min,row[u]); chains[c].max=Math.max(chains[c].max,row[u]); }
  const headOf={}; Object.values(chains).forEach(ch=>{ headOf[ch.c]=ch.ids.reduce((a,b)=>row[a]<=row[b]?a:b); });
  const parentOf={}; E.forEach(e=>{ const c=col[e.t]; if(col[e.f]!==c && e.t===headOf[c] && !(c in parentOf)) parentOf[c]=col[e.f]; });
  const occ={}, phys={};
  Object.values(chains).sort((a,b)=>a.c-b.c).forEach(ch=>{
    const want=(ch.c in parentOf && phys[parentOf[ch.c]]!=null)?phys[parentOf[ch.c]]:0;
    const free=k=>!(occ[k]||[]).some(([a,b])=>ch.min<=b+1 && ch.max>=a-1);
    let best=null; for(let d=0;best===null;d++){ for(const k of [want+d,want-d]) if(k>=0 && free(k)){ best=k; break; } }
    phys[ch.c]=best; (occ[best]=occ[best]||[]).push([ch.min,ch.max]);
  });
  const minC=Math.min(...Object.values(phys)); for(const c in phys) phys[c]-=minC;
  for(const u in col) col[u]=phys[col[u]];
  const ncol=Math.max(...Object.values(col))+1, nrow=Math.max(...Object.values(row))+1;
  const box={};
  for(const id in col){
    const x=DPAD+DCW/2+col[id]*DCW, top=20+row[id]*DROW;
    if(N[id].dec) box[id]={x,top,h:44,bot:top+44,dia:1};
    else { const lines=wrap(graphTag(id),26), h=lines.length*14+14; box[id]={x,top,h,bot:top+h,lines}; }
  }
  return LAYOUT={E,box,row,col,ncol,nrow,W:DPAD*2+ncol*DCW,H:40+nrow*DROW};
}
// a step is framed in the colour of the actor that handles it, as in the sequence-diagram lanes: the actor most present in
// its messages besides the device (ties go to the more specific component); device-only steps get the device's colour
const ACTOR_PRIO=["ray","dippy","chippy","soso","phyre","porter","troller"];
function stepActor(id,s){
  const cnt={}; for(const m of V(N[id].seq,s)||[]) for(const a of [m.f,m.t]) if(a!=="dave") cnt[a]=(cnt[a]||0)+1;
  const ks=Object.keys(cnt);
  return ks.length?ks.sort((a,b)=>cnt[b]-cnt[a]||ACTOR_PRIO.indexOf(a)-ACTOR_PRIO.indexOf(b))[0]:"dave";
}
// a step's label lines; endings get a ✓ (Internet) or ✕ (failure) in front
function stepText(id,lines,x,top){
  const mark=N[id].ok?`<tspan fill="var(--c-porter)" font-weight="700">✓</tspan> `:N[id].end?`<tspan fill="var(--c-fail)" font-weight="700">✕</tspan> `:"";
  return lines.map((l,j)=>`<text x="${x}" y="${top+18+j*14}" text-anchor="middle" font-family="var(--font-sans)" font-size="11" fill="var(--ink)">${j?"":mark}${esc(l)}</text>`).join("");
}
// without "Show criteria": only the steps of the current story, in one column (no diamonds, choices or other branches)
function renderPath(){
  const ids=path(STATE), gap=26, pad=16, w=DBW+pad*2, x=w/2;
  let y=pad, s="";
  ids.forEach((id,i)=>{
    const lines=wrap(tagOf(id,STATE),26), h=lines.length*14+14, stroke=CH[stepActor(id,STATE)].color;
    if(i) s+=`<line x1="${x}" y1="${y-gap}" x2="${x}" y2="${y-7}" stroke="var(--ink)" stroke-width="2.2"/><polygon points="${x},${y} ${x-5},${y-7} ${x+5},${y-7}" fill="var(--ink)"/>`;
    s+=`<rect x="${x-DBW/2}" y="${y}" width="${DBW}" height="${h}" rx="6" fill="var(--surface)" stroke="${stroke}" stroke-width="2"/>`+stepText(id,lines,x,y);
    y+=h+gap;
  });
  const H=y-gap+pad;
  document.getElementById("decision").innerHTML=`<p class="tintro">The steps of the current story, top to bottom. Show criteria to see every branch and switch between them.</p><div class="seqscroll"><div class="decinner decpath">
    <svg viewBox="0 0 ${w} ${H}" width="${w}" height="${H}" role="img" aria-label="Flow, current story">${s}</svg></div></div>`;
}
function renderDecision(){
  if(!document.body.classList.contains("crit")) return renderPath();
  const L=layout(), fp=fullPath(STATE), onN=new Set(fp), onE=new Set();
  for(let i=0;i<fp.length-1;i++) onE.add(fp[i]+">"+fp[i+1]);
  let e="", n="", chips="";
  const placed=[];
  const occupied=(c,r1,r2)=>Object.keys(L.col).some(id=>L.col[id]===c&&L.row[id]>r1&&L.row[id]<r2);
  L.E.forEach(ed=>{
    const a=L.box[ed.f], b=L.box[ed.t], act=onE.has(ed.f+">"+ed.t);
    const ra=L.row[ed.f], rb=L.row[ed.t], rowTop=20+ra*DROW, el=b.top-18, gx=b.x-DCW/2;
    const straightOK=!occupied(L.col[ed.t],ra,rb);
    let d, chipX=b.x;
    if(N[ed.f].dec){
      const bus=rowTop+62;
      if(rb===ra+1 || (a.x!==b.x && straightOK)) d=`M${a.x} ${a.bot} V${bus} H${b.x} V${b.top-7}`;
      else if(a.x===b.x && straightOK) d=`M${a.x} ${a.bot} V${b.top-7}`;
      else { d=`M${a.x} ${a.bot} V${bus} H${gx} V${el} H${b.x} V${b.top-7}`; chipX=gx; }
    } else if(a.x===b.x && !occupied(L.col[ed.f],ra,rb)) d=`M${a.x} ${a.bot} V${b.top-7}`;
    else if(rb===ra+1) d=`M${a.x} ${a.bot} V${el} H${b.x} V${b.top-7}`;
    else d=`M${a.x} ${a.bot} V${rowTop+90} H${gx} V${el} H${b.x} V${b.top-7}`;
    const st=act?'stroke="var(--ink)" stroke-width="2.2"':'stroke="var(--ink-2)" stroke-width="1.1" opacity="0.4"';
    e+=`<path d="${d}" fill="none" ${st}/><polygon points="${b.x},${b.top} ${b.x-5},${b.top-7} ${b.x+5},${b.top-7}" fill="${act?"var(--ink)":"var(--ink-2)"}" ${act?"":'opacity="0.4"'}/>`;
    if(ed.l){
      const w=ed.l.length*6+18, pressed=act;
      let cy=rowTop+67;
      const hit=y=>placed.some(r=>chipX-w/2<r.x+r.w && r.x<chipX+w/2 && y<r.y+16 && r.y<y+16);
      for(let k=0;k<3 && hit(cy);k++) cy+=19;
      placed.push({x:chipX-w/2,y:cy,w});
      chips+=`<g class="wopt chip" data-set='${JSON.stringify(ed.set)}' role="button" tabindex="0" aria-pressed="${pressed}">
        <rect x="${chipX-w/2}" y="${cy}" width="${w}" height="16" rx="8" fill="${pressed?"var(--ink)":"var(--surface)"}" stroke="${pressed?"var(--ink)":"var(--ink-2)"}" stroke-width="1.1" ${pressed?"":'stroke-dasharray="3 2"'}/>
        <text x="${chipX}" y="${cy+12}" text-anchor="middle" font-family="var(--font-sans)" font-size="10.5" fill="${pressed?"var(--surface)":"var(--ink)"}">${esc(ed.l)}</text></g>`;
    }
  });
  for(const id in L.box){
    const b=L.box[id], act=onN.has(id), op=act?"":'opacity="0.4"';
    if(b.dia){
      const cy=b.top+22;
      n+=`<g ${op}><polygon points="${b.x},${b.top} ${b.x+82},${cy} ${b.x},${b.bot} ${b.x-82},${cy}" fill="var(--surface-2)" stroke="var(--ink)" stroke-width="${act?1.8:1.2}"/>
        <text x="${b.x}" y="${cy+4}" text-anchor="middle" font-family="var(--font-sans)" font-weight="500" font-size="11" fill="var(--ink)">${esc(N[id].dec)}</text></g>`;
    } else {
      n+=`<g ${op}><rect x="${b.x-DBW/2}" y="${b.top}" width="${DBW}" height="${b.h}" rx="6" fill="var(--surface)" stroke="${CH[stepActor(id,STATE)].color}" stroke-width="${act?2:1.2}"/>`+stepText(id,b.lines,b.x,b.top)+`</g>`;
    }
  }
  document.getElementById("decision").innerHTML=`<p class="tintro">Start at the top left. Scroll sideways to explore every branch; the bold path is the current configuration. Click a label under a diamond to switch branch.</p><div class="seqscroll"><div class="decinner" style="min-width:${L.W}px">
    <svg viewBox="0 0 ${L.W} ${L.H}" width="${L.W}" height="${L.H}" role="img" aria-label="Flow, every branch">${e}${n}${chips}</svg></div></div>`;
}

/* ---------- Mermaid export (Sequence and Flow tabs) ---------- */
// label text: entity codes for the characters Mermaid would read as syntax
const MMD_ESC={"#":"#35;",";":"#59;",'"':"#quot;","<":"#lt;",">":"#gt;"};
// and the technical names in place of the characters' ("Dave's MAC" → "Device's MAC"); first names only where unambiguous
const MMD_NAMES=Object.fromEntries(Object.entries(CH).flatMap(([k,c])=>[[c.name,TECH[k]],...(k==="porter"?[]:[[c.name.split(" ")[0],TECH[k]]])]));
const MMD_NAME_RE=new RegExp(`\\b(${Object.keys(MMD_NAMES).sort((a,b)=>b.length-a.length).join("|")})\\b`,"g");
const mmd=t=>String(t).replace(MMD_NAME_RE,n=>MMD_NAMES[n]).replace(/[#;"<>]/g,c=>MMD_ESC[c]);
const stepMark=id=>N[id].ok?"✓ ":N[id].end?"✕ ":"";
// Mermaid identifiers use the technical names, never the characters' (IdP (SSO) → IdP)
const mmdId=(k,s)=>techName(k,s).split(" ")[0];
// the sequence diagram as shown: same lanes and messages, replies dashed; with criteria, each choice step in an alt block
function seqMermaid(s,crit){
  const ids=path(s), last=N[ids[ids.length-1]], out=["sequenceDiagram"];
  for(const k of seqLanes(ids,s,crit)) out.push(`  participant ${mmdId(k,s)}${mmdId(k,s)===techName(k,s)?"":` as ${mmd(techName(k,s))}`}`);
  for(const id of ids){
    const p=N[id], msgs=(V(p.seq,s)||[]).map(m=>`${mmdId(m.f,s)}${m.r?"-->>":"->>"}${mmdId(m.t,s)}: ${mmd(m.l)}`);
    if(crit&&hasChoice(id,s)){
      const o=optsFor(p.choice,s).find(o=>o.v===s[p.choice]);
      out.push(`  alt ${mmd(CHOICES[p.choice].tq)}: ${mmd(o?o.t:s[p.choice])}`,...msgs.map(m=>"    "+m),"  end");
    } else out.push(...msgs.map(m=>"  "+m));
  }
  if(ids.includes("nHack")&&last.ok) out.push(`  Note over Device: ${mmd(SEQ_HACK)}`);
  if(last.end) out.push("  Note over Device: ✕ no Internet access");
  return out.join("\n")+"\n";
}
// the flow as shown: the current story's steps, or with criteria every branch (decisions as diamonds, choices on the
// edges, the current path thicker); steps are outlined in their actor's colour when color(k) gives one
function flowMermaid(s,crit,color){
  const fp=fullPath(s), ids=crit?Object.keys(N):path(s), out=["flowchart TD"];
  const E=crit?graphEdges():ids.slice(1).map((t,i)=>({f:ids[i],t}));
  for(const id of ids) out.push(N[id].dec?`  ${id}{"${mmd(N[id].dec)}"}`:`  ${id}["${mmd(stepMark(id)+(crit?graphTag(id):tagOf(id,s)))}"]`);
  for(const e of E) out.push(`  ${e.f} -->${e.l?`|"${mmd(e.l)}"|`:""} ${e.t}`);
  if(color){
    const by={}; for(const id of ids) if(!N[id].dec) (by[stepActor(id,s)]=by[stepActor(id,s)]||[]).push(id);
    for(const k in by){ out.push(`  classDef ${mmdId(k,s)} stroke:${color(k)}${crit?"":",stroke-width:2px"}`,`  class ${by[k].join(",")} ${mmdId(k,s)}`); }
  }
  if(crit){
    const on=new Set(fp.slice(1).map((t,i)=>fp[i]+">"+t)), li=E.map((e,i)=>on.has(e.f+">"+e.t)?i:-1).filter(i=>i>=0);
    out.push("  classDef cur stroke-width:3px",`  class ${fp.join(",")} cur`);
    if(li.length) out.push(`  linkStyle ${li.join(",")} stroke-width:3px`);
  }
  return out.join("\n")+"\n";
}

/* ---------- criteria (flat YAML) ---------- */
// grouped by context: the site's network and services as the customer set them up, then the user's device and journey
const CRIT_CTX={local:"Local context: the site's network and services",user:"User context: the device and its journey"};
const CRIT=[
  {name:"controller_vendor",key:"vendor",ctx:"local"},
  {name:"enforcement",key:"integ",ctx:"local"},
  {name:"meraki_login",key:"mlogin",ctx:"local"},
  {name:"meraki_quarantine_policy",key:"qpolicy",ctx:"local"},
  {name:"fw_vendor",key:"fwvendor",ctx:"local"},
  {name:"dhcp",key:"dhcp",ctx:"local"},
  {name:"dhcp_snooping",key:"snooping",ctx:"local"},
  {name:"option_114",key:"o114",ctx:"local"},
  {name:"transient",key:"transient",ctx:"local"},
  {name:"registration",key:"reg",ctx:"local"},
  {name:"identity_source",key:"idsrc",ctx:"local"},
  {name:"nac_policy",key:"nac",ctx:"local"},
  {name:"ssid",key:"ssid",ctx:"user"},
  {name:"device_os",key:"os",ctx:"user"},
  {name:"eap_method",key:"method",ctx:"user"},
  {name:"credentials",key:"creds",ctx:"user"},
  {name:"mab",key:"radius",ctx:"user"},
  {name:"static_ip_bypass",key:"hack",ctx:"user"},
  {name:"visit",key:"visit",ctx:"user"},
  {name:"cna_done",key:"done",ctx:"user"},
  {name:"android_browse",key:"browse",ctx:"user"},
  {name:"sms_notification",key:"smsexit",ctx:"user"}
];
const CRIT_BY_NAME=Object.fromEntries(CRIT.map(c=>[c.name,c]));
function derived(s){
  const p=path(s), last=p[p.length-1], L=N[last];
  const runsIn=p.includes("n15")?"browser":p.includes("n15n")?"mini-browser":"none";
  const risk=runsIn==="mini-browser"&&s.os==="ios"&&["mfa","sms","email"].includes(s.reg);
  const fa=p.includes("n18")?"radius (controller login)":p.includes("n18L")?"radius (firewall login)":p.includes("n18api")?"controller-api + radius":p.includes("n18g")?(s.vendor==="mist"?"signed-url (mist)":"grant-url (meraki)"):p.includes("n18c")?`saml (${s.fwvendor==="zscaler"?"idp-initiated":"sp-initiated"})`:p.includes("n19m")||p.includes("n19m2")?"mab (portal bypassed)":"none";
  const outcome=L.ok?(p.includes("nHack")&&p.includes("n19w")?"internet_bypass":"internet"):({n5r:"access_denied",n5qx:"group_policy_missing",nMabQ:"quarantined_no_portal",nNoIp:"no_lease",n12d2:"https_blackhole",nMfaEnd:"mfa_lost",nPasskeyEnd:"passkey_unavailable",nIot:"no_captive_detection",nBlack:"blacklisted_silent_drop",nSnoopYes:"static_ip_dropped",nStale:"stale_captive_state"})[last]||"blocked";
  const dhcpHosting=["quarantine","whitelist","blacklist","zombies"].includes(s.dhcp)?"cloud":"on-prem";
  return {dhcp_hosting:dhcpHosting,mab_at_association:cloud(s)?"none":rayCheckers(s)?"yes":"no",portal_runs_in:runsIn,app_switch_risk:risk?"yes":"no",final_auth:p.includes("n19w")?(p.includes("nHack")?"none (static IP bypass)":"dhcp-whitelist (portal bypassed)"):fa,outcome,steps:p};
}
function criteriaText(s){
  const lines=["# SSID_PARTY — flat criteria. One line per criterion: key: value","# Values are the words used in the diagrams. Lines starting with # are ignored.",""];
  let ctx=null; const w=Math.max(...CRIT.map(c=>c.name.length))+2;
  for(const c of CRIT){
    if(c.ctx!==ctx){ if(ctx) lines.push(""); ctx=c.ctx; lines.push(`# ${CRIT_CTX[ctx]}`); }
    const all=CHOICES[c.key].opts, ok=optsFor(c.key,s);
    const vals=all.map(o=>o.v).join(" | ");
    let note="", shown=String(s[c.key]);
    if(ok.length===0){ shown="none"; note="  (not applicable here)"; } else if(ok.length<all.length) note=`  (here: ${ok.map(o=>o.v).join(" | ")})`;
    lines.push(`${(c.name+":").padEnd(w)}${shown.padEnd(18)}# ${vals}${note}`);
  }
  return lines.join("\n");
}
function parseCriteria(text){
  const out={}, errors=[], notes=[];
  text.split(/\r?\n/).forEach((raw,i)=>{
    const line=raw.replace(/#.*$/,"").trim(); if(!line) return;
    const m=line.match(/^([A-Za-z0-9_-]+)\s*:\s*(.*)$/); if(!m){ errors.push(`line ${i+1}: expected "key: value"`); return; }
    const name=m[1], val=m[2].trim().replace(/^["']|["']$/g,"");
    const c=CRIT_BY_NAME[name]; if(!c){ errors.push(`line ${i+1}: unknown criterion "${name}"`); return; }
    if(!val||val==="?"){ notes.push(`${name}: unknown, kept at ${STATE[c.key]}`); return; }
    if(val==="none"){ if(optsFor(c.key,STATE).length===0) return; errors.push(`line ${i+1}: ${name} applies here, "none" is not allowed (${optsFor(c.key,STATE).map(o=>o.v).join(" | ")})`); return; }
    if(/[|,\[\{]/.test(val)){ errors.push(`line ${i+1}: ${name} must be a single value here (candidates/weights not supported yet)`); return; }
    if(!CHOICES[c.key].opts.some(o=>o.v===val)){ errors.push(`line ${i+1}: "${val}" is not a value of ${name} (${CHOICES[c.key].opts.map(o=>o.v).join(" | ")})`); return; }
    out[c.key]=val;
  });
  return {out,errors,notes};
}
function renderCriteria(status){
  const d=derived(STATE);
  const dl=[`dhcp_hosting: ${d.dhcp_hosting}`,`portal_runs_in: ${d.portal_runs_in}`,`app_switch_risk: ${d.app_switch_risk}`,`final_auth: ${d.final_auth}`,`outcome: ${d.outcome}`,`steps: [${d.steps.join(", ")}]`].join("\n");
  const link=location.href.split("#")[0]+(location.hash||"");
  document.getElementById("criteria").innerHTML=`<p class="tintro">Read or edit the criteria of the current journey, then apply. Values are validated against the diagrams; a value that no longer fits the configuration is corrected automatically.</p>
    <textarea id="critta" class="yaml" rows="${CRIT.length+4}" spellcheck="false" aria-label="Criteria (YAML)">${esc(criteriaText(STATE))}</textarea>
    <div class="critbar"><button type="button" class="readbtn" id="critapply">Apply</button><button type="button" class="linkbtn" id="critreset">Reload from current journey</button><span id="critstatus" class="critstatus ${status&&status.ok===false?"err":""}">${status?esc(status.msg):""}</span></div>
    <h3 class="crith">Derived (read-only)</h3><pre class="yaml ro" aria-label="Derived values">${esc(dl)}</pre>
    <p class="tintro">Share this configuration: <code class="yaml inline">${esc(link)}</code></p>`;
}
function applyCriteria(){
  const ta=document.getElementById("critta"); if(!ta) return;
  const {out,errors,notes}=parseCriteria(ta.value);
  if(errors.length){ renderCriteria({ok:false,msg:errors.join(" · ")}); const t=document.getElementById("critta"); if(t) t.value=ta.value; return; }
  const before={...STATE}; Object.assign(STATE,out); normalize(STATE); writeHash();
  const fixed=Object.keys(out).filter(k=>STATE[k]!==out[k]).map(k=>`${CRIT.find(c=>c.key===k).name} → ${STATE[k]}`);
  const changed=Object.keys(STATE).filter(k=>STATE[k]!==before[k]).length;
  const msg=[`Applied (${changed} change${changed===1?"":"s"}).`,fixed.length?`Adjusted to fit: ${fixed.join(", ")}.`:"",...notes].filter(Boolean).join(" ");
  renderCriteria({ok:true,msg});
}
