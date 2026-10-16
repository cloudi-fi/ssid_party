/* ---------- drawing: characters, bubbles, backgrounds ---------- */
const CH={
  dave:{name:"Dave Ice",color:"var(--c-dave)",acc:"phone"},
  troller:{name:"Conn Troller",color:"var(--c-troller)",acc:"antenna"},
  ray:{name:"Ray Dius",color:"var(--c-ray)",acc:"shades"},
  dippy:{name:"Dee Ashcipee",color:"var(--c-dippy)",acc:"ticket"},
  chippy:{name:"Cee Peahy",color:"var(--c-chippy)",acc:"screen"},
  porter:{name:"Port Al",color:"var(--c-porter)",acc:"bowtie"},
  soso:{name:"Ida Pee",color:"var(--c-soso)",acc:"badge"},
  phyre:{name:"Phyre Wall",color:"var(--c-phyre)",acc:"flame"}
};
const CY=174, W=440, FLOOR=256;

function acc(type,cx,cy){
  const C='stroke="currentColor"', F='fill="currentColor"', S='fill="var(--surface)"';
  switch(type){
    case "phone": return `<rect x="${cx-28}" y="${cy+30}" width="12" height="20" rx="3.5" ${S} ${C} stroke-width="1.5"/><rect x="${cx-25.5}" y="${cy+33}" width="7" height="13" rx="1" ${F} opacity="0.6"/>`;
    case "flame": { const fx=cx+21, fy=cy+38; return `<path d="M${fx} ${fy-22} C${fx+9} ${fy-11} ${fx+8} ${fy} ${fx} ${fy} C${fx-8} ${fy} ${fx-9} ${fy-11} ${fx} ${fy-22} Z" ${F}/><path d="M${fx} ${fy-12} C${fx+4} ${fy-6} ${fx+4} ${fy-1} ${fx} ${fy-1} C${fx-4} ${fy-1} ${fx-4} ${fy-6} ${fx} ${fy-12} Z" fill="#fbbf24"/>`; }
    case "bowtie": return `<path d="M${cx-8} ${cy+18} L${cx} ${cy+22} L${cx-8} ${cy+26} Z M${cx+8} ${cy+18} L${cx} ${cy+22} L${cx+8} ${cy+26} Z" ${F}/>`;
    case "antenna": return `<line x1="${cx-6}" y1="${cy-14}" x2="${cx-10}" y2="${cy-27}" ${C} stroke-width="2" stroke-linecap="round"/><circle cx="${cx-10}" cy="${cy-28}" r="2.4" ${F}/><line x1="${cx+6}" y1="${cy-14}" x2="${cx+10}" y2="${cy-27}" ${C} stroke-width="2" stroke-linecap="round"/><circle cx="${cx+10}" cy="${cy-28}" r="2.4" ${F}/>`;
    case "shades": return `<rect x="${cx-10}" y="${cy-5}" width="9" height="5.5" rx="1.5" fill="var(--ink)"/><rect x="${cx+1}" y="${cy-5}" width="9" height="5.5" rx="1.5" fill="var(--ink)"/><line x1="${cx-1}" y1="${cy-3}" x2="${cx+1}" y2="${cy-3}" stroke="var(--ink)" stroke-width="1.5"/>`;
    case "ticket": return `<g transform="translate(${cx+13},${cy+34})"><rect width="20" height="12" rx="1.5" ${S} ${C} stroke-width="1.5"/><circle cx="0" cy="6" r="2" ${S} ${C} stroke-width="1"/><circle cx="20" cy="6" r="2" ${S} ${C} stroke-width="1"/><line x1="10" y1="2" x2="10" y2="10" ${C} stroke-width="1" stroke-dasharray="1.5 1.5"/></g>`;
    case "screen": return `<rect x="${cx-29}" y="${cy+30}" width="19" height="16" rx="2" ${S} ${C} stroke-width="1.5"/><circle cx="${cx-19.5}" cy="${cy+35}" r="1.3" ${F}/><line x1="${cx-23}" y1="${cy+40}" x2="${cx-16}" y2="${cy+40}" ${C} stroke-width="1.3"/>`;
    case "bell": return `<path d="M${cx+11} ${cy+45} a8 8 0 0 1 16 0 Z" ${S} ${C} stroke-width="1.5"/><rect x="${cx+10}" y="${cy+45}" width="18" height="3" rx="1" ${F}/><circle cx="${cx+19}" cy="${cy+35}" r="1.7" ${F}/>`;
    case "badge": return `<path d="M${cx-29} ${cy+31} l9 -3 l9 3 v6 q0 7.5 -9 11.5 q-9 -4 -9 -11.5 Z" ${S} ${C} stroke-width="1.5"/><path d="M${cx-24} ${cy+39} l3 3 l6 -7" fill="none" ${C} stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`;
    default: return "";
  }
}

// label widths in Inter 500 12px, measured in Chrome; other labels fall back to an estimate
const LABEL_W={"Dave Ice":49.5,"Conn Troller":70.2,"Ray Dius":49.8,"Dee Ashcipee":79.6,"Cee Peahy":61.6,"Port Al":38.5,"Ida Pee":42.4,"Phyre Wall":60.6,
  "Device":39.4,"Controller":56.8,"Firewall":44.2,"RADIUS":44.9,"DHCP":34.1,"CPI":19.8,"Portal":33.7,"IdP (SSO)":55.2};
const labelW=t=>LABEL_W[t]||t.length*6.4;
const LOGO=14, LOGO_GAP=4, CF_LOGO="img/cloudi-fi-logo-mini.svg";
// a name centred on cx, with an optional logo in front of it: an image path, or "emoji:<glyph>"
function nameLabel(cx,y,text,fill,logo){
  const tw=labelW(text), w=logo?LOGO+LOGO_GAP+tw:tw, x0=cx-w/2;
  const t=`font-family="var(--font-sans)" font-weight="500" font-size="12" fill="${fill}"`;
  return `<g class="nm" data-x0="${x0.toFixed(1)}" data-x1="${(x0+w).toFixed(1)}">`+(logo
    ? (logo.startsWith("emoji:") ? `<text x="${x0.toFixed(1)}" y="${y}" font-size="13">${logo.slice(6)}</text>` : `<image href="${logo}" x="${x0.toFixed(1)}" y="${y-LOGO/2-4.5}" width="${LOGO}" height="${LOGO}"/>`)+`<text x="${(x0+LOGO+LOGO_GAP).toFixed(1)}" y="${y}" ${t}>${text}</text>`
    : `<text x="${cx}" y="${y}" text-anchor="middle" ${t}>${text}</text>`)+`</g>`;
}
function figure(key,cx,{band=null,mood="smile",flip=false,headSpin=false,phone=null,antennas=false,cloudHead=false,zombie=false,ours=false}={}){
  const c=CH[key], cy=CY;
  let mouth;
  if(mood==="smile") mouth=`<path d="M${cx-4} ${cy+5} q4 3.5 8 0" fill="none" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round"/>`;
  else if(mood==="open") mouth=`<ellipse cx="${cx}" cy="${cy+6}" rx="2.6" ry="3.2" fill="var(--ink)"/>`;
  else mouth=`<line x1="${cx-4}" y1="${cy+6}" x2="${cx+4}" y2="${cy+6}" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round"/>`;
  if(zombie){
    const Z='stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="4 3"';
    return `<g style="color:${c.color}">
    <line x1="${cx}" y1="${cy+16}" x2="${cx}" y2="${cy+54}" ${Z}/><line x1="${cx}" y1="${cy+26}" x2="${cx-16}" y2="${cy+42}" ${Z}/><line x1="${cx}" y1="${cy+26}" x2="${cx+16}" y2="${cy+42}" ${Z}/><line x1="${cx}" y1="${cy+54}" x2="${cx-12}" y2="${cy+82}" ${Z}/><line x1="${cx}" y1="${cy+54}" x2="${cx+12}" y2="${cy+82}" ${Z}/>
    <circle cx="${cx}" cy="${cy}" r="16" fill="var(--surface)" stroke="currentColor" stroke-width="2.4"/><ellipse cx="${cx-5.5}" cy="${cy-2}" rx="3.2" ry="3.8" fill="var(--ink)"/><ellipse cx="${cx+5.5}" cy="${cy-2}" rx="3.2" ry="3.8" fill="var(--ink)"/><path d="M${cx-6} ${cy+7} l3 -3 l3 3 l3 -3 l3 3" fill="none" stroke="var(--ink)" stroke-width="1.4"/>
    ${key==="dave"?(phone==="iot"?"":`<rect x="${cx-28}" y="${cy+30}" width="12" height="20" rx="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="1.5" stroke-dasharray="3 2"/>`):""}
    ${nameLabel(cx,FLOOR+19,c.name,"var(--ink-2)",ours?CF_LOGO:null)}</g>`;
  }
  const eyes = c.acc==="shades" ? "" :
    `<circle cx="${cx-5}" cy="${cy-2}" r="1.7" fill="var(--ink)"/><circle cx="${cx+5}" cy="${cy-2}" r="1.7" fill="var(--ink)"/>`;
  const bandEl = band ?
    `<rect x="${cx+14.5}" y="${cy+37}" width="8" height="4.5" rx="2" style="fill:var(${band})" stroke="rgba(0,0,0,.18)" stroke-width="0.5"/>` : "";
  let accStr = flip ? "" : acc(c.acc,cx,cy);
  if(antennas) accStr+=acc("antenna",cx,cy);
  if(key==="dave" && phone==="none") accStr="";
  else if(key==="dave" && phone==="iot") accStr=`<rect x="${cx-32}" y="${cy+32}" width="18" height="12" rx="2" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><rect x="${cx-27}" y="${cy+29}" width="7" height="3" rx="1" fill="currentColor"/><circle cx="${cx-23}" cy="${cy+38}" r="3.6" fill="none" stroke="currentColor" stroke-width="1.5"/><circle cx="${cx-23}" cy="${cy+38}" r="1.4" fill="currentColor"/>`;
  else if(key==="dave" && phone==="android") accStr=`<rect x="${cx-28}" y="${cy+30}" width="12" height="20" rx="3.5" fill="var(--surface)" stroke="currentColor" stroke-width="1.5"/><rect x="${cx-25.5}" y="${cy+33}" width="7" height="13" rx="1" fill="#3ddc84"/>`;
  return `<g style="color:${c.color}">
    <line x1="${cx}" y1="${cy+16}" x2="${cx}" y2="${cy+54}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy+26}" x2="${cx-18}" y2="${cy+40}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy+26}" x2="${cx+18}" y2="${cy+40}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy+54}" x2="${cx-14}" y2="${cy+82}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    <line x1="${cx}" y1="${cy+54}" x2="${cx+14}" y2="${cy+82}" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/>
    ${cloudHead
      ? `<path d="M${cx-20} ${cy+14} a8 8 0 0 1 1 -15 a11 11 0 0 1 20 -9 a10 10 0 0 1 16 9 a8 8 0 0 1 2 15 Z" fill="var(--surface)" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/>`
      : headSpin
      ? `<circle cx="${cx}" cy="${cy}" r="16" fill="var(--surface)" stroke="var(--line)" stroke-width="1.5"/><g class="spinner"><circle cx="${cx}" cy="${cy}" r="16" fill="none" stroke="currentColor" stroke-width="2.6" stroke-dasharray="26 74" stroke-linecap="round"/></g>`
      : `<circle cx="${cx}" cy="${cy}" r="16" fill="var(--surface)" stroke="currentColor" stroke-width="2.4"/>`}
    ${eyes}${mouth}${accStr}${bandEl}
    ${nameLabel(cx,FLOOR+19,c.name,"var(--ink-2)",ours?CF_LOGO:null)}
  </g>`;
}

const NB_NAMES=["Port Al","Phyre Wall","Dave Ice","Conn Troller","Ray Dius","Dee Ashcipee","Cee Peahy","Ida Pee"];
const FULL=t=>String(t).replace(/\b(Dave|Conn|Ray|Dee|Cee|Ida|Phyre)\b(?![\u00a0 ](?:Ice|Troller|Dius|Ashcipee|Peahy|Pee|Wall)\b)/g,m=>({Dave:"Dave Ice",Conn:"Conn Troller",Ray:"Ray Dius",Dee:"Dee Ashcipee",Cee:"Cee Peahy",Ida:"Ida Pee",Phyre:"Phyre Wall"})[m]);
const NB=t=>NB_NAMES.reduce((acc,n)=>acc.split(n).join(n.replace(/ /g,"\u00a0")),String(t));
function wrap(t,max){
  const words=t.split(" "); const lines=[]; let cur="";
  for(const w of words){ if((cur+" "+w).trim().length>max){ if(cur)lines.push(cur); cur=w; } else cur=(cur+" "+w).trim(); }
  if(cur)lines.push(cur); return lines;
}
function esc(s){return s.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;");}

function bubble(cx,text,{kind="speech",align="center",top=false,color="var(--c-troller)"}={}){
  const shout=kind==="shout";
  const font = shout?"var(--font-sfx)":"var(--font-comic)";
  const fs = shout?17:14.5;
  const charW = shout?8.6:7.2;
  const maxc = shout?15:18;
  const lines=wrap(NB(text),maxc);
  const padX=11, padY=9, lh=shout?18:19;
  let w=Math.max(...lines.map(l=>l.length))*charW+padX*2; w=Math.max(78,Math.min(w,200));
  const h=lines.length*lh+padY*2;
  const headTop=CY-16;
  let x;
  if(align==="left") x=Math.max(8,Math.min(cx-w/2,214-w));
  else if(align==="right") x=Math.max(226,Math.min(cx-w/2,W-8-w));
  else x=Math.max(8,Math.min(cx-w/2,W-8-w));
  if(x<8)x=8;
  let y=top?6:(headTop-30-h); if(y<6)y=6;
  const tailX=Math.max(x+14,Math.min(cx,x+w-14));
  const stroke = shout?color:"var(--ink)";
  const sw = shout?2.4:1.6;
  const dash = kind==="think"?'stroke-dasharray="4 3"':"";
  let tail;
  if(kind==="think"){
    tail=`<circle cx="${tailX}" cy="${y+h+7}" r="3.2" fill="var(--surface)" stroke="${stroke}" stroke-width="1.2"/><circle cx="${tailX-5}" cy="${y+h+15}" r="2" fill="var(--surface)" stroke="${stroke}" stroke-width="1.2"/>`;
  } else {
    tail=`<path d="M${tailX-7} ${y+h-1} L${tailX+8} ${y+h-1} L${cx} ${headTop-4} Z" fill="var(--surface)" stroke="${stroke}" stroke-width="${sw}" stroke-linejoin="round"/>`;
  }
  const cover = kind==="think"?"":`<rect x="${tailX-8}" y="${y+h-3}" width="17" height="5" fill="var(--surface)"/>`;
  const txt=lines.map((l,i)=>`<text x="${x+padX}" y="${y+padY+(shout?14:14)+i*lh}" font-family="${font}" font-size="${fs}" fill="var(--ink)" ${shout?'letter-spacing="0.5"':''}>${esc(l)}</text>`).join("");
  return `${tail}<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="13" fill="var(--surface)" stroke="${stroke}" stroke-width="${sw}" ${dash}/>${cover}${txt}`;
}

function spinnerAt(cx,cy){
  return `<g class="spinner" transform="translate(${cx},${cy})"><circle r="8" fill="none" stroke="var(--line)" stroke-width="2.4"/><path d="M0 -8 A8 8 0 0 1 8 0" fill="none" stroke="var(--c-porter)" stroke-width="2.4" stroke-linecap="round"/></g>`;
}

function rayDesk(cx,ours=false){
  const cy=CY, C='stroke="currentColor"';
  const II='stroke="var(--ink-2)"', SURF='fill="var(--surface)"';
  const L=(x1,y1,x2,y2)=>`<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" ${C} stroke-width="2.4" stroke-linecap="round"/>`;
  let s=`<g>`;
  s+=`<g style="color:var(--c-ray)">`;
  s+=L(cx,cy+16,cx,214)+L(cx,214,cx-13,226)+L(cx,214,cx+13,226)+L(cx-13,226,cx-13,254)+L(cx+13,226,cx+13,254)+L(cx-13,254,cx-20,256)+L(cx+13,254,cx+20,256);
  s+=L(cx,cy+26,cx-22,208)+L(cx,cy+26,cx+9,208);
  s+=`</g>`;
  s+=`<rect x="${cx-66}" y="216" width="94" height="8" rx="1" ${SURF} ${II} stroke-width="1.3"/>`;
  s+=`<line x1="${cx-58}" y1="224" x2="${cx-58}" y2="${FLOOR}" ${II} stroke-width="1.3"/>`;
  s+=`<line x1="${cx+24}" y1="224" x2="${cx+24}" y2="${FLOOR}" ${II} stroke-width="1.3"/>`;
  s+=`<rect x="${cx-50}" y="194" width="74" height="22" rx="2" fill="var(--c-ray)"/>`;
  s+=`<rect x="${cx-47}" y="197" width="68" height="16" ${SURF}/>`;
  s+=`<line x1="${cx-13}" y1="197" x2="${cx-13}" y2="213" ${II} stroke-width="1"/>`;
  for(const yy of [201,205,209]){
    s+=`<line x1="${cx-43}" y1="${yy}" x2="${cx-18}" y2="${yy}" ${II} stroke-width="0.8"/>`;
    s+=`<line x1="${cx-8}" y1="${yy}" x2="${cx+17}" y2="${yy}" ${II} stroke-width="0.8"/>`;
  }
  s+=`<g style="color:var(--c-ray)">`;
  s+=`<circle cx="${cx}" cy="${cy}" r="16" fill="var(--surface)" ${C} stroke-width="2.4"/>`;
  s+=`<rect x="${cx-10}" y="${cy-5}" width="9" height="5.5" rx="1.5" fill="var(--ink)"/><rect x="${cx+1}" y="${cy-5}" width="9" height="5.5" rx="1.5" fill="var(--ink)"/><line x1="${cx-1}" y1="${cy-3}" x2="${cx+1}" y2="${cy-3}" stroke="var(--ink)" stroke-width="1.5"/>`;
  s+=`<path d="M${cx-4} ${cy+5} q4 3.5 8 0" fill="none" stroke="var(--ink)" stroke-width="1.3" stroke-linecap="round"/>`;
  s+=`</g>`;
  s+=nameLabel(cx,FLOOR+19,CH.ray.name,"var(--ink-2)",ours?CF_LOGO:null);
  return s+`</g>`;
}


const IN='stroke="var(--ink-2)"', LN='stroke="var(--line)"', SF='fill="var(--surface)"', S2='fill="var(--surface-2)"', NF='fill="none"';
function floor(){ return `<line x1="0" y1="${FLOOR}" x2="${W}" y2="${FLOOR}" stroke="var(--line)" stroke-width="1.5"/>`; }
function disco(x){ return `<line x1="${x}" y1="24" x2="${x}" y2="52" ${IN} stroke-width="1"/><circle cx="${x}" cy="62" r="11" ${SF} ${IN} stroke-width="1.2"/><line x1="${x-11}" y1="62" x2="${x+11}" y2="62" ${IN} stroke-width="0.8"/><line x1="${x}" y1="51" x2="${x}" y2="73" ${IN} stroke-width="0.8"/><line x1="${x-8}" y1="56" x2="${x+8}" y2="68" ${IN} stroke-width="0.6"/><line x1="${x-8}" y1="68" x2="${x+8}" y2="56" ${IN} stroke-width="0.6"/>`; }
function inside(){ return `<rect x="0" y="0" width="${W}" height="${FLOOR}" ${S2}/>` + notes(396,40) + floor(); }
// top of every door (entrance, inside view, dancefloor); the signs sit right above it as lintels
const DOOR_TOP=66;
// extra width added to every door on its left side (right edge unchanged)
const DOOR_EXTRA=12;
function door(){ return `<rect x="${282-DOOR_EXTRA}" y="${DOOR_TOP}" width="${76+DOOR_EXTRA}" height="${FLOOR-DOOR_TOP}" ${S2} ${IN} stroke-width="1.2"/>`
  // the SSID_PARTY sign is the entrance's lintel
  + `<rect x="${276-DOOR_EXTRA}" y="${DOOR_TOP-18}" width="${88+DOOR_EXTRA}" height="18" rx="3" ${SF} ${IN} stroke-width="1.5"/>`
  + `<text x="${320-DOOR_EXTRA/2}" y="${DOOR_TOP-4}" text-anchor="middle" font-family="var(--font-sfx)" font-size="13" fill="var(--ink)" letter-spacing="0.5">SSID_PARTY</text>`
  + notes(290,100)
  + floor(); }
function doorInside(){ return `<rect x="0" y="0" width="${W}" height="${FLOOR}" ${S2}/>`
  + `<rect x="${70-DOOR_EXTRA}" y="${DOOR_TOP}" width="${66+DOOR_EXTRA}" height="${FLOOR-DOOR_TOP}" ${SF}/>`
  + `<rect x="${60-DOOR_EXTRA}" y="${DOOR_TOP-2}" width="10" height="${FLOOR-DOOR_TOP+2}" ${SF} ${IN} stroke-width="1.3"/>`
  + `<rect x="136" y="${DOOR_TOP-2}" width="10" height="${FLOOR-DOOR_TOP+2}" ${SF} ${IN} stroke-width="1.3"/>`
  + `<rect x="${54-DOOR_EXTRA}" y="${DOOR_TOP-14}" width="${98+DOOR_EXTRA}" height="14" ${SF} ${IN} stroke-width="1.3"/>`
  + notes(396,40)
  + floor(); }
function booth(x){ return `<rect x="${x-54}" y="96" width="108" height="${FLOOR-96}" ${SF} ${IN} stroke-width="1.5"/><rect x="${x-54}" y="96" width="108" height="20" ${S2}/><text x="${x}" y="110" text-anchor="middle" font-family="var(--font-sans)" font-weight="500" font-size="11" fill="var(--ink-2)">ID CHECK</text><line x1="${x-54}" y1="206" x2="${x+54}" y2="206" ${IN} stroke-width="1.2"/>`; }
function counter(x,bell){ let b=bell?`<path d="M${x+40} 206 a7 7 0 0 1 14 0 Z" ${SF} ${IN} stroke-width="1.2"/><rect x="${x+39}" y="206" width="16" height="2.5" ${IN} fill="var(--ink-2)"/>`:`<rect x="${x-44}" y="188" width="10" height="7" rx="1" ${SF} ${IN} stroke-width="1"/><rect x="${x-30}" y="188" width="10" height="7" rx="1" ${SF} ${IN} stroke-width="1"/>`; return `<rect x="${x-56}" y="208" width="120" height="18" rx="2" ${SF} ${IN} stroke-width="1.3"/>`+b; }
function kiosk(x){ return `<rect x="${x+28}" y="150" width="8" height="100" ${S2} ${IN} stroke-width="1"/><rect x="${x+8}" y="110" width="50" height="46" rx="4" ${SF} ${IN} stroke-width="1.3"/><circle cx="${x+22}" cy="126" r="2.5" fill="var(--ink-2)"/><line x1="${x+16}" y1="138" x2="${x+50}" y2="138" ${IN} stroke-width="1.2"/><line x1="${x+16}" y1="146" x2="${x+42}" y2="146" ${IN} stroke-width="1.2"/>`; }
function notes(x,dy=0){ return `<g ${IN} stroke-width="1.4" transform="translate(0,${dy})"><circle cx="${x}" cy="96" r="3.4" fill="var(--ink-2)"/><line x1="${x+3.2}" y1="96" x2="${x+3.2}" y2="80"/><path d="M${x+3.2} 80 q7 2 7 9" ${NF}/><circle cx="${x+22}" cy="110" r="3" fill="var(--ink-2)"/><line x1="${x+24.8}" y1="110" x2="${x+24.8}" y2="96"/></g>`; }
const DARK="#232327";
function danceLights(x){ return `<circle cx="${x-16}" cy="118" r="3" fill="#f0586d"/><circle cx="${x+12}" cy="138" r="3" fill="#4d9bf0"/><circle cx="${x-4}" cy="168" r="3" fill="#f0c24d"/><circle cx="${x+16}" cy="108" r="2.6" fill="#6ed08a"/><circle cx="${x-18}" cy="150" r="2.4" fill="#b07df0"/>`; }
function danceDoor(x){ return `<rect x="${x-28-DOOR_EXTRA}" y="${DOOR_TOP}" width="${56+DOOR_EXTRA}" height="${FLOOR-DOOR_TOP}" fill="${DARK}"/>`
  + danceLights(x-DOOR_EXTRA/2)
  + `<rect x="${x-38-DOOR_EXTRA}" y="${DOOR_TOP}" width="10" height="${FLOOR-DOOR_TOP}" ${SF} ${IN} stroke-width="1.3"/>`
  + `<rect x="${x+28}" y="${DOOR_TOP}" width="10" height="${FLOOR-DOOR_TOP}" ${SF} ${IN} stroke-width="1.3"/>`
  // the INTERNET sign is the door's lintel
  + `<rect x="${x-44-DOOR_EXTRA}" y="${DOOR_TOP-18}" width="${88+DOOR_EXTRA}" height="18" rx="3" ${SF} ${IN} stroke-width="1.3"/>`
  + `<text x="${x-DOOR_EXTRA/2}" y="${DOOR_TOP-4}" text-anchor="middle" font-family="var(--font-sfx)" font-size="13" fill="var(--ink)" letter-spacing="1">INTERNET</text>`
  + notes(x-78); }
function danceDoorHall(x){ return `<rect x="0" y="0" width="${W}" height="${FLOOR}" ${S2}/>` + danceDoor(x) + floor(); }
function danceFloorScene(){ let t=""; for(let i=0;i<6;i++){ if(i%2===0) t+=`<rect x="${302+i*21}" y="230" width="21" height="26" fill="#2f2f34"/>`; }
  return `<rect x="0" y="0" width="${W}" height="${FLOOR}" ${S2}/>`
  + `<rect x="296" y="0" width="${W-296}" height="${FLOOR}" fill="${DARK}"/>`
  + `<rect x="290" y="72" width="12" height="${FLOOR-72}" ${SF} ${IN} stroke-width="1.3"/>`
  + `<line x1="380" y1="0" x2="380" y2="50" stroke="#8a8a92" stroke-width="1"/>`
  + `<circle cx="380" cy="60" r="11" fill="#d9d9de" stroke="#8a8a92" stroke-width="1.2"/><line x1="369" y1="60" x2="391" y2="60" stroke="#8a8a92" stroke-width="0.8"/><line x1="380" y1="49" x2="380" y2="71" stroke="#8a8a92" stroke-width="0.8"/>`
  + danceLights(360) + t + notes(316) + floor(); }

function cloudSign(x){ return `<path d="M${x-17} 68 a7 7 0 0 1 2-13 a10 10 0 0 1 18-4 a8 8 0 0 1 13 7 a6 6 0 0 1 -1 10 Z" fill="var(--surface)" stroke="var(--c-phyre)" stroke-width="1.6" stroke-linejoin="round"/>`; }
function skeleton(cx){
  const cy=CY, C='stroke="var(--ink-2)" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="4 3"';
  return `<g opacity="0.9"><line x1="${cx}" y1="${cy+16}" x2="${cx}" y2="${cy+54}" ${C}/><line x1="${cx}" y1="${cy+26}" x2="${cx-16}" y2="${cy+42}" ${C}/><line x1="${cx}" y1="${cy+26}" x2="${cx+16}" y2="${cy+42}" ${C}/><line x1="${cx}" y1="${cy+54}" x2="${cx-12}" y2="${cy+82}" ${C}/><line x1="${cx}" y1="${cy+54}" x2="${cx+12}" y2="${cy+82}" ${C}/>
  <circle cx="${cx}" cy="${cy}" r="15" fill="var(--surface)" stroke="var(--ink-2)" stroke-width="2.2"/><ellipse cx="${cx-5.5}" cy="${cy-2}" rx="3.2" ry="3.8" fill="var(--ink-2)"/><ellipse cx="${cx+5.5}" cy="${cy-2}" rx="3.2" ry="3.8" fill="var(--ink-2)"/><path d="M${cx-6} ${cy+7} l3 -3 l3 3 l3 -3 l3 3" fill="none" stroke="var(--ink-2)" stroke-width="1.4"/></g>`;
}
function bg(type){
  switch(type){
    case "door": return door();
    case "door-ray": return door();
    case "door-inside": return doorInside();
    case "door-inside-fw": return `<g transform="translate(46,0)">${doorInside()}</g><rect x="0" y="0" width="46" height="${FLOOR}" ${S2}/>`+floor();
    case "threshold-fw": return door();
    case "threshold": return door();
    case "cloakroom": return inside()+counter(320,false);
    case "cloakroom-z": return inside()+counter(275,false)+skeleton(372)+skeleton(406);
    case "kiosk": return inside()+kiosk(300);
    case "reception": return inside()+counter(320,true);
    case "booth": return inside()+booth(330);
    case "interior": return inside();
    case "dance-door": return danceDoorHall(380);
    case "dance-door-cloud": return danceDoorHall(380);
    case "dancefloor-cloud": return danceDoorHall(380);
    case "dance-wall": return danceDoorHall(380)+`<g transform="translate(${-DOOR_EXTRA},0)"><rect x="326" y="${DOOR_TOP+6}" width="7" height="${FLOOR-DOOR_TOP-6}" rx="2" fill="var(--surface)" fill-opacity="0.6" stroke="var(--ink-2)" stroke-width="1.2" stroke-dasharray="4 3"/><g stroke="var(--ink)" stroke-width="1.6" stroke-linecap="round"><line x1="322" y1="158" x2="316" y2="150"/><line x1="323" y1="174" x2="316" y2="174"/><line x1="322" y1="190" x2="316" y2="198"/></g></g>`;
    case "dancefloor": return danceDoorHall(380);
    default: return floor();
  }
}
