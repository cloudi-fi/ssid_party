/* ---------- story graph: criteria, nodes, path resolution (no DOM) ---------- */
const LANES=["dave","troller","phyre","ray","dippy","chippy","porter","sponsor","soso"];
const TECH={dave:"Device",troller:"Controller",phyre:"Firewall",ray:"RADIUS",dippy:"DHCP",chippy:"CPI",porter:"Portal",sponsor:"Sponsor",soso:"IdP (SSO)"};

const CHOICES={
  // the network Dave joins, chosen in the page title: the open captive-portal SSID or the 802.1X one
  ssid:{q:"Which SSID",tq:"SSID",opts:[
    {v:"open",label:"SSID_PARTY",t:"SSID_PARTY · open",sub:"Night at the Captive Portal."},
    {v:"secure",label:"SSID_PARTY_SECURE 🔒",t:"SSID_PARTY_SECURE · 802.1X",sub:"Keys Wide Shut."}]},
  os:{q:"What if Dave…",tq:"Device OS",opts:[
    {v:"ios",label:"carries an iPhone",t:"iOS"},
    {v:"android",label:"carries an Android phone",t:"Android"},
    {v:"iot",label:"is a network printer (no captive detection)",t:"IoT printer · no CPD"}]},
  method:{q:"What if Dave…",tq:"EAP method",opts:[
    {v:"tls",label:"carries a certificate (EAP-TLS)",t:"EAP-TLS · client certificate",when:s=>secure(s)},
    {v:"ttls",label:"has a login and password (EAP-TTLS)",t:"EAP-TTLS · password",when:s=>secure(s)}]},
  idsrc:{q:"What if Ida…",tq:"Identity source",opts:[
    {v:"ldap",label:"is the customer's LDAP directory",t:"LDAP",when:s=>secure(s)&&s.method==="ttls"},
    {v:"entraid",label:"is the customer's Entra ID, in the cloud",t:"Entra ID",when:s=>secure(s)&&s.method==="ttls"},
    {v:"guest",label:"keeps Cloudi-Fi guest accounts (made at the lobby)",t:"Cloudi-Fi guest account",when:s=>secure(s)&&s.method==="ttls"}]},
  creds:{q:"What if Dave's credentials…",tq:"Credentials check",opts:[
    {v:"ok",label:"check out",t:"valid",when:s=>secure(s)},
    {v:"bad",label:"don't check out (wrong password, unknown CA, expired certificate)",t:"rejected",when:s=>secure(s)}]},
  nac:{q:"What if Ray…",tq:"NAC policy",opts:[
    {v:"allow",label:"lets him in (NAC policy: allow)",t:"allow · VLAN 20",when:s=>secure(s)&&s.creds==="ok"},
    {v:"deny",label:"turns him away (NAC policy: deny)",t:"deny",when:s=>secure(s)&&s.creds==="ok"},
    {v:"blacklist",label:"has Dave's device on the blacklist",t:"device blacklisted",when:s=>secure(s)&&s.creds==="ok"}]},
  dhcp:{q:"What if Dee…",tq:"DHCP lease",opts:[
    {v:"ok",label:"has a free address",t:"free address",group:"On-prem DHCP · plain lease, no MAC triage"},
    {v:"conflict",label:"remembers Dave, but his old IP is taken",t:"previous IP taken",group:"On-prem DHCP · plain lease, no MAC triage"},
    {v:"exhausted",label:"has run out of addresses",t:"pool exhausted",group:"On-prem DHCP · plain lease, no MAC triage"},
    {v:"quarantine",label:"puts him in quarantine",t:"cloud · quarantine",group:"Cloud DHCP (Cloudi-Fi) · MAC triage: quarantine / whitelist / blacklist"},
    {v:"whitelist",label:"has him on the whitelist",t:"cloud · whitelist",group:"Cloud DHCP (Cloudi-Fi) · MAC triage: quarantine / whitelist / blacklist"},
    {v:"blacklist",label:"has him on the blacklist",t:"cloud · blacklist",group:"Cloud DHCP (Cloudi-Fi) · MAC triage: quarantine / whitelist / blacklist"},
    {v:"zombies",label:"has a quarantine full of zombies",t:"cloud · quarantine full",group:"Cloud DHCP (Cloudi-Fi) · MAC triage: quarantine / whitelist / blacklist"}]},
  hack:{q:"What if Dave…",tq:"Static IP bypass",opts:[
    {v:"no",label:"keeps asking for a lease",t:"keeps retrying",when:s=>s.dhcp==="blacklist"},
    {v:"yes",label:"sets a static IP in the whitelist range",t:"static IP in whitelist range",when:s=>s.dhcp==="blacklist"}]},
  snooping:{q:"What if the controller…",tq:"DHCP snooping / IP source guard",opts:[
    {v:"no",label:"forwards any address",t:"off",when:s=>s.dhcp==="blacklist"&&s.hack==="yes"},
    {v:"yes",label:"only forwards DHCP-learned addresses",t:"on",when:s=>s.dhcp==="blacklist"&&s.hack==="yes"}]},
  o114:{q:"What if the DHCP lease…",tq:"DHCP option 114",opts:[
    {v:"yes",label:"includes option 114 (CPI URL)",t:"present",when:s=>s.os!=="iot",group:"With CPI · DHCP option 114 (RFC 8910) carries the Captive Portal API URL (RFC 8908)"},
    {v:"no",label:"has no option 114",t:"absent",when:s=>s.os!=="iot",group:"Without CPI · the OS falls back to its probe (captive.apple.com, connectivitycheck.gstatic.com)"}]},
  visit:{q:"What if Dave…",tq:"Visit",opts:[
    {v:"first",label:"is here for the first time",t:"first visit",when:s=>s.os==="ios"&&s.o114==="yes"},
    {v:"returning",label:"comes back after a CNA bypass",t:"returning · iOS remembers 'not captive'",when:s=>s.os==="ios"&&s.o114==="yes"}]},
  done:{q:"What if Dave…",tq:"CNA 'Done' button",opts:[
    {v:"no",label:"taps Port Hal's button",t:"portal button",when:s=>s.os!=="iot"},
    {v:"yes",label:"taps 'Done' instead",t:"taps 'Done'",when:s=>s.os!=="iot"}]},
  reg:{q:"What if Port Hal…",tq:"Registration method",opts:[
    {when:s=>s.os!=="iot",v:"form",label:"only asks for a form",t:"declarative form"},
    {when:s=>s.os!=="iot",v:"sms",label:"sends a code by SMS",t:"SMS OTP"},
    {when:s=>s.os!=="iot",v:"email",label:"emails credentials",t:"credentials by email"},
    {when:s=>s.os!=="iot",v:"sponsor",label:"asks a sponsor to approve Dave",t:"sponsor approval"},
    {when:s=>s.os!=="iot",v:"sso",label:"offers SSO with Ida Pee",t:"SSO"},
    {when:s=>s.os!=="iot",v:"mfa",label:"offers SSO with a second factor",t:"SSO + MFA app"},
    {when:s=>s.os!=="iot",v:"passkey",label:"offers SSO with Face ID / Touch ID",t:"SSO + passkey (WebAuthn)"}]},
  // the sponsor (Spencer): contacted by email with a link to an approval page, where he picks Dave's profile
  // what Spencer does with the email: opens the link, signs in with the IdP first (if the customer requires it), or nothing
  spauth:{q:"What if Spencer…",tq:"Sponsor",opts:[
    {v:"none",label:"opens the approval link as is",t:"opens the link",when:s=>s.os!=="iot"&&s.reg==="sponsor"},
    {v:"sso",label:"signs in with the company IdP first",t:"signs in first (SAML)",when:s=>s.os!=="iot"&&s.reg==="sponsor"},
    {v:"silent",label:"is in a meeting and never answers",t:"no answer",when:s=>s.os!=="iot"&&s.reg==="sponsor"}]},
  spans:{q:"What if Spencer…",tq:"Sponsor's answer",opts:[
    {v:"approve",label:"approves Dave and picks his profile",t:"approves · profile",when:s=>s.os!=="iot"&&s.reg==="sponsor"&&s.spauth!=="silent"},
    {v:"refuse",label:"refuses",t:"refuses",when:s=>s.os!=="iot"&&s.reg==="sponsor"&&s.spauth!=="silent"}]},
  spwait:{q:"What if Dave…",tq:"While the sponsor decides",opts:[
    {v:"stays",label:"waits on the page",t:"stays on the page",when:s=>s.os!=="iot"&&s.reg==="sponsor"&&s.spauth!=="silent"&&s.spans==="approve"},
    {v:"leaves",label:"wanders off in the meantime",t:"leaves the page",when:s=>s.os!=="iot"&&s.reg==="sponsor"&&s.spauth!=="silent"&&s.spans==="approve"}]},
  smsexit:{q:"What if Dave…",tq:"SMS notification",opts:[
    {when:s=>s.os!=="iot",v:"type",label:"types the code right in the portal",t:"types code"},
    {when:s=>s.os!=="iot",v:"tap",label:"taps the SMS notification",t:"taps notification"}]},
  vendor:{q:"Controller vendor",tq:"Controller vendor",opts:[
    {v:"cisco-wlc",label:"Cisco WLC",t:"Cisco WLC"},
    {v:"aruba",label:"Aruba",t:"Aruba"},
    {v:"meraki",label:"Meraki",t:"Meraki"},
    {v:"mist",label:"Juniper Mist",t:"Mist"},
    {v:"ruckus-ap",label:"Ruckus AP",t:"Ruckus AP"},
    {v:"ruckus-smartzone",label:"Ruckus SmartZone",t:"Ruckus SmartZone"},
    {v:"fortigate",label:"FortiGate",t:"FortiGate"}]},
  integ:{q:"What if Conn…",tq:"Enforcement point",opts:[
    {v:"controller",label:"doesn't check MACs at the door",t:"controller · no MAB",group:"Controller · captive portal (RADIUS at login, except Meraki grant URL and Mist signed URL)"},
    {v:"controllerMab",label:"checks MACs with RADIUS at the door (MAB)",t:"controller · MAB",group:"Controller · captive portal (RADIUS at login, except Meraki grant URL and Mist signed URL)"},
    {v:"mabOnly",label:"runs a MAB-only SSID",t:"controller · MAB-only SSID",group:"Controller · MAB only, no portal"},
    {v:"fwLocal",label:"hands over to the on-site FortiGate",t:"FortiGate on site · no MAB",group:"On-site firewall · FortiGate, external captive portal + RADIUS"},
    {v:"fwLocalMab",label:"hands over to the on-site FortiGate, which checks MACs (MAB)",t:"FortiGate on site · MAB",group:"On-site firewall · FortiGate, external captive portal + RADIUS"},
    {v:"fwBoth",label:"is the FortiGate itself",t:"FortiGate controller + firewall · no MAB",group:"On-site firewall · FortiGate, external captive portal + RADIUS",when:s=>s.vendor==="fortigate"},
    {v:"fwBothMab",label:"is the FortiGate itself and checks MACs (MAB)",t:"FortiGate controller + firewall · MAB",group:"On-site firewall · FortiGate, external captive portal + RADIUS",when:s=>s.vendor==="fortigate"},
    {v:"cloud",label:"lets a cloud firewall decide",t:"cloud firewall",group:"Cloud firewall · SAML, IP surrogate — vendor chosen at the dancefloor door"}]},
  mlogin:{q:"What if Meraki…",tq:"Meraki hand-back",opts:[
    {v:"grant",label:"authorizes Dave through its grant URL (click-through)",t:"grant URL",when:s=>s.vendor==="meraki"&&ctrl(s)},
    {v:"radius",label:"logs Dave in through RADIUS",t:"RADIUS login",when:s=>s.vendor==="meraki"&&ctrl(s)}]},
  radius:{q:"What if Ray…",tq:"MAB · Dave's MAC",opts:[
    {v:"unknown",label:"doesn't know Dave's MAC",t:"MAB · MAC unknown",when:s=>rayCheckers(s)},
    {v:"known",label:"already knows Dave (MAB)",t:"MAB · MAC known",when:s=>rayCheckers(s)}]},
  qpolicy:{q:"What if Meraki…",tq:"Meraki group policy cloudifi-Quarantine",opts:[
    {v:"defined",label:"has the cloudifi-Quarantine group policy",t:"defined",when:s=>merakiMab(s)&&s.radius==="unknown"},
    {v:"missing",label:"has no cloudifi-Quarantine group policy",t:"missing",when:s=>merakiMab(s)&&s.radius==="unknown"}]},
  fwvendor:{q:"Firewall vendor",tq:"Firewall vendor",opts:[
    {v:"zscaler",label:"Zscaler",t:"Zscaler",when:s=>s.integ==="cloud",group:"Cloud · SAML IdP-initiated (Zscaler) / SP-initiated (Netskope), IP surrogate"},
    {v:"netskope",label:"Netskope",t:"Netskope",when:s=>s.integ==="cloud",group:"Cloud · SAML IdP-initiated (Zscaler) / SP-initiated (Netskope), IP surrogate"},
    {v:"fortigate",label:"FortiGate",t:"FortiGate",when:s=>fwL(s),group:"On site · external captive portal + RADIUS"}]},
  transient:{q:"What if Port Hal…",tq:"Portal · transient profile",opts:[
    {when:s=>s.os!=="iot",v:"no",label:"shows the form right away",t:"classic"},
    {when:s=>s.os!=="iot",v:"yes",label:"hands out a transient pass first",t:"transient"}]},
  // last: whether the story reaches this step depends on most criteria above
  browse:{q:"What if Dave…",tq:"After the sign-in app closes",opts:[
    {v:"stay",label:"waits for something to happen",t:"waits",when:s=>reachesHandsFree(s)},
    {v:"http",label:"thinks of opening an HTTP-only site (3wi.fi)",t:"opens an HTTP-only site",when:s=>reachesHandsFree(s)}]}
};
// the 802.1X SSID has no captive portal: the portal-side criteria don't apply there (normalize resets them to their default)
const secure=s=>s.ssid==="secure";
const OPEN_ONLY=["dhcp","hack","snooping","o114","visit","done","reg","smsexit","browse","spauth","spans","spwait","integ","mlogin","radius","qpolicy","fwvendor","transient"];
for(const k of OPEN_ONLY) for(const o of CHOICES[k].opts){ const w=o.when; o.when=w?s=>!secure(s)&&w(s):s=>!secure(s); }
// links shared before MAB moved to the enforcement criterion: rewrite old hash values in place
function legacyHash(h){
  const r=h.get("radius"), i=h.get("integ");
  if(i==="noRadius") h.set("integ","controller");
  if(r==="open"||r==="reject"||r==="mab"){
    h.set("radius",r==="mab"?"known":"unknown");
    if(!i||i==="radius") h.set("integ","controllerMab"); else if(i==="fwLocal"||i==="fwBoth") h.set("integ",i+"Mab");
  } else if(i==="radius") h.set("integ","controllerMab");
}
const DEF={ssid:"open",os:"ios",method:"tls",idsrc:"ldap",creds:"ok",nac:"allow",vendor:"cisco-wlc",integ:"controller",mlogin:"grant",fwvendor:"zscaler",transient:"no",radius:"unknown",qpolicy:"defined",dhcp:"ok",hack:"no",snooping:"no",visit:"first",o114:"no",done:"no",reg:"form",smsexit:"type",browse:"stay",spauth:"none",spans:"approve",spwait:"stays"};
const TITLES={
  os:{ios:"An iPhone rolls up to the club.",android:"An Android phone rolls up to the club.",iot:"A network printer rolls up to the club."},
  radius:{unknown:s=>merakiMab(s)?"Ray lets him through anyway.":s.integ==="mabOnly"?"Ray doesn't know him — out.":"Ray says no.",known:"Ray already knows Dave."},
  qpolicy:{defined:"Conn shrugs and waves him in.",missing:"Conn turns him away."},
  mlogin:{grant:"Port Hal's word is enough.",radius:"One last double-check."},
  dhcp:{ok:"Dee hands him an address.",conflict:"Dee remembers him — new address.",exhausted:"Dee is out of addresses.",quarantine:"Dee, from the cloud, puts him in quarantine.",whitelist:"Dee, from the cloud, has him on the whitelist.",blacklist:"Dee, from the cloud, has him on the blacklist.",zombies:"Dee, from the cloud, is out of addresses — zombies."},
  hack:{no:"Dave keeps asking, forever.",yes:"Dave picks his own address."},
  method:{tls:"Dave shows his own certificate.",ttls:"Dave whispers his password."},
  nac:{allow:"Ray says yes.",deny:"Ray says no.",blacklist:s=>`Ray knows that ${dev(s)}.`},
  creds:{ok:s=>s.method==="ttls"?"Ida vouches for him.":"Signed by his company.",bad:s=>s.method==="ttls"?"Ida doesn't buy it.":"Signed by a stranger."},
  idsrc:{ldap:"Ida Pee checks her directory.",entraid:"Ida Pee answers from the cloud.",guest:"Ida Pee checks the guest accounts."},
  visit:{first:"Dave checks the kiosk.",returning:"Dave doesn't bother checking."},
  snooping:{no:s=>`${greetK(s)==="phyre"?"Phyre Wall":"Conn Troller"} doesn't notice the new address.`,yes:s=>`${greetK(s)==="phyre"?"Phyre Wall":"Conn Troller"} drops the unlearned address.`},
  o114:{yes:"Dee adds a note to the ticket.",no:"No note this time."},
  done:{no:"Dave taps Port Hal's button.",yes:"Dave taps 'Done' instead."},
  reg:{form:"Port Hal hands over a form.",sms:"Port Hal asks for a phone number.",email:"Port Hal asks for an email address.",sponsor:"Port Hal asks for a sponsor.",sso:"Port Hal offers SSO with Ida Pee.",mfa:"Port Hal offers SSO, with a second factor.",passkey:"Port Hal offers SSO with Face ID."},
  smsexit:{type:"Dave types the code.",tap:"Dave taps the notification."},
  spauth:{none:"Spencer opens the link.",sso:"Spencer checks in with Ida Pee.",silent:"Spencer is in a meeting."},
  spans:{approve:"Spencer says yes.",refuse:"Spencer says no."},
  spwait:{stays:"Dave waits at the desk.",leaves:"Dave wanders off."},
  browse:{stay:"Dave waits for something to happen.",http:"Dave tries 3wi.fi himself."},
  integ:{controller:s=>usesRadius(s)?"Conn doesn't even ask Ray.":"Conn skips the list.",controllerMab:"Conn checks with the list.",mabOnly:"Conn checks with the list — MAB-only SSID, no portal.",fwLocal:"Conn steps aside — Phyre Wall, on site, doesn't even ask Ray.",fwLocalMab:"Conn steps aside — Phyre Wall, on site, checks with the list.",fwBothMab:"Phyre Wall does it all — and checks with the list.",fwBoth:"Phyre Wall does it all — and doesn't even ask Ray.",cloud:"Conn waves everyone in — Phyre Wall checks from the cloud."},
  fwvendor:{zscaler:"Phyre Wall is a Zscaler.",netskope:"Phyre Wall is a Netskope.",fortigate:"Phyre Wall is a FortiGate."},
  transient:{no:"Port Hal shows the form right away.",yes:"Port Hal hands out a visitor pass."},
  vendor:Object.fromEntries([["cisco-wlc","a Cisco WLC"],["aruba","an Aruba"],["meraki","a Meraki"],["mist","a Juniper Mist"],["ruckus-ap","a Ruckus AP"],["ruckus-smartzone","a Ruckus SmartZone"],["fortigate","a FortiGate"]].map(([v,n])=>[v,s=>secure(s)?`Dave gives his name to ${n}.`:`Dave hands his MAC to ${n}.`]))
};
for(const k in TITLES) CHOICES[k].opts.forEach(o=>o.title=TITLES[k][o.v]);

// what Dave is, in a sentence: not always a phone (laptops will come with Windows and macOS)
const DEVICE_NOUN={ios:"phone",android:"phone",iot:"printer"};
const dev=s=>DEVICE_NOUN[s.os]||"device";
const ios=s=>s.os==="ios", br=s=>ios(s)?"Safari":"Chrome", mini=s=>ios(s)?"the CNA mini-browser":"Android's sign-in app";
const sso=s=>s.reg==="sso"||s.reg==="mfa"||s.reg==="passkey";
const V=(x,s)=>typeof x==="function"?x(s):x;
const C=(base,o)=>Object.assign({},base,o);

const N={};
N.n1={choice:"os",narr:"A new device rolls up to the club.",loc:"outside",bg:s=>secure(s)?"door-secure":"door",tag:"802.11 · assoc",
  note:s=>secure(s)?"Device associates to the 802.1X SSID — on the air, but nothing except EAP gets through until it proves who it is.":"Device associates to the SSID — on the air, but no IP and no access yet.",
  a:s=>secure(s)?[{k:"dave",x:170,b:"Hi, can I join SSID_PARTY_SECURE?",al:"left"},{k:"troller",x:340,b:"Members only. Who are you?",al:"right"}]
    :[{k:"dave",x:170,b:"Hi, can I join SSID_PARTY?",al:"left"},{k:greetK(s),x:340,b:"Welcome, what's your MAC?",al:"right"}],
  seq:s=>[{f:"dave",t:greetK(s),l:secure(s)?"Association Request (SSID_PARTY_SECURE · WPA2-Enterprise)":"Association Request (SSID_PARTY)"}],next:"dSsid"};
N.dSsid={dec:"SSID?",next:{k:"ssid",map:{open:"n2",secure:"x2"}}};
N.n2={choice:"vendor",narr:"Dave hands over his MAC.",loc:"at the door",bg:"door",tag:"L2 · MAC",
  note:s=>`The ${VNAME[s.vendor]} ${fwBo(s)?"box":"controller"} identifies the device by its MAC address.${cloud(s)?"":s.vendor==="mist"?" Mist hands sessions back with a signed URL: no RADIUS at login.":s.vendor==="meraki"?" Meraki hands sessions back through its grant URL or a RADIUS login.":" This vendor needs RADIUS at login; checking the MAC at association (MAB) is optional."}`,
  a:s=>[{k:"dave",x:170,b:"AA:BB:CC:11:22",al:"left"},{k:greetK(s),x:340,b:"OK, wait a sec.",al:"right"}],
  seq:s=>[{f:greetK(s),t:greetK(s),l:"learns MAC AA:BB:CC:11:22"}],next:"dInteg"};
N.n3={choice:"integ",narr:"Conn checks with the list.",loc:"inside, at the door",bg:s=>fwLoc(s)?"door-inside-fw":"door-inside",tag:"RADIUS · Access-Request",
  note:s=>fwLoc(s)?"The controller just provides the Wi-Fi and steps aside: the on-site firewall asks the RADIUS server whether this MAC may join.":fwBo(s)?"The FortiGate is both the Wi-Fi controller and the firewall: it asks the RADIUS server whether this MAC may join.":s.integ==="mabOnly"?"MAB-only SSID: no captive portal at all, RADIUS alone decides who gets on.":"Controller asks the RADIUS server whether this MAC may join.",
  a:s=>entranceActors(s,"Hey Ray, AA:BB:CC:11:22 asks if he can join.","Let me check..."),
  seq:s=>[{f:enfK(s),t:"ray",l:"Access-Request (User-Name = MAC)"}],next:"dRadius"};
N.dRadius={dec:"MAC known?",next:{dl:"MAC known?",cases:[
  {when:s=>s.radius==="known",l:"known MAC · accept",set:{radius:"known"},to:"n4m"},
  {when:s=>merakiMab(s),l:"unknown · Meraki: accept + quarantine",set:{radius:"unknown",vendor:"meraki",integ:"controllerMab"},to:"n4"},
  {l:"unknown · reject",set:{radius:"unknown",vendor:"cisco-wlc"},to:"n4r"}]}};
N.n4={choice:"radius",narr:"Ray lets him through anyway.",loc:"inside, at the door",bg:"door-inside",tag:"RADIUS · Access-Accept (cloudifi-Quarantine)",
  note:"Meraki only: an unknown MAC gets an Access-Accept carrying the group policy name cloudifi-Quarantine, because a reject would throw the device off the SSID. Meraki then applies the group policy of that name.",
  a:s=>entranceActors(s,null,"Don't know him. Quarantine pass, then."),
  seq:s=>[{f:"ray",t:enfK(s),l:"Access-Accept (Filter-Id = cloudifi-Quarantine)",r:1}],next:"dQpol"};
N.dQpol={dec:"Group policy defined?",next:{k:"qpolicy",map:{defined:"n5q",missing:"n5qx"}}};
N.n5q={choice:"qpolicy",narr:"Conn shrugs and waves him in.",loc:"stepping in",bg:"threshold",tag:"Group policy cloudifi-Quarantine applied",
  note:s=>s.integ==="mabOnly"?"Meraki applies the cloudifi-Quarantine group policy. On a MAB-only SSID there is no splash page to register on.":"Meraki applies the cloudifi-Quarantine group policy defined on its dashboard: Dave is admitted like any unregistered guest — an IP, then the splash page.",
  a:s=>thresholdActors(s,s.integ==="mabOnly"?"Quarantine pass. Hall only, Dave.":"Quarantine pass? Hall only, Dave. See Dee Ashcipee.",{x:150}),
  seq:s=>[{f:enfK(s),t:"dave",l:"Associated · group policy cloudifi-Quarantine",r:1}],next:"dMabQ"};
N.n5qx={end:1,choice:"qpolicy",narr:"Conn turns him away.",loc:"outside",bg:"door",tag:"Group policy missing · the end",
  note:"RADIUS asked for the cloudifi-Quarantine group policy, but it doesn't exist on this Meraki network: the device is refused at the door. The group policy has to be created on the dashboard.",
  a:s=>thresholdActors(s,"Quarantine? Never heard of it. Not tonight, Dave.",{x:170,mood:"flat"}),
  seq:s=>[{f:enfK(s),t:"dave",l:"group policy not found · access denied",r:1}]};
N.dMabQ={dec:"MAB-only SSID?",next:{dl:"MAB-only SSID?",cases:[
  {when:s=>s.integ==="mabOnly",l:"MAB-only · no portal",set:{integ:"mabOnly"},to:"nMabQ"},
  {l:"captive portal",set:{integ:"controllerMab"},to:"dDhcp"}]}};
N.nMabQ={end:1,narr:"In, but going nowhere.",loc:"in the hall",bg:"interior",tag:"MAB-only SSID · quarantine policy · the end",
  note:"No splash page on a MAB-only SSID: an unknown device stays under the cloudifi-Quarantine policy until its MAC is registered. This is how IoT devices are usually onboarded on Meraki.",
  a:[{k:"dave",x:210,b:"I'm in... but where's the desk?",kind:"think",al:"center",mood:"flat"}],
  seq:[{f:"dave",t:"dave",l:"admitted · cloudifi-Quarantine · no portal"}]};
N.n4r={choice:"radius",narr:"Ray says no.",loc:"inside, at the door",bg:s=>fwLoc(s)?"door-inside-fw":"door-inside",tag:"RADIUS · Access-Reject",
  note:s=>s.integ==="mabOnly"?"Unknown MAC on a MAB-only SSID: Access-Reject, and nothing to fall back on.":"Unknown MAC: Access-Reject, as on every vendor except Meraki. Controllers in captive-portal mode then fall back to their captive role.",
  a:s=>entranceActors(s,null,"Never heard of him. No."),
  seq:s=>[{f:"ray",t:enfK(s),l:"Access-Reject",r:1}],next:"dReject"};
N.dReject={dec:"On Access-Reject?",next:{dl:"On Access-Reject?",cases:[
  {when:s=>s.integ==="mabOnly",l:"ejected (MAB-only)",set:{integ:"mabOnly"},to:"n5r"},
  {l:"captive fallback",set:{integ:"controllerMab"},to:"n5rf"}]}};
N.n5rf={narr:s=>fwL(s)?"Phyre Wall shrugs and waves him in.":"Conn shrugs and waves him in.",loc:"stepping in",bg:"threshold",tag:"Access-Reject → captive fallback",
  note:"The controller falls back to its default captive role: Dave gets an IP and the portal, exactly as if it had never asked. Only the RADIUS logs differ.",
  a:s=>thresholdActors(s,"Ray Dius doesn't know you... hall only, Dave. See Dee Ashcipee.",{x:150}),
  seq:s=>[{f:enfK(s),t:"dave",l:"Associated · default captive role (fallback)",r:1}],next:"dDhcp"};
N.n3n={choice:"integ",narr:s=>!usesRadius(s)?"Conn skips the list.":fwL(s)?"Phyre Wall doesn't even ask Ray.":"Conn doesn't even ask Ray.",loc:"inside, at the door",bg:s=>fwLoc(s)?"door-inside-fw":"door-inside",
  tag:"No MAB at association",
  note:s=>!usesRadius(s)?`No RADIUS on this ${VNAME[s.vendor]}: every device is admitted into the captive role. The portal will hand the session back through ${s.vendor==="mist"?"a signed authorization URL":"Meraki's grant URL"}.`:`Checking the MAC at association (MAB) is optional: here the ${fwL(s)?"firewall":"controller"} admits every device into its captive role without asking RADIUS. RADIUS only comes in at login, after the portal.`,
  a:s=>usesRadius(s)?entranceActors(s,"Come in, Dave. No need to bother Ray.",null).map(x=>x.k==="ray"?{...x,b:"Nobody asks me...",kind:"think"}:x.k===enfK(s)?{...x,top:true}:x):[{k:"dave",x:103},{k:"troller",x:225,b:"No list tonight. I guess it's a free party.",al:"center"}],
  seq:s=>[{f:enfK(s),t:enfK(s),l:usesRadius(s)?"no MAC authentication · default captive role":"default captive role (no RADIUS)"}],next:"n5"};
N.n4m={choice:"radius",narr:"Ray knows him.",loc:"inside, at the door",bg:s=>fwLoc(s)?"door-inside-fw":"door-inside",tag:"RADIUS · Access-Accept (MAB)",note:"MAC Authentication Bypass: the MAC is already registered, so RADIUS grants the full guest role right away.",
  a:s=>entranceActors(s,null,"Dave! Known MAC — full access."),
  seq:s=>[{f:"ray",t:enfK(s),l:"Access-Accept (role = guest)",r:1}],next:"n5m"};
N.n5={narr:s=>fwL(s)?"Phyre Wall waves him inside.":"Conn waves him inside.",loc:"stepping in",bg:"threshold",tag:"handoff",note:"The device is admitted into the walled garden — the club's hall.",
  a:s=>thresholdActors(s,"You're in! See Dee Ashcipee.",{x:150}),
  seq:s=>[{f:enfK(s),t:"dave",l:fwL(s)?"Allowed · captive policy applied":"Associated · captive role applied",r:1}],next:"dDhcp"};
N.n5r={end:1,narr:"Not tonight, Dave.",loc:"outside",bg:"door",tag:"Access denied · the end",note:"MAB-only SSID: an unknown MAC is simply thrown out. Handy for IoT fleets, fatal for guests.",
  a:s=>thresholdActors(s,"Sorry Dave, not tonight.",{x:170,mood:"flat"}),
  seq:s=>[{f:enfK(s),t:"dave",l:fwL(s)?"Access denied by firewall":"Deauthentication / access denied",r:1}]};
N.n5m={narr:s=>fwL(s)?"Phyre Wall rolls out the red carpet.":"Conn rolls out the red carpet.",loc:"stepping in",bg:"threshold",tag:"handoff (role = guest)",note:"Same entrance, but Dave already has the full role.",
  a:s=>thresholdActors(s,"Welcome back, Dave! See Dee Ashcipee.",{x:150}),
  seq:s=>[{f:enfK(s),t:"dave",l:"Allowed · guest role applied",r:1}],next:"dDhcp"};
N.dDhcp={dec:"DHCP lease?",next:{k:"dhcp",map:{ok:"n6",conflict:"n6c",exhausted:"n6x",quarantine:"n6q",whitelist:"n6w",blacklist:"n6b",zombies:"n6z"}}};
N.n6q={choice:"dhcp",narr:"Dee puts him in quarantine.",loc:"cloakroom",bg:"cloakroom",tag:"Cloud DHCP · quarantine lease",note:s=>cloud(s)&&s.fwvendor==="zscaler"?"The cloud DHCP checks the MAC against its lists: unknown, so quarantine range — Zscaler keeps that range in the walled garden until the portal says otherwise. The lease is renewed for as long as the device stays.":"The cloud DHCP checks the MAC against its lists: unknown, so quarantine range. Without Zscaler the range itself changes nothing — the controller or firewall does the holding — and the lease is renewed for as long as the device stays.",
  a:[{k:"dave",x:130,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left"},{k:"dippy",x:320,b:"Not on my lists... quarantine ticket, 10.0.12.47.",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (chaddr = MAC)"},{f:"dippy",t:"dippy",l:"MAC triage → quarantine"},{f:"dippy",t:"dave",l:"OFFER 10.0.12.47 (quarantine pool)",r:1}],next:"dIot"};
N.n6w={choice:"dhcp",narr:"Dee hands him a VIP ticket.",loc:"cloakroom",bg:"cloakroom",tag:"Cloud DHCP · whitelist pool",
  note:s=>cloud(s)&&s.fwvendor==="zscaler"?"Whitelisted MAC: the lease comes from a range Zscaler lets straight through. No portal at all — this is also how an IoT device gets online.":"Whitelisted MAC: the cloud DHCP hands out an address from the whitelist range. Whether that means anything depends on who guards the door.",
  a:s=>[{k:"dave",x:130,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left",...(cloud(s)&&s.fwvendor==="zscaler"?{band:"--band-green"}:{})},{k:"dippy",x:320,b:"You're on the list, Dave! VIP ticket, 10.0.20.47.",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (chaddr = MAC)"},{f:"dippy",t:"dippy",l:"MAC triage → whitelist"},{f:"dippy",t:"dave",l:"OFFER 10.0.20.47 (whitelist pool)",r:1}],next:"dWl"};
N.dWl={dec:"Whitelist range honoured?",next:{dl:"Whitelist range honoured?",cases:[
  {when:s=>cloud(s)&&s.fwvendor==="zscaler",l:"Zscaler policy on the range",set:{integ:"cloud",fwvendor:"zscaler"},to:"n19w"},
  {l:"nobody (plain controller / firewall)",set:{integ:"controller"},to:"nNoVip"}]}};
N.nNoVip={narr:"Nobody honours the VIP ticket.",loc:"in the hall",bg:"interior",
  tag:"Whitelist range · not enforced",note:"Only a Zscaler integration maps the cloud DHCP pools to firewall policies. With any other controller or firewall, the whitelist range is just an address: the device is still held in the captive state and runs its captive detection as usual.",
  a:s=>[{k:"dave",x:150,b:"Dee Ashcipee gave me a VIP ticket!",al:"left"},{k:(cloud(s)||fwL(s))?"phyre":"troller",x:320,b:"Never heard of it. Same rules as everyone, Dave.",al:"right"}],
  seq:s=>[{f:"dave",t:(cloud(s)||fwL(s))?"phyre":"troller",l:"traffic from whitelist range · still captive"}],next:"dIot"};
N.n6b={choice:"dhcp",narr:"Dee goes silent.",loc:"cloakroom",bg:"cloakroom",tag:"Cloud DHCP · blacklist: silent drop",
  note:"Blacklisted MAC: no OFFER, no NAK, nothing — every packet is dropped silently. Many devices just keep retrying.",
  a:[{k:"dave",x:130,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left"},{k:"dippy",x:320,mood:"flat"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (chaddr = MAC)"},{f:"dippy",t:"dippy",l:"MAC triage → blacklist · drop"}],next:"dHack"};
N.dHack={dec:"Static IP bypass?",next:{k:"hack",map:{no:"nBlack",yes:"nHack"}}};
N.nBlack={end:1,choice:"hack",narr:"Dave keeps asking, forever.",loc:"cloakroom",bg:"cloakroom",tag:"Blacklist · silent drop · the end",
  note:"No lease, no error, no answer: the device retries in a loop. Mind that this is a denial, not a security boundary — see the other option.",
  a:[{k:"dave",x:130,b:"...got an IP for me? Hello? Dee?",al:"left",mood:"flat"},{k:"dippy",x:320,mood:"flat"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (retried, forever)"},{f:"dippy",t:"dippy",l:"drop"}]};
N.nHack={choice:"hack",narr:"Dave picks his own address.",loc:"in the hall",bg:"interior",tag:"Static IP in the whitelist range · bypass",
  note:s=>cloud(s)&&s.fwvendor==="zscaler"?"The blacklist only withholds a lease. A device that configures a static IP inside the whitelisted range is let straight through by Zscaler: DHCP lists are not a security boundary.":"The blacklist only withholds a lease: a static IP puts the device back on the network with no DHCP exchange and no new word with the controller — it just runs its captive detection like anyone else (unless the controller enforces DHCP snooping / IP source guard). Without Zscaler the whitelist range buys nothing more.",
  a:s=>cloud(s)&&s.fwvendor==="zscaler"?[{k:"dave",x:210,b:"Ahah, I'm in, son of a switch.",al:"center",mood:"smile",band:"--band-green"}]:[{k:"dave",x:210,b:"Fine, I'll pick my own address, then.",al:"center"}],
  seq:[{f:"dave",t:"dave",l:"static IP 10.0.20.66 (whitelist range)"}],next:"dSnoop"};
N.dSnoop={dec:"DHCP snooping?",next:{k:"snooping",map:{no:"nSnoopNo",yes:"nSnoopYes"}}};
N.nSnoopNo={choice:"snooping",narr:"Nobody checks the address.",loc:"in the hall",bg:"interior",tag:"No DHCP snooping · unlearned IP forwarded",
  note:"Without DHCP snooping / IP source guard, the controller forwards traffic from any address, learned through DHCP or not. The static IP works — and the gap sits on the network side, not on the portal.",
  a:s=>[{k:"dave",x:150,b:"No one checks my address? Sweet.",al:"left"},{k:greetK(s),x:320}],
  seq:s=>[{f:"dave",t:greetK(s),l:"traffic from 10.0.20.66 (no DHCP binding) · forwarded"}],next:"dHackWl"};
N.nSnoopYes={end:1,choice:"snooping",narr:"The unlearned address is dropped.",loc:"in the hall",bg:"interior",tag:"DHCP snooping · IP source guard · the end",
  note:"With DHCP snooping, the controller only forwards IP traffic that matches a DHCP binding. A static IP never got one, so every packet is dropped. The blacklist holds — thanks to the customer's network, not the portal.",
  a:s=>[{k:"dave",x:150,b:"Hello? Anyone?",al:"left",mood:"flat"},{k:greetK(s),x:320,b:"No ticket from Dee Ashcipee, no entry.",al:"right"}],
  seq:s=>[{f:"dave",t:greetK(s),l:"traffic from 10.0.20.66 · no DHCP binding"},{f:greetK(s),t:greetK(s),l:"drop (IP source guard)"}]};
N.dHackWl={dec:"Whitelist range honoured?",next:{dl:"Whitelist range honoured?",cases:[
  {when:s=>cloud(s)&&s.fwvendor==="zscaler",l:"Zscaler policy on the range",set:{integ:"cloud",fwvendor:"zscaler"},to:"n19w"},
  {when:s=>s.os==="iot",l:"IoT · no captive detection",set:{os:"iot"},to:"nIot"},
  {l:"nobody · captive detection runs",set:{integ:"controller"},to:"n12n"}]}};
N.n6z={choice:"dhcp",narr:"The quarantine is full of zombies.",loc:"cloakroom",bg:"cloakroom-z",tag:"Cloud DHCP · quarantine pool exhausted",
  note:"Quarantine leases are renewed forever. Devices that never finish the journey — IoT, abandoned phones — pile up and eat the pool: no OFFER left for Dave.",
  a:[{k:"dave",x:110,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left"},{k:"dippy",x:275,b:"Sorry Dave, no tickets left. Look at them.",al:"right",mood:"flat"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (retried)"},{f:"dippy",t:"dippy",l:"quarantine pool exhausted (zombie leases)"}],next:"nNoIp"};
N.n19w={ok:1,narr:"Straight to the dancefloor.",loc:"the dancefloor",bg:s=>cloud(s)?"dancefloor-cloud":"dancefloor",tag:"whitelisted range → Internet",
  note:"Traffic from the whitelisted range is allowed without any portal step.",
  a:s=>[{k:(cloud(s)||fwL(s))?"phyre":"troller",x:270,b:"Whitelist? Go ahead, Dave!",al:"left"},{k:"dave",x:380,b:"That was quick!",al:"right",band:"--band-green"}],
  seq:s=>[{f:(cloud(s)||fwL(s))?"phyre":"troller",t:"dave",l:"whitelisted range · Internet open",r:1}]};
N.dIot={dec:"Captive detection?",next:{dl:"Captive detection?",cases:[
  {when:s=>s.os==="iot"&&rayCheckers(s)&&s.radius==="known",l:"IoT · known MAC (MAB)",set:{os:"iot",radius:"known"},to:"n19m"},
  {when:s=>s.os==="iot",l:"IoT · none",set:{os:"iot"},to:"nIot"},
  {l:"phone / laptop",set:{os:"ios"},to:"d114"}]}};
N.nIot={end:1,narr:"Dave Ice never asks the way.",loc:"in the hall",bg:"interior",tag:"No captive detection · stuck in quarantine",
  note:"An IoT device runs no connectivity probe, ignores option 114 and has no browser: it never sees the portal. It stays in quarantine with its lease renewed forever — a zombie on the guest network. Only a known MAC (MAB) gets it online today; a DHCP whitelist will be the other way out.",
  a:[{k:"dave",x:210,b:"...",kind:"think",al:"center",mood:"flat"}],
  seq:[{f:"dave",t:"dave",l:"no probe · no CPI · no browser"},{f:"dave",t:"dippy",l:"DHCP renewals, forever"},{f:"dippy",t:"dave",l:"ACK (lease renewed)",r:1}]};
N.n6={choice:"dhcp",narr:"Dave asks for an address.",loc:"cloakroom",bg:"cloakroom",tag:"DHCP · DISCOVER / OFFER",note:"The device (not the controller) requests the lease; DHCP hands out the IP.",
  a:[{k:"dave",x:130,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left"},{k:"dippy",x:320,b:"Sure: 10.0.12.47.",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (chaddr = MAC)"},{f:"dippy",t:"dave",l:"OFFER 10.0.12.47",r:1}],next:"dIot"};
N.n6c={choice:"dhcp",narr:"Dee remembers him.",loc:"cloakroom",bg:"cloakroom",tag:"DHCP · known client, new lease",note:"The server knows this MAC's previous lease, but that IP was reassigned meanwhile, so it offers a new one.",
  a:[{k:"dave",x:130,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left"},{k:"dippy",x:320,b:"Welcome back! .47 got taken — here's 10.0.12.58.",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (chaddr = MAC)"},{f:"dippy",t:"dippy",l:"old lease .47 reassigned"},{f:"dippy",t:"dave",l:"OFFER 10.0.12.58",r:1}],next:"dIot"};
N.n6x={choice:"dhcp",narr:"The cloakroom is full.",loc:"cloakroom",bg:"cloakroom",tag:"DHCP · pool exhausted",note:"No free address left in the pool: the DISCOVER goes unanswered.",
  a:[{k:"dave",x:130,b:"Hi Dee, I'm AA:BB:CC:11:22 — got an IP for me?",al:"left"},{k:"dippy",x:320,b:"Sorry Dave, no tickets left.",al:"right",mood:"flat"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (retried)"},{f:"dippy",t:"dippy",l:"pool exhausted · no OFFER"}],next:"nNoIp"};
N.nNoIp={end:1,narr:"Stuck in the hall.",loc:"in the hall",bg:"interior",tag:"APIPA · the end",note:"Without a lease, the device self-assigns a 169.254.x.x address: no portal, no internet.",
  a:[{k:"dave",x:210,b:"169.254-something? I can't go anywhere...",kind:"think",al:"center",mood:"flat"}],
  seq:[{f:"dave",t:"dave",l:"self-assigns 169.254.x.x"}]};
N.d114={dec:"Option 114?",next:{k:"o114",map:{yes:"n7",no:"n7n"}}};
N.n7={choice:"o114",narr:"Dee adds a note to the ticket.",loc:"cloakroom",bg:"cloakroom",tag:"DHCP · option 114",note:"DHCP slips the device the Captive-Portal API URL — with Dave's MAC and IP written in it.",
  a:[{k:"dave",x:130},{k:"dippy",x:320,b:"Dancefloor? Ask Cee Peahy first, with my note.",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP REQUEST"},{f:"dippy",t:"dave",l:"ACK + option 114 (CPI URL with MAC and IP)",r:1}],next:"dRole1"};
N.n7n={choice:"o114",narr:"No note this time.",loc:"cloakroom",bg:"cloakroom",tag:"DHCP · no option 114",note:"No Captive-Portal API URL in the lease: the OS will fall back to its own probe.",
  a:[{k:"dave",x:130},{k:"dippy",x:320,b:"There you go. Enjoy!",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP REQUEST"},{f:"dippy",t:"dave",l:"ACK (no option 114)",r:1}],next:"dRole2"};
const roleCases=(guest,base)=>({dl:"Role?",cases:[
  {when:s=>rayCheckers(s)&&s.radius==="known",l:"guest (MAB)",set:{radius:"known"},to:guest},
  {l:"captive role",set:{radius:"unknown"},to:base}]});
N.dRole1={dec:"Role?",next:roleCases("n8m","dVisit")};
N.dRole2={dec:"Role?",next:roleCases("n19m2","n12n")};
N.dVisit={dec:"Returning iPhone?",next:{k:"visit",map:{first:"n8",returning:"nStale"}}};
N.nStale={end:1,choice:"visit",narr:"Dave doesn't bother checking.",loc:"the kiosk",bg:"kiosk",tag:"iOS · stale captive state · the end",
  note:s=>"On a previous visit the CPI told iOS this network wasn't captive (the CNA bypass). iOS remembers it: back on the SSID, even with the option 114 note in hand, it runs no probe and never asks the CPI again. Its session has expired, so it sits in the hall like a zombie, until the network is forgotten on the "+dev(s)+".",
  a:[{k:"dave",x:130,b:"This place was fine last time.",kind:"think",al:"left",zombie:true},{k:"chippy",x:320,mood:"flat"}],
  seq:[{f:"dave",t:"dave",l:"no probe · no CPI call (network remembered as not captive)"}]};
N.n8={choice:"visit",narr:"Dave checks the kiosk.",loc:"the kiosk",bg:"kiosk",tag:"CPI · captive:true",note:s=>`CPI requests carry no cookie: the device is identified by the URL from the DHCP note (option 114), which has its MAC and IP written in it. The API answers captive:true and points to the portal URL — that first captive:true is what makes the OS open ${mini(s)}.`,
  a:[{k:"dave",x:130,b:"Hi Cee — can't tell you who I am, but Dee Ashcipee's note can. Dancefloor yet?",al:"left"},{k:"chippy",x:320,b:"Hi Dave, you're captive. Please see Port Hal.",al:"right"}],
  seq:s=>[{f:"dave",t:"chippy",l:"GET CPI URL (MAC, IP)"},{f:"chippy",t:"dave",l:"{captive: true, user-portal-url}",r:1},{f:"dave",t:"dave",l:ios(s)?"captive:true → iOS opens the CNA":"captive:true → Android opens its sign-in app"}],next:"dEnf1"};
N.n8m={narr:"Cee waves him on.",loc:"the kiosk",bg:"kiosk",tag:"CPI · captive:false",note:"CPI requests carry no cookie: the URL from the DHCP note, with Dave's MAC and IP in it, identifies the device. The role is already full, so the API answers captive:false — no portal at all.",
  a:[{k:"dave",x:130,b:"Hi Cee — can't tell you who I am, but Dee Ashcipee's note can. Dancefloor yet?",al:"left"},{k:"chippy",x:320,b:"You're free, Dave. Go dance!",al:"right"}],
  seq:[{f:"dave",t:"chippy",l:"GET CPI URL (MAC, IP)"},{f:"chippy",t:"dave",l:"{captive: false}",r:1}],next:"n19m"};
N.n9={narr:"He lines up at the welcome desk.",loc:"reception",bg:"kiosk-reception",tag:"Portal (mini-browser) · poll",
  note:s=>`${ios(s)?"The CNA mini-browser":"Android's sign-in app"} opens the portal URL (which carries Dave's MAC) and the page polls for a verdict.`,
  a:[{k:"chippy",x:70},{k:"dave",x:200,b:"Hi Port Hal — what now?",al:"center"},{k:"porter",x:355,b:"Hi Dave, wait a sec while I update your captive state...",al:"right",headSpin:true}],
  seq:s=>[{f:"dave",t:"porter",l:`${ios(s)?"CNA":"sign-in app"}: GET user-portal-url`},{f:"porter",t:"dave",l:"waiting page (polls backend)",r:1}],next:"n10"};
N.n10={narr:"...and keeps pestering the kiosk.",loc:"the kiosk",bg:"kiosk-reception",tag:"CPI · poll loop",note:"In parallel the OS keeps polling the Captive Portal API for a state change.",
  a:[{k:"chippy",x:70},{k:"dave",x:200,b:"Yo Cee — now?",al:"center"},{k:"porter",x:355,headSpin:true}],
  seq:[{f:"dave",t:"chippy",l:"GET CPI URL (poll)"},{f:"chippy",t:"dave",l:"{captive: true}",r:1}],next:"dOs1"};
N.dOs1={dec:"Device OS?",next:{k:"os",map:{ios:"n11",android:"n11a"}}};
N.n11={narr:"The flag finally flips.",loc:"reception",bg:"kiosk-reception",tag:"CPI · captive:false",note:"API flips to captive:false; the mini-browser shows a 'done' button but the guest should not hit it.",
  a:[{k:"chippy",x:70,b:"You're clear!",al:"left"},{k:"dave",x:200},{k:"porter",x:355,b:"Now tap here to continue.",al:"right"}],
  seq:[{f:"porter",t:"chippy",l:"set captive = false for MAC"},{f:"dave",t:"chippy",l:"GET CPI URL (poll)"},{f:"chippy",t:"dave",l:"{captive: false}",r:1},{f:"porter",t:"dave",l:"shows 'continue' button",r:1}],next:"dDone"};
N.n11a={narr:"The app closes itself.",loc:"reception",bg:"reception",tag:"CPI · captive:false → app closes",note:"Android's sign-in app closes by itself as soon as the API says captive:false — no button to tap.",
  a:[{k:"chippy",x:90,b:"You're clear!",al:"left"},{k:"dave",x:226,b:"...wait, where did the portal go?",al:"center",nophone:true},{k:"porter",x:330}],
  seq:[{f:"porter",t:"chippy",l:"set captive = false for MAC"},{f:"dave",t:"chippy",l:"GET CPI URL (poll)"},{f:"chippy",t:"dave",l:"{captive: false}",r:1},{f:"dave",t:"dave",l:"sign-in app closes automatically"}],next:"dBrowse"};
N.dDone={dec:"Taps 'Done'?",next:{k:"done",map:{no:"n12",yes:"n12d"}}};
N.n12={choice:"done",narr:"Dave thinks he's done.",loc:"in the hall",bg:"dance-door",tag:"CNA closed → Safari",note:"Port Hal's button closes the mini-browser and opens the real browser (Safari).",
  a:[{k:"dave",x:210,b:"Not captive anymore? Let's go to 3wi.fi now!",kind:"think",al:"center"}],
  seq:[{f:"dave",t:"dave",l:"CNA closes · opens Safari"}],next:"dEnf2"};
N.n12d={choice:"done",narr:"Dave taps Done.",loc:"reception",bg:"reception",tag:"CNA · 'Done' tapped",note:"The CNA closes and nothing opens: iOS now believes the network is open and won't show the portal again.",
  a:[{k:"dave",x:130,b:"'Done'? Sounds right.",al:"left"},{k:"porter",x:320,b:"No, Dave — not that one!",al:"right",mood:"open"}],
  seq:[{f:"dave",t:"dave",l:"taps 'Done' · CNA closes"}],next:"n12d2"};
N.n12d2={end:1,narr:"An invisible wall.",loc:"in the hall",bg:"dance-wall",tag:"HTTPS fails silently · the end",note:s=>ctrlLike(s)?"iOS believes it's online, so the portal never comes back and every HTTPS request silently fails. The only way out: open a site WITHOUT https, so the controller can redirect it to the portal.":"iOS believes it's online, so the portal never comes back and every HTTPS request silently fails. The only way out: open a site WITHOUT https, so the firewall can redirect it to the portal. (Exception: a firewall that decrypts SSL can redirect HTTPS too — rare for guests.)",
  a:[{k:"dave",x:296,b:"Wait — the S in HTTPS stands for STUCK?",kind:"think",al:"center",bx:-85,mood:"open"}],
  seq:s=>[{f:"dave",t:ctrlLike(s)?"troller":"phyre",l:"HTTPS requests · silently dropped"},{f:"dave",t:"dave",l:"no portal, no Internet"}]};
// Android closes its sign-in app by itself and opens nothing: going on is up to Dave
N.dBrowse={dec:"Dave opens a site?",next:{k:"browse",map:{stay:"n12aw",http:"n12a"}}};
N.n12a={choice:"browse",narr:"Hands-free.",loc:"in the hall",bg:"dance-door",tag:"Sign-in app closed → Chrome",note:"Nothing opens a browser for him: Dave has to think of visiting an HTTP-only site himself, like 3wi.fi, so that it can be redirected.",
  a:[{k:"dave",x:210,b:"Not captive anymore? Let's try 3wi.fi, then!",kind:"think",al:"center",nophone:true}],
  seq:[{f:"dave",t:"dave",l:"opens Chrome"}],next:"dEnf2"};
N.n12n={narr:"Dave checks for himself.",loc:"in the hall",bg:"dance-door",tag:"OS connectivity probe",
  note:s=>ios(s)?"Without option 114, iOS tests the network by fetching captive.apple.com.":"Without option 114, Android tests the network by fetching connectivitycheck.gstatic.com.",
  a:s=>[{k:"dave",x:210,b:ios(s)?"Am I captive? Let me check captive.apple.com.":"Am I captive? Let me check connectivitycheck.",kind:"think",al:"center"}],
  seq:[{f:"dave",t:"dave",l:"OS connectivity probe"}],next:"dEnf3"};
N.n12aw={end:1,choice:"browse",narr:"Online, they said.",loc:"in the hall",bg:"dance-door",tag:"Sign-in app closed · nothing opens · the end",
  note:"Android now believes the network is open, but Dave hasn't registered yet: apps time out, and nothing tells him to open a browser on an HTTP-only site to reach the portal. He stays stuck in the hall.",
  a:[{k:"dave",x:210,b:"Online, they said. Why does nothing load?",kind:"think",al:"center",mood:"flat"}],
  seq:[{f:"dave",t:"dave",l:"sign-in app closed · no browser opened · apps time out"}]};
N.n13={narr:"Plot twist.",loc:"in the hall",bg:"dance-door",tag:"Controller · still role = base",note:"The controller never changed the role, so traffic is still redirected.",
  a:[{k:"troller",x:120,b:"WHERE YOU GOING, DAVE?",kind:"shout",mood:"open",al:"left"},{k:"dave",x:315,b:"...3wi.fi?",mood:"flat",al:"right"}],
  seq:s=>[{f:"dave",t:"troller",l:`GET http://3wi.fi (${br(s)})`}],next:"n14"};
N.n13n={narr:"Caught red-handed.",loc:"in the hall",bg:"dance-door",tag:"Controller · intercepts probe",
  note:s=>`The probe is intercepted and redirected, so the OS concludes it's captive and opens ${mini(s)}.`,
  a:s=>[{k:"troller",x:120,b:"WHERE YOU GOING, DAVE?",kind:"shout",mood:"open",al:"left"},{k:"dave",x:315,b:ios(s)?"...captive.apple.com?":"...connectivity check?",mood:"flat",al:"right"}],
  seq:s=>[{f:"dave",t:"troller",l:ios(s)?"GET captive.apple.com":"GET connectivitycheck.gstatic.com"}],next:"n14b"};
N.n14={narr:"Back to the desk — for real.",loc:"in the hall",bg:"dance-door",tag:"HTTP 302 → portal",note:"Unregistered traffic is redirected to the registration page.",
  a:[{k:"troller",x:120,b:"First register with Port Hal, Dave.",al:"left"},{k:"dave",x:315,mood:"flat"}],
  seq:[{f:"troller",t:"dave",l:"HTTP 302 → portal URL",r:1}],next:"n15"};
N.n14b=C(N.n14,{next:"n15n"});

const ASK={sso:"Fill this in — or use Ida Pee.",mfa:"Fill this in — or use Ida Pee.",passkey:"Fill this in — or use Ida Pee.",form:"Just fill in this form.",sms:"Your phone number, please.",email:"Your email? I'll send your credentials.",sponsor:"Fill this in, and name your sponsor."};
const ASK_HI={sso:"Hi Dave, fill this in — or use Ida Pee.",mfa:"Hi Dave, fill this in — or use Ida Pee.",passkey:"Hi Dave, fill this in — or use Ida Pee.",form:"Hi Dave, just fill in this form.",sms:"Hi Dave, your phone number, please.",email:"Hi Dave, your email? I'll send your credentials.",sponsor:"Hi Dave, fill this in, and name your sponsor."};
const portalAsk=(s,hi)=>(hi?ASK_HI:ASK)[s.reg];
N.n15={choice:"reg",narr:"Port Hal hands over a form.",loc:"reception",bg:"reception",tag:"Portal · registration",
  note:s=>`The registration page loads in ${br(s)} — a full browser.`,
  a:s=>[{k:"dave",x:130,b:"Yo Port Hal, I'm back.",al:"left"},{k:"porter",x:320,b:portalAsk(s,false),al:"right"}],
  seq:s=>[{f:"dave",t:"porter",l:`GET portal (${br(s)})`},{f:"porter",t:"dave",l:"registration page",r:1}],next:"dRegB"};
// the registration method is Port Hal's call, so it is chosen where he presents it. Behind a cloud firewall, the first panel
// at his desk always offers the same menu: the methods, then the transient visitor pass (two criteria in one menu)
const portalMenu=s=>[...optsFor("reg",s).map(o=>({title:V(o.title,{...s,reg:o.v,transient:"no"}),t:o.t,set:{reg:o.v,transient:"no"},on:!trans(s)&&s.reg===o.v})),
  {title:"Port Hal hands out a visitor pass.",t:"transient pass",set:{transient:"yes"},on:trans(s)}];
N.n15n={choice:"reg",menu:s=>cloud(s)?portalMenu(s):null,narr:"Port Hal hands over a form.",loc:"reception",bg:"reception",tag:"Portal · registration (mini-browser)",
  note:s=>ios(s)?"The form loads in the CNA mini-browser — not in Safari.":"The form loads in Android's sign-in app — not in Chrome.",
  a:s=>[{k:"dave",x:130,b:"Hi Port Hal, I'm Dave.",al:"left"},{k:"porter",x:320,b:portalAsk(s,true),al:"right"}],
  seq:s=>[{f:"dave",t:"porter",l:`GET portal (${ios(s)?"CNA":"sign-in app"})`},{f:"porter",t:"dave",l:"registration page",r:1}],next:"dRegC"};

/* --- registration in a full browser --- */
N.dRegB={dec:"Registration method?",next:{k:"reg",map:{sso:"n16",mfa:"n16M",passkey:"n16P",form:"n16f",sms:"n16s",email:"n16e",sponsor:"sp1"}}};
N.n16={narr:"Single sign-on with Ida Pee.",loc:"id booth",bg:"booth",tag:"SSO · SAML / OIDC",note:"The identity provider authenticates the user and returns an assertion.",
  a:[{k:"dave",x:130,b:"Hi Ida, Port Hal wants you to confirm I'm Dave",al:"left"},{k:"soso",x:330,b:"Hi Dave, confirmed, you're Dave",al:"right"}],
  seq:[{f:"porter",t:"dave",l:"redirect → IdP",r:1},{f:"dave",t:"soso",l:"auth request + login"},{f:"soso",t:"dave",l:"signed assertion",r:1}],next:"n17"};
N.n16M={narr:"Ida Pee wants a second factor.",loc:"id booth",bg:"booth",tag:"SSO · MFA requested",note:"The IdP asks for a second factor in an external app (TOTP code or push).",
  a:[{k:"dave",x:130,b:"Hi Ida, Port Hal wants you to confirm I'm Dave",al:"left"},{k:"soso",x:330,b:"Sure — confirm in your authenticator app.",al:"right"}],
  seq:[{f:"porter",t:"dave",l:"redirect → IdP",r:1},{f:"dave",t:"soso",l:"auth request + login"},{f:"soso",t:"dave",l:"MFA challenge (external app)",r:1}],next:"n16Mb"};
N.n16Mb={narr:"Dave grabs his authenticator.",loc:"id booth",bg:"booth",tag:"MFA · app switch (browser)",note:"In a full browser, switching apps is harmless: the page waits for Dave to come back.",
  a:[{k:"dave",x:130,b:"One sec, opening my authenticator...",al:"left"},{k:"soso",x:330,b:"Take your time.",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"switches to authenticator app and back"},{f:"dave",t:"soso",l:"second factor (TOTP / push)"}],next:"n16Mc"};
N.n16Mc={narr:"Second factor accepted.",loc:"id booth",bg:"booth",tag:"SSO · assertion (after MFA)",note:"With the second factor done, the IdP returns the assertion.",
  a:[{k:"dave",x:130,b:"Code's 482 913.",al:"left"},{k:"soso",x:330,b:"Hi Dave, confirmed, you're Dave",al:"right"}],
  seq:[{f:"soso",t:"dave",l:"signed assertion",r:1}],next:"n17"};
N.n16f={narr:"Dave fills in the form.",loc:"reception",bg:"reception",tag:"Portal · declarative form",note:"No external step at all: the simplest registration.",
  a:[{k:"dave",x:130,b:"Name, email... done!",al:"left"},{k:"porter",x:320,b:"Thanks, Dave!",al:"right"}],
  seq:[{f:"dave",t:"porter",l:"POST form (name, email)"}],next:"n17"};
N.n16s={narr:"A text message arrives.",loc:"reception",bg:"reception",tag:"Portal · SMS OTP sent",note:"The portal sends a one-time code by SMS; a notification pops up on top of the page.",
  a:[{k:"dave",x:130,b:"Bzzz — got a text!",al:"left"},{k:"porter",x:320,b:"Type the code I just sent.",al:"right"}],
  seq:[{f:"dave",t:"porter",l:"POST phone number"},{f:"porter",t:"dave",l:"SMS with one-time code",r:1}],next:"dSmsB"};
N.dSmsB={dec:"SMS notification?",next:{k:"smsexit",map:{type:"n16st",tap:"n16sT"}}};
N.n16st={choice:"smsexit",narr:"Dave types the code.",loc:"reception",bg:"reception",tag:"Portal · OTP verified",note:"Dave reads the code from the notification and types it straight into the portal.",
  a:[{k:"dave",x:130,b:"Code: 4821.",al:"left"},{k:"porter",x:320,b:"Correct!",al:"right"}],
  seq:[{f:"dave",t:"porter",l:"POST OTP"}],next:"n17"};
N.n16sT={choice:"smsexit",narr:"Dave taps the notification.",loc:"reception",bg:"reception",tag:"Portal · OTP after app switch",
  note:s=>`In ${br(s)}, a detour through Messages is harmless: the page and the Wi-Fi are still there when Dave comes back.`,
  a:[{k:"dave",x:130,b:"Off to Messages... and back! Code: 4821.",al:"left"},{k:"porter",x:320,b:"Correct — and you never left!",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"opens Messages and comes back"},{f:"dave",t:"porter",l:"POST OTP"}],next:"n17"};
N.n16e={narr:"Credentials by email.",loc:"reception",bg:"reception",tag:"Portal · credentials emailed",note:"The portal emails a username and password: Dave has to read them in his mail app.",
  a:[{k:"dave",x:130,b:"Checking my inbox...",al:"left"},{k:"porter",x:320,b:"Sent! Then log in here.",al:"right"}],
  seq:[{f:"dave",t:"porter",l:"POST email address"},{f:"porter",t:"dave",l:"email with credentials",r:1}],next:"n16e2"};
N.n16e2={narr:"Back with his password.",loc:"reception",bg:"reception",tag:"Portal · login (credentials)",note:"In a full browser, Dave can switch to his mail app and come back: the page is still there.",
  a:[{k:"dave",x:130,b:"User dave, password... there.",al:"left"},{k:"porter",x:320,b:"Welcome in!",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"reads email in mail app"},{f:"dave",t:"porter",l:"POST login"}],next:"n17"};

/* --- registration inside the mini-browser --- */
const exitPanel=(narr,why)=>({narr,loc:"outside",bg:"door",tag:"iOS · CNA left → SSID dropped",note:"Leaving the CNA on iOS drops the captive network: Dave is back outside and the portal session is gone.",
  a:[{k:"dave",x:170,b:"That's not what I meant to do...",kind:"think",al:"left",mood:"flat"},{k:"troller",x:340,b:"Leaving us already?",al:"right"}],
  seq:[{f:"dave",t:"dave",l:why},{f:"dave",t:"troller",l:"disassociation (leaves SSID)"}]});
N.dRegC={dec:"Registration method?",next:{k:"reg",map:{sso:"n16n",mfa:"n16nM",passkey:"n16nP",form:"n16nf",sms:"n16ns",email:"n16ne",sponsor:"sp1"}}};
N.n16n=C(N.n16,{tag:"SSO · inside the mini-browser",note:"SSO in the mini-browser: cookies, saved passwords and passkeys may not work as well as in a full browser.",
  seq:[{f:"porter",t:"dave",l:"redirect → IdP",r:1},{f:"dave",t:"soso",l:"auth request + login (mini-browser)"},{f:"soso",t:"dave",l:"signed assertion",r:1}]});
N.n16nM=C(N.n16M,{tag:"SSO · MFA requested (mini-browser)",note:"The IdP asks for a second factor in an external app — from inside the mini-browser.",next:"n16nMb"});
N.n16nMb=C(N.n16Mb,{tag:"MFA · app switch (mini-browser)",
  note:s=>ios(s)?"To read the code, Dave has to leave the CNA...":"Android keeps the sign-in app and the connection while Dave switches apps.",
  seq:[{f:"dave",t:"dave",l:"switches to authenticator app"}],next:"dOsM"});
N.dOsM={dec:"Device OS?",next:{k:"os",map:{ios:"nExitM",android:"n16nMc"}}};
N.nExitM=C(exitPanel("Wait, where am I?","leaves CNA for authenticator app"),{next:"nMfaEnd"});
N.nMfaEnd={end:1,narr:"Approved... too late.",loc:"outside",bg:"door",tag:"MFA lost · the end",note:"He may approve over 4G/5G, but when he rejoins, the portal session is gone and he must start over — and leave again.",
  a:[{k:"dave",x:170,b:"Approved over 4G — but the portal is gone.",kind:"think",al:"left",mood:"flat"},{k:"troller",x:340,b:"You'll have to start over, Dave.",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"approves MFA over 4G/5G"},{f:"dave",t:"troller",l:"re-association · journey restarts"}]};
N.n16nMc=C(N.n16Mc,{tag:"SSO · assertion (after MFA)",note:"On Android, switching apps doesn't drop the Wi-Fi: Dave comes back from his authenticator and the sign-in app is still there.",
  a:[{k:"dave",x:130,b:"Back from my authenticator — still connected!",al:"left"},{k:"soso",x:330,b:"Hi Dave, confirmed, you're Dave",al:"right"}],seq:[{f:"dave",t:"soso",l:"second factor (TOTP / push)"},{f:"soso",t:"dave",l:"signed assertion",r:1}]});
N.n16nf=C(N.n16f,{tag:"Portal · declarative form (mini-browser)",note:"Even in the mini-browser, nothing forces Dave to leave: the simplest registration."});
N.n16ns=C(N.n16s,{tag:"Portal · SMS OTP sent (mini-browser)",
  note:s=>ios(s)?"A notification pops up over the CNA — very tempting to tap it.":"A notification pops up over Android's sign-in app.",next:"dSms"});
N.dSms={dec:"SMS notification?",next:{k:"smsexit",map:{type:"n16nst",tap:"dOsS"}}};
N.dOsS={dec:"Device OS?",next:{k:"os",map:{ios:"nExitS",android:"n16nsT"}}};
N.n16nst=C(N.n16st,{choice:"smsexit",tag:"Portal · OTP verified (mini-browser)",
  note:s=>`Dave types the code straight from the notification — without leaving ${mini(s)}.`});
N.nExitS=C(exitPanel("Oops.","taps SMS notification · leaves CNA"),{choice:"smsexit",next:"n16sr"});
N.n16nsT=C(N.n16sT,{tag:"Portal · OTP after app switch (sign-in app)",
  note:"On Android, switching apps doesn't drop the Wi-Fi: the sign-in app is still waiting when Dave comes back from Messages."});
N.n16sr={narr:"Round two.",loc:"reception",bg:"reception",tag:"Portal · OTP recycling",note:"Dave rejoins and the captive journey restarts; the portal lets him reuse the code he already received.",
  a:[{k:"dave",x:130,b:"I'm back — code 4821, still good?",al:"left"},{k:"porter",x:320,b:"Yep, recycled. Welcome!",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"re-joins SSID · journey restarts"},{f:"dave",t:"porter",l:"POST same OTP"},{f:"porter",t:"dave",l:"accepted (code recycled)",r:1}],next:"n17"};
N.n16ne=C(N.n16e,{tag:"Portal · credentials emailed (mini-browser)",
  note:s=>`The portal emails a username and password: Dave has to read them in his mail app — outside ${mini(s)}.`,next:"dOsE"});
N.dOsE={dec:"Device OS?",next:{k:"os",map:{ios:"nExitE",android:"n16ne2"}}};
N.nExitE=C(exitPanel("Off to read his mail.","leaves CNA for mail app"),{next:"n16er"});
N.n16er={narr:"Round two.",loc:"reception",bg:"reception",tag:"Portal · login after rejoin",note:"He rejoins, the journey restarts, and he logs in with the credentials he read outside. It works — painfully.",
  a:[{k:"dave",x:130,b:"I'm back — user dave, password...",al:"left"},{k:"porter",x:320,b:"Logged in. Welcome!",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"re-joins SSID · journey restarts"},{f:"dave",t:"porter",l:"POST login"}],next:"n17"};
N.n16ne2=C(N.n16e2,{tag:"Portal · login (credentials)",note:"On Android, switching apps doesn't drop the Wi-Fi: the sign-in app is still waiting when Dave comes back from his mail.",
  a:[{k:"dave",x:130,b:"Back from my inbox — still connected!",al:"left"},{k:"porter",x:320,b:"Welcome in!",al:"right"}]});

N.n17={narr:"Verified — here's your badge.",loc:"reception",bg:"reception",tag:"Portal · auth success",
  note:s=>fwL(s)?"The portal validates the registration and hands Dave credentials to present to the on-site firewall.":urlHandback(s)?(s.vendor==="mist"?"The portal validates the registration and sends Dave back to Mist with a signed authorization URL — no RADIUS involved.":"The portal validates the registration and sends Dave back to Meraki's grant URL — no RADIUS involved."):cloud(s)?`Acting as ${FWN(s)}'s identity provider, the portal sends Dave back with a SAML assertion for Phyre Wall (${zs(s)?"IdP-initiated":"SP-initiated"}).`:s.vendor==="ruckus-smartzone"?"The portal validates the registration and calls the controller's northbound API to authorize the session.":sso(s)?"The portal validates the assertion and hands Dave credentials to present to the controller.":"The portal validates the registration and hands Dave credentials to present to the controller.",
  a:s=>[{k:"dave",x:130,b:({sso:"Ida Pee vouched. In now?",mfa:"Ida Pee vouched. In now?",passkey:"Ida Pee vouched. In now?",form:"All filled in. In now?",sms:"Code accepted. In now?",email:"Logged in. In now?",sponsor:"Spencer vouched. In now?"})[s.reg],al:"left",band:"--band-green"},{k:"porter",x:320,b:s=>urlHandback(s)?(s.vendor==="mist"?"Badge's yours — and a stamp. Show Conn Troller.":"Badge's yours. Tell Conn I said so."):s.vendor==="ruckus-smartzone"&&ctrlLike(s)?"Badge's yours. I'll call Conn Troller myself.":ctrlLike(s)?"Badge's yours. See Conn Troller.":"Badge's yours. Show Phyre Wall.",al:"right"}],
  seq:s=>[{f:"dave",t:"porter",l:sso(s)?"POST assertion":"registration complete"},urlHandback(s)?{f:"porter",t:"dave",l:s.vendor==="mist"?"302 → Mist signed authorization URL":"302 → Meraki grant URL",r:1}:s.vendor==="ruckus-smartzone"&&ctrlLike(s)?{f:"porter",t:"troller",l:"API call (NBI): authorize session"}:ctrlLike(s)?{f:"porter",t:"dave",l:"credentials + redirect to controller login",r:1}:fwL(s)?{f:"porter",t:"dave",l:"credentials + redirect to firewall login",r:1}:{f:"porter",t:"dave",l:zs(s)?"SAML assertion (IdP-initiated)":"SAML response (SP-initiated)",r:1}],next:"dEnf5"};
N.n18g={choice:"mlogin",narr:s=>s.vendor==="mist"?"A stamp instead of a list.":"Port Hal's word is enough.",loc:"in the hall",bg:"interior",tag:"Controller · grant URL / signed URL",
  note:s=>s.vendor==="mist"?"Mist: the portal redirects Dave to Mist's authorization URL with a signed token; Mist checks the signature and authorizes the session on the spot, no RADIUS.":"Meraki grant URL: the portal redirects Dave to Meraki's base_grant_url with a session duration; Meraki authorizes the session on the spot. No RADIUS, and nothing is signed.",
  a:s=>s.vendor==="mist"?[{k:"dave",x:130,b:"Port Hal stamped my hand.",al:"left",band:"--band-green"},{k:"troller",x:320,b:"Stamp's good. Go ahead!",al:"right"}]:[{k:"dave",x:130,b:"Port Hal says I'm good.",al:"left",band:"--band-green"},{k:"troller",x:320,b:"Good enough for me. Go ahead!",al:"right"}],
  seq:s=>[{f:"dave",t:"troller",l:s.vendor==="mist"?"GET authorization URL (signed token)":"GET grant URL (duration, continue_url)"},{f:"troller",t:"troller",l:"session authorized · no RADIUS"}],next:"n19"};
N.n18api={narr:"Port Hal phones ahead.",loc:"in the hall",bg:"interior",tag:"Controller API (NBI) → RADIUS Access-Request",
  note:"The portal calls the controller's northbound API, which triggers a new Access-Request to RADIUS for Dave's session.",
  a:[{k:"dave",x:78,b:"Hey Conn — what's up?",al:"left",band:"--band-green"},{k:"troller",x:235,b:"Port Hal just called. Check him, Ray?",al:"center",top:true},{k:"ray",x:355,b:"He's good.",al:"right",seated:true}],
  seq:[{f:"troller",t:"ray",l:"Access-Request (session from API)"},{f:"ray",t:"troller",l:"Access-Accept (role = guest)",r:1}],next:"n19"};
N.n18={choice:"mlogin",narr:"One last double-check.",loc:"in the hall",bg:"interior",tag:"RADIUS · Access-Request (role = guest)",note:"The controller re-authenticates Dave with the portal-issued credentials; RADIUS returns the guest role.",
  a:[{k:"dave",x:90,b:"Hey Conn — what's up?",al:"left",band:"--band-green"},{k:"troller",x:235,b:"Nice badge. Check him, Ray?",al:"center",top:true},{k:"ray",x:355,b:"He's good.",al:"right",seated:true}],
  seq:[{f:"dave",t:"troller",l:"POST controller login (credentials)"},{f:"troller",t:"ray",l:"Access-Request (credentials)"},{f:"ray",t:"troller",l:"Access-Accept (role = guest)",r:1}],next:"n19"};
N.n19={ok:1,narr:"At last, the dancefloor.",loc:"the dancefloor",bg:"dancefloor",tag:"role = guest → Internet",note:"New role applied; traffic flows. Dave is finally online.",
  a:[{k:"troller",x:270,b:"Go ahead, Dave!",al:"left"},{k:"dave",x:380,b:"Finally — internet!",al:"right",band:"--band-green"}],
  seq:[{f:"troller",t:"dave",l:"role = guest · Internet open",r:1}]};
N.n19m={ok:1,narr:"Straight to the dancefloor.",loc:"the dancefloor",bg:"dancefloor",tag:"role = guest → Internet",note:"Thanks to MAB, Dave skipped the portal entirely.",
  a:s=>[{k:enfK(s),x:270,b:"Go ahead, Dave!",al:"left"},{k:"dave",x:380,b:"That was quick!",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"Internet traffic flows"}]};
N.n19m2=C(N.n19m,{});


/* ---------- cloud firewall (Phyre Wall) ---------- */
const cloud=s=>s.integ==="cloud";
// the Android story reaches "Hands-free" (sign-in app closed by itself), set once the graph is built
let reachesHandsFree=()=>false;
const trans=s=>cloud(s)&&s.transient==="yes";
const zs=s=>s.fwvendor==="zscaler";
const FWN=s=>zs(s)?"Zscaler":"Netskope";
N.dInteg={dec:"MAB at the door?",next:{dl:"MAB at the door?",cases:[
  {when:s=>cloud(s),l:"cloud firewall",set:{integ:"cloud"},to:"n3c"},
  {when:s=>rayCheckers(s),l:"MAB: RADIUS checks the MAC",set:{integ:"controllerMab"},to:"n3"},
  {l:"no MAB",set:{integ:"controller"},to:"n3n"}]}};
const n3cloud=note=>({choice:"integ",narr:"Conn waves everyone in.",loc:"inside, at the door",bg:"door-inside",tag:"Open SSID · tunnel to cloud firewall",note,
  a:[{k:"dave",x:103},{k:"troller",x:225,b:"No list tonight — Phyre Wall checks you from the cloud.",al:"center"}],
  seq:[{f:"troller",t:"phyre",l:"GRE / IPsec tunnel (all guest traffic)"}],next:"n3f"});
N.n3f={choice:"fwvendor",narr:"Meanwhile, at the dancefloor door.",loc:"dancefloor door",bg:s=>cloud(s)?"dance-door-cloud":"dance-door",
  tag:"Cloud firewall · SAML, IP surrogate",
  note:s=>s.fwvendor==="zscaler"?"Zscaler: IdP-initiated SAML — the portal will post the assertion itself; identification by IP surrogate.":s.fwvendor==="netskope"?"Netskope: SP-initiated SAML — the firewall sends a SAML request to the portal; identification by IP surrogate.":"FortiGate on site: external captive portal, credentials checked against RADIUS.",
  a:[{k:"phyre",x:300,b:"Nobody dances without my say-so.",al:"right"}],
  seq:s=>[{f:"phyre",t:"phyre",l:cloud(s)?`${FWN(s)} · unauthenticated IPs stay in the walled garden`:"FortiGate · captive policy on the guest VLAN"}],next:"n5"};
N.n3c=n3cloud(s=>`No RADIUS here: the controller admits every device and tunnels its traffic to ${FWN(s)}, which checks everyone at the dancefloor door.`);
N.dEnf1={dec:"Enforcement point?",next:{dl:"Enforcement point?",cases:[
  {when:s=>ctrlLike(s)||fwL(s),l:"controller / on-site firewall",set:{integ:"controller"},to:"n9"},
  {when:s=>trans(s),l:"cloud · transient",set:{integ:"cloud",transient:"yes"},to:"n9t"},
  {l:"cloud · classic",set:{integ:"cloud",transient:"no"},to:"n15n"}]}};
N.n9t={choice:"transient",menu:portalMenu,narr:"Port Hal hands over a visitor pass.",loc:"reception",bg:"reception",tag:"SAML · transient profile",
  note:"The portal — not the firewall — decides to give Dave a limited 'transient' profile right away (a per-tenant portal setting).",
  a:[{k:"dave",x:130,b:"Hi Port Hal — what now?",al:"left"},{k:"porter",x:320,b:"Here's a visitor pass. Off you go!",al:"right"}],
  seq:s=>[{f:"dave",t:"porter",l:`${ios(s)?"CNA":"sign-in app"}: GET user-portal-url`},{f:"porter",t:"dave",l:"SAML assertion (transient user)",r:1}],next:"n9t2"};
N.n9t2={narr:"Dave shows his visitor pass.",loc:"dancefloor door",bg:"dance-door-cloud",tag:"Cloud firewall · transient profile",
  note:s=>`The browser carries Port Hal's SAML assertion to the cloud firewall, which ties Dave's IP to a limited 'transient' profile: ${ios(s)?"captive.apple.com":"the connectivity check"} passes, the rest doesn't.`,
  a:s=>[{k:"dave",x:170,b:"Port Hal gave me a visitor pass.",al:"left"},{k:"phyre",x:315,b:`Visitor pass — fine. Your ${dev(s)} can check in.`,al:"right"}],
  seq:[{f:"dave",t:"phyre",l:"POST SAML assertion (transient)"},{f:"phyre",t:"phyre",l:"IP surrogate → transient profile"}],next:"dOs1"};
N.dEnf2={dec:"Enforcement point?",next:{dl:"Enforcement point?",cases:[
  {when:s=>ctrlLike(s),l:"controller",set:{integ:"controller"},to:"n13"},
  {when:s=>fwL(s),l:"local firewall",set:{integ:"fwLocal"},to:"n13L"},
  {l:"cloud firewall",set:{integ:"cloud"},to:"n13f"}]}};
N.n13f={narr:"Plot twist — a different bouncer.",loc:"dancefloor door",bg:"dance-door-cloud",tag:"Cloud firewall · transient profile",
  note:"A visitor pass only covers the walled garden and the OS probes: everything else is stopped at the cloud firewall.",
  a:[{k:"dave",x:170},{k:"phyre",x:315,b:"WHERE YOU GOING, DAVE? Visitor pass only!",kind:"shout",mood:"open",al:"right"}],
  seq:s=>[{f:"dave",t:"phyre",l:`GET http://3wi.fi (${br(s)})`}],next:"n14f"};
N.n14f={narr:"Back to the desk — for real.",loc:"dancefloor door",bg:"dance-door-cloud",tag:"Redirect → portal (SAML IdP)",
  note:s=>zs(s)?"Zscaler (IdP-initiated): the firewall redirects to the portal URL; the portal will later post an unsolicited SAML assertion to Zscaler.":"Netskope (SP-initiated): the firewall redirects to its identity provider, the portal, with a SAML request.",
  a:[{k:"dave",x:170,b:"Just heading to 3wi.fi...",al:"left"},{k:"phyre",x:315,b:"Get a real pass from Port Hal first.",al:"right"}],
  seq:s=>[{f:"phyre",t:"dave",l:zs(s)?"302 → portal URL (IdP-initiated SAML)":"302 → portal (SAML AuthnRequest)",r:1}],next:"n15"};
N.dEnf3={dec:"Enforcement point?",next:{dl:"Enforcement point?",cases:[
  {when:s=>ctrlLike(s),l:"controller",set:{integ:"controller"},to:"n13n"},
  {when:s=>fwL(s),l:"local firewall",set:{integ:"fwLocal"},to:"n13pL"},
  {l:"cloud firewall",set:{integ:"cloud"},to:"n13p"}]}};
N.n13p={narr:"Caught red-handed.",loc:"dancefloor door",bg:"dance-door-cloud",tag:"Cloud firewall · intercepts probe",
  note:s=>`The probe is intercepted by the cloud firewall, so the OS concludes it's captive and opens ${mini(s)}.`,
  a:[{k:"dave",x:170},{k:"phyre",x:315,b:"WHERE YOU GOING, DAVE?",kind:"shout",mood:"open",al:"right"}],
  seq:s=>[{f:"dave",t:"phyre",l:ios(s)?"GET captive.apple.com":"GET connectivitycheck.gstatic.com"}],next:"n14p"};
N.n14p={narr:"No pass, no dancefloor.",loc:"dancefloor door",bg:"dance-door-cloud",tag:"Redirect → portal (SAML IdP)",
  note:s=>`The redirect opens the portal in ${mini(s)}. ${zs(s)?"Zscaler is IdP-initiated: the portal will post the SAML assertion on its own.":"Netskope is SP-initiated: the redirect carries a SAML request."}`,
  a:s=>[{k:"dave",x:170,b:ios(s)?"Just checking captive.apple.com...":"Just checking connectivity...",al:"left"},{k:"phyre",x:315,b:"No pass? See Port Hal.",al:"right"}],
  seq:s=>[{f:"phyre",t:"dave",l:zs(s)?"302 → portal URL (IdP-initiated SAML)":"302 → portal (SAML AuthnRequest)",r:1}],next:"dEnf4"};
N.dEnf4={dec:"Firewall mode?",next:{dl:"Firewall mode?",cases:[
  {when:s=>trans(s),l:"transient",set:{transient:"yes"},to:"n9tp"},
  {l:"classic",set:{transient:"no"},to:"n15n"}]}};
N.n9tp={choice:"transient",menu:portalMenu,narr:"Port Hal hands over a visitor pass.",loc:"reception",bg:"reception",tag:"SAML · transient profile",
  note:"The portal — not the firewall — decides to give Dave a limited 'transient' profile right away (a per-tenant portal setting).",
  a:[{k:"dave",x:130,b:"Hi Port Hal — what now?",al:"left"},{k:"porter",x:320,b:"Here's a visitor pass. Show it to Phyre Wall.",al:"right"}],
  seq:[{f:"porter",t:"dave",l:"SAML assertion (transient user)",r:1}],next:"n9tp2"};
N.n9tp2=C(N.n9t2,{next:"dOsP"});
N.n9tp3={narr:"Port Hal shows the way out.",loc:"reception",bg:"reception",tag:"Probe passes → 'continue' button",
  note:"captive.apple.com now goes through, so iOS believes it's online. Port Hal's button takes Dave to the real browser.",
  a:[{k:"dave",x:130,b:"...and now?",al:"left"},{k:"porter",x:320,b:"All set. Tap to continue.",al:"right"}],
  seq:[{f:"dave",t:"phyre",l:"OS probe · passes"},{f:"porter",t:"dave",l:"shows 'continue' button",r:1}],next:"dDone"};
N.dOsP={dec:"Device OS?",next:{k:"os",map:{ios:"n9tp3",android:"n11p"}}};
N.n11p={narr:"The app closes itself.",loc:"reception",bg:"reception",tag:"Probe passes → app closes",
  note:"Android sees the connectivity check succeed and closes its sign-in app by itself — no button to tap.",
  a:[{k:"dave",x:210,b:"...wait, where did the portal go?",al:"center",nophone:true},{k:"porter",x:330}],
  seq:[{f:"dave",t:"dave",l:"sign-in app closes automatically"}],next:"dBrowse"};
N.dEnf5={dec:"Enforcement point?",next:{dl:"Enforcement point?",cases:[
  {when:s=>fwL(s),l:"local firewall → RADIUS",set:{integ:"fwLocal"},to:"n18L"},
  {when:s=>cloud(s),l:"cloud firewall",set:{integ:"cloud"},to:"n18c"},
  {when:s=>urlHandback(s),l:"grant URL (Meraki) / signed URL (Mist)",set:{integ:"controller",vendor:"meraki",mlogin:"grant"},to:"n18g"},
  {when:s=>s.vendor==="ruckus-smartzone",l:"controller API → RADIUS",set:{integ:"controller",vendor:"ruckus-smartzone"},to:"n18api"},
  {l:"controller login → RADIUS",set:{integ:"controller",vendor:"cisco-wlc"},to:"n18"}]}};
N.n18c={narr:"Phyre Wall updates his list.",loc:"dancefloor door",bg:"dance-door-cloud",tag:"Cloud firewall · IP surrogate → user",
  note:s=>trans(s)?"Dave's private IP moves from the transient profile to his authorized user — tied to the IP, not a cookie.":"Dave's private IP moves from 'no-auth' to his authorized user. It's tied to the IP, not a cookie, so the real browser works too once the mini-browser closes.",
  a:[{k:"dave",x:170,b:"Hey Phyre — Port Hal vouched for me.",al:"left",band:"--band-green"},{k:"phyre",x:315,b:"Your IP's on my list now.",al:"right"}],
  seq:[{f:"dave",t:"phyre",l:"POST SAML assertion"},{f:"phyre",t:"phyre",l:"bind IP surrogate → authorized user"}],next:"n19c"};
N.n19c={ok:1,narr:"At last, the dancefloor.",loc:"the dancefloor",bg:"dancefloor-cloud",tag:"authorized user → Internet",note:"The firewall now lets Dave's traffic through. He's online.",
  a:[{k:"phyre",x:270,b:"Go ahead, Dave!",al:"left"},{k:"dave",x:380,b:"Finally — internet!",al:"right",band:"--band-green"}],
  seq:[{f:"phyre",t:"dave",l:"user policy · Internet open",r:1}]};

/* ---------- local firewall (on site, with RADIUS) ---------- */
N.n13L={narr:"Plot twist — a different bouncer.",loc:"dancefloor door",bg:"dance-door",tag:"Local firewall · not registered yet",
  note:"The controller let Dave in, but the on-site firewall still treats him as unauthenticated: traffic is redirected.",
  a:[{k:"dave",x:170},{k:"phyre",x:315,b:"WHERE YOU GOING, DAVE?",kind:"shout",mood:"open",al:"right"}],
  seq:s=>[{f:"dave",t:"phyre",l:`GET http://3wi.fi (${br(s)})`}],next:"n14L"};
N.n14L={narr:"Back to the desk — for real.",loc:"dancefloor door",bg:"dance-door",tag:"HTTP 302 → portal",
  note:"The on-site firewall redirects unregistered traffic to the external captive portal.",
  a:[{k:"dave",x:170,b:"Just heading to 3wi.fi...",al:"left"},{k:"phyre",x:315,b:"First register with Port Hal, Dave.",al:"right"}],
  seq:[{f:"phyre",t:"dave",l:"HTTP 302 → portal URL",r:1}],next:"n15"};
N.n13pL={narr:"Caught red-handed.",loc:"dancefloor door",bg:"dance-door",tag:"Local firewall · intercepts probe",
  note:s=>`The on-site firewall intercepts the probe, so the OS concludes it's captive and opens ${mini(s)}.`,
  a:[{k:"dave",x:170},{k:"phyre",x:315,b:"WHERE YOU GOING, DAVE?",kind:"shout",mood:"open",al:"right"}],
  seq:s=>[{f:"dave",t:"phyre",l:ios(s)?"GET captive.apple.com":"GET connectivitycheck.gstatic.com"}],next:"n14pL"};
N.n14pL={narr:"Not registered, not dancing.",loc:"dancefloor door",bg:"dance-door",tag:"HTTP 302 → portal",
  note:s=>`The redirect opens the portal in ${mini(s)}.`,
  a:s=>[{k:"dave",x:170,b:ios(s)?"Just checking captive.apple.com...":"Just checking connectivity...",al:"left"},{k:"phyre",x:315,b:"Not registered? See Port Hal.",al:"right"}],
  seq:[{f:"phyre",t:"dave",l:"HTTP 302 → portal URL",r:1}],next:"n15n"};
N.n18L={narr:"One last double-check.",loc:"in the hall",bg:"interior",tag:"RADIUS · Access-Request (from firewall)",
  note:"The on-site firewall checks the portal-issued credentials with RADIUS — the controller isn't involved anymore.",
  a:[{k:"dave",x:90,b:"Hey Phyre — what's up?",al:"left",band:"--band-green"},{k:"phyre",x:235,b:"Nice badge. Check him, Ray?",al:"center",top:true},{k:"ray",x:355,b:"He's good.",al:"right",seated:true}],
  seq:[{f:"dave",t:"phyre",l:"POST firewall login (credentials)"},{f:"phyre",t:"ray",l:"Access-Request (credentials)"},{f:"ray",t:"phyre",l:"Access-Accept (guest group)",r:1}],next:"n19L"};
N.n19L={ok:1,narr:"At last, the dancefloor.",loc:"the dancefloor",bg:"dancefloor",tag:"firewall policy → Internet",note:"The on-site firewall now lets Dave's traffic through. He's online.",
  a:[{k:"phyre",x:270,b:"Go ahead, Dave!",al:"left"},{k:"dave",x:380,b:"Finally — internet!",al:"right",band:"--band-green"}],
  seq:[{f:"phyre",t:"dave",l:"guest policy · Internet open",r:1}]};

const fwLoc=s=>s.integ==="fwLocal"||s.integ==="fwLocalMab";
const fwBo=s=>s.integ==="fwBoth"||s.integ==="fwBothMab";
const fwL=s=>fwLoc(s)||fwBo(s);
const greetK=s=>fwBo(s)?"phyre":"troller";
// the controller runs the captive portal (with or without MAB at the door)
const ctrl=s=>s.integ==="controller"||s.integ==="controllerMab";
const ctrlLike=s=>ctrl(s)||s.integ==="mabOnly";
// the controller itself hands the session back through a URL, without RADIUS at login
const urlHandback=s=>ctrl(s)&&(s.vendor==="mist"||(s.vendor==="meraki"&&s.mlogin==="grant"));
// RADIUS takes part in the journey (at the door and/or at login)
const usesRadius=s=>fwL(s)||(ctrlLike(s)&&!urlHandback(s))||rayCheckers(s);
// the Meraki itself sends the MAB request (not an on-site firewall)
const merakiMab=s=>s.vendor==="meraki"&&(s.integ==="controllerMab"||s.integ==="mabOnly");
const VNAME={"cisco-wlc":"Cisco WLC",aruba:"Aruba",meraki:"Meraki",mist:"Mist","ruckus-ap":"Ruckus AP","ruckus-smartzone":"Ruckus SmartZone",fortigate:"FortiGate"};
const enfK=s=>fwL(s)?"phyre":"troller";
const cloudDhcp=s=>["quarantine","whitelist","blacklist","zombies"].includes(s.dhcp);
// Cloudi-Fi's own services: they get the Cloudi-Fi logo before their name (Dee only when the DHCP is Cloudi-Fi's)
const OURS=(k,s)=>k==="porter"||k==="chippy"||k==="ray"||(k==="dippy"&&cloudDhcp(s))||(k==="soso"&&idSrc(s)==="guest");
// the identity source Ray calls on the 802.1X door (EAP-TTLS only), or null
const idSrc=s=>secure(s)&&s.method==="ttls"?s.idsrc:null;
// technical lane name: on the 802.1X door, Ida Pee is the directory RADIUS calls, not the SSO IdP
const techName=(k,s)=>k==="soso"&&secure(s)?"Directory":TECH[k];
// MAB at association: the enforcement point asks RADIUS about the MAC at the door
const rayCheckers=s=>["controllerMab","mabOnly","fwLocalMab","fwBothMab"].includes(s.integ);
function entranceActors(s,enfBubble,rayBubble){
  if(fwBo(s)) return [{k:"dave",x:103},{k:"phyre",x:225,...(enfBubble?{b:enfBubble,al:"center"}:{})},{k:"ray",x:355,b:rayBubble,al:"right",seated:true}];
  if(!fwL(s)) return [{k:"dave",x:103},{k:"troller",x:225,...(enfBubble?{b:enfBubble,al:"center"}:{})},{k:"ray",x:355,b:rayBubble,al:"right",seated:true}];
  return [{k:"troller",x:42,mood:"flat"},{k:"dave",x:149},{k:"phyre",x:236,...(enfBubble?{b:enfBubble,al:"center"}:{})},{k:"ray",x:370,b:rayBubble,al:"right",seated:true}];
}
function thresholdActors(s,line,dave){
  if(!fwL(s)) return [{k:"dave",x:dave.x,...dave},{k:"troller",x:340,b:line,al:"right"}];
  return [{k:"dave",x:dave.x,...dave},{k:"phyre",x:340,b:line,al:"right"}];
}
/* ---------- passkey (Face ID / Touch ID) ---------- */
N.n16P={narr:"Ida Pee asks for a glance.",loc:"id booth",bg:"booth",tag:"SSO · passkey (WebAuthn)",
  note:"In a full browser the IdP can use a passkey: Face ID or Touch ID, no password typed at all.",
  a:[{k:"dave",x:130,b:"Face ID... done!",al:"left"},{k:"soso",x:330,b:"Confirmed, you're Dave.",al:"right"}],
  seq:[{f:"porter",t:"dave",l:"redirect → IdP",r:1},{f:"dave",t:"soso",l:"WebAuthn assertion (Face ID / Touch ID)"},{f:"soso",t:"dave",l:"signed assertion",r:1}],next:"n17"};
N.n16nP={narr:"Ida Pee asks for a glance.",loc:"id booth",bg:"booth",tag:"SSO · passkey in the mini-browser",
  note:s=>ios(s)?"The CNA doesn't support WebAuthn: the Face ID prompt never shows up.":"Android's sign-in app doesn't expose passkeys either: the prompt never shows up.",
  a:[{k:"dave",x:130,b:"Face ID?... nothing happens.",al:"left",mood:"flat"},{k:"soso",x:330,b:s=>`Just look at your ${dev(s)}, Dave.`,al:"right"}],
  seq:[{f:"porter",t:"dave",l:"redirect → IdP",r:1},{f:"dave",t:"soso",l:"WebAuthn request · unsupported in mini-browser"}],next:"nPasskeyEnd"};
N.nPasskeyEnd={end:1,narr:"Stuck at the booth.",loc:"id booth",bg:"booth",tag:"WebAuthn unavailable · the end",
  note:"Without a fallback method on the IdP (password, OTP), SSO can't complete inside the mini-browser. Escaping to a real browser is the fix.",
  a:[{k:"dave",x:130,b:"This isn't going anywhere...",kind:"think",al:"left",mood:"flat"},{k:"soso",x:330,b:"No passkey here. Sorry, Dave.",al:"right",mood:"flat"}],
  seq:[{f:"soso",t:"dave",l:"no assertion",r:1}]};
/* ---------- SSID_PARTY_SECURE: 802.1X at the door, no captive portal ---------- */
// first cut: the happy path, EAP-TLS or EAP-TTLS; the controller only relays EAP, Ray (RADIUS) decides
const doorCrew=(dave,conn,ray)=>[{k:"dave",x:103,...(dave?{b:dave,al:"left"}:{})},{k:"troller",x:225,...(conn?{b:conn,al:"center",top:true}:{})},{k:"ray",x:355,...(ray?{b:ray,al:"right"}:{}),seated:true}];
N.x2={choice:"vendor",narr:"Members only.",loc:"at the members' door",bg:"door-inside",tag:"EAP · Identity",
  note:"The controller asks who's there and relays the answer to RADIUS: EAP travels over the air to the controller, then inside RADIUS to the server. Until it succeeds, nothing else gets through.",
  a:doorCrew(null,"Ray, a Dave for the members' room.","Let's see some ID."),
  seq:[{f:"troller",t:"dave",l:"EAP-Request · Identity"},{f:"dave",t:"troller",l:"EAP-Response · Identity (user name)",r:1},{f:"troller",t:"ray",l:"Access-Request (EAP-Message · Identity)"}],next:"x3"};
N.x3={narr:"Ray shows his badge first.",loc:"at the members' door",bg:"door-inside",tag:"TLS handshake · server certificate",
  note:"RADIUS answers with its own certificate, relayed by the controller. The device checks it against the CA and server name in its Wi-Fi profile before saying anything else: a fake Ray would get nothing.",
  a:doorCrew("You first. Badge?",null,"Ray Dius, certified. See?"),
  seq:[{f:"ray",t:"troller",l:"Access-Challenge (TLS · server certificate)",r:1},{f:"troller",t:"dave",l:"EAP-Request (TLS · server certificate)",r:1},{f:"dave",t:"dave",l:"server certificate checked against the Wi-Fi profile"}],next:"dMethod"};
N.dMethod={dec:"EAP method?",next:{k:"method",map:{tls:"x4t",ttls:"x4p"}}};
N.x4t={choice:"method",narr:"Dave shows his own certificate.",loc:"at the members' door",bg:"door-inside",tag:"EAP-TLS · client certificate",
  note:"EAP-TLS: Dave shows a certificate too. His company's MDM installed it beforehand, or enrolled it over SCEP. RADIUS accepts it only if it chains up to a CA this customer registered: its own, or one Cloudi-Fi runs for it.",
  a:doorCrew("And here's mine.",null,"Let me see who signed it."),
  seq:[{f:"dave",t:"troller",l:"EAP-Response (TLS · client certificate)"},{f:"troller",t:"ray",l:"Access-Request (TLS · client certificate)"}],next:"dCredsT"};
N.dNac={dec:"NAC policy?",next:{k:"nac",map:{allow:"x5",deny:"x5r",blacklist:"x5b"}}};
// the verdict on the credentials, before the NAC policy: Ray reads the certificate, or hears Ida's answer on the phone
N.dCredsT={dec:"Certificate valid?",next:{k:"creds",map:{ok:"x4tv",bad:"x4tx"}}};
N.dCredsP={dec:"Password valid?",next:{k:"creds",map:{ok:"x4pv",bad:"x4px"}}};
const IDA_OK={ldap:"bind OK",entraid:"token · group membership",guest:"guest account valid"};
const IDA_KO={ldap:"bind failed (invalid credentials)",entraid:"sign-in refused",guest:"no such guest account / wrong password"};
N.x4tv={choice:"creds",narr:"Signed by his company.",loc:"at the members' door",bg:"door-inside",tag:"EAP-TLS · certificate verified",
  note:"The certificate chains up to a CA this customer registered, its own or one Cloudi-Fi runs for it, and it hasn't expired: Dave is who he says he is.",
  a:doorCrew(null,null,"Signed by your company. Good."),
  seq:[{f:"ray",t:"ray",l:"certificate chain → customer's CA · valid"}],next:"dNac"};
N.x4tx={choice:"creds",narr:"Signed by a stranger.",loc:"at the members' door",bg:"door-inside",tag:"EAP-TLS · certificate rejected",
  note:"The certificate wasn't issued by a CA this customer registered, or it has expired: RADIUS answers Access-Reject before any policy is looked at.",
  a:doorCrew(null,null,"Signed by... nobody I know. No."),
  seq:[{f:"ray",t:"ray",l:"certificate chain → unknown CA or expired"},{f:"ray",t:"troller",l:"Access-Reject (EAP-Failure)",r:1}],next:"x6r"};
N.x4pv={choice:"creds",narr:"Ida vouches for him.",loc:"at the members' door",bg:"door-inside",tag:"EAP-TTLS · password verified",
  note:"The identity source confirms the login and password: Dave is who he says he is.",
  a:s=>doorCrew(null,null,"Ida says you're good.").map(x=>x.k==="ray"?{...x,phone:true}:x),
  seq:s=>[{f:"soso",t:"ray",l:IDA_OK[s.idsrc],r:1}],next:"dNac"};
N.x4px={choice:"creds",narr:"Ida doesn't buy it.",loc:"at the members' door",bg:"door-inside",tag:"EAP-TTLS · password rejected",
  note:"The identity source refuses the login and password: RADIUS answers Access-Reject before any policy is looked at.",
  a:s=>doorCrew(null,null,"Ida says wrong password. No.").map(x=>x.k==="ray"?{...x,phone:true}:x),
  seq:s=>[{f:"soso",t:"ray",l:IDA_KO[s.idsrc],r:1},{f:"ray",t:"troller",l:"Access-Reject (EAP-Failure)",r:1}],next:"x6r"};
N.x5b={choice:"nac",narr:s=>`Ray knows that ${dev(s)}.`,loc:"at the members' door",bg:"door-inside",tag:"RADIUS · Access-Reject (device blacklisted)",
  note:"Identity and policy check out, but this device is blacklisted (or in quarantine) in Cloudi-Fi's device list: RADIUS rejects it anyway.",
  a:s=>doorCrew(null,null,`That ${dev(s)} is blacklisted. No.`),
  seq:[{f:"ray",t:"ray",l:"device security profile → blacklist"},{f:"ray",t:"troller",l:"Access-Reject (EAP-Failure)",r:1}],next:"x6r"};
N.x4p={choice:"method",narr:"Dave whispers his password.",loc:"at the members' door",bg:"door-inside",tag:"EAP-TTLS · password in the tunnel",
  note:"EAP-TTLS: only RADIUS shows a certificate. Inside the encrypted tunnel, the device sends a login and password, and RADIUS calls the identity source to check them.",
  a:s=>doorCrew("Psst: dave / hunter2.",null,"Hold on. Ida? One of yours?").map(x=>x.k==="ray"?{...x,phone:true}:x),
  seq:[{f:"dave",t:"troller",l:"EAP-Response (TTLS tunnel · login, password)"},{f:"troller",t:"ray",l:"Access-Request (tunnelled credentials)"}],next:"dIdsrc"};
N.dIdsrc={dec:"Identity source?",next:{k:"idsrc",map:{ldap:"x4l",entraid:"x4e",guest:"x4g"}}};
// Ida Pee takes Ray's call in her booth, phone to the ear (she is not at the door)
const idaCall=line=>[{k:"soso",x:330,b:line,al:"right",phone:true}];
N.x4l={choice:"idsrc",narr:"Ida Pee checks her directory.",loc:"id booth",bg:"booth",tag:"LDAP · search and bind",
  note:"RADIUS checks the login and password against the customer's LDAP directory, often Active Directory: it looks the user up, then binds with the password.",
  a:idaCall("dave / hunter2? Let me look him up."),
  seq:[{f:"ray",t:"soso",l:"LDAP search + bind (login, password)"}],next:"dCredsP"};
N.x4e={choice:"idsrc",narr:"Ida Pee answers from the cloud.",loc:"id booth",bg:"booth",tag:"Entra ID · sign-in check",
  note:"RADIUS checks the login and password with the customer's Entra ID tenant, in the cloud, and reads the user's groups for the NAC policy.",
  a:idaCall("dave / hunter2? Checking his sign-in."),
  seq:[{f:"ray",t:"soso",l:"sign-in (login, password)"}],next:"dCredsP"};
N.x4g={choice:"idsrc",narr:"Ida Pee checks the guest accounts.",loc:"id booth",bg:"booth",tag:"Guest account · login check",
  note:"The login is a Cloudi-Fi guest account, created beforehand at the lobby: RADIUS checks it against Cloudi-Fi's guest accounts.",
  a:idaCall("dave / hunter2? Let me find his guest account."),
  seq:[{f:"ray",t:"soso",l:"guest account check (login, password)"}],next:"dCredsP"};
// what the accept carries, per controller vendor (Mist gets the generic answer; Cisco: the VLAN only)
const ROLE_ATTR={aruba:"Aruba-User-Role",meraki:"Filter-Id",mist:"Filter-Id","ruckus-ap":"Ruckus-User-Groups","ruckus-smartzone":"Ruckus-User-Groups",fortigate:"Fortinet-Group-Name"};
const ROLE_NOTE={aruba:"On an Aruba, the role arrives as Aruba-User-Role = cloudifi-Members.",meraki:"On a Meraki, Filter-Id = cloudifi-Members names the group policy to apply.",
  mist:"Mist gets the generic answer: Filter-Id (and Aruba-User-Role) = cloudifi-Members.","ruckus-ap":"On a Ruckus, the role arrives as Ruckus-User-Groups = cloudifi-Members.",
  "ruckus-smartzone":"On a Ruckus, the role arrives as Ruckus-User-Groups = cloudifi-Members.",fortigate:"On a FortiGate, the group arrives as Fortinet-Group-Name = cloudifi-Members."};
N.x5={choice:"nac",narr:"Ray says yes.",loc:"at the members' door",bg:"door-inside",
  tag:s=>ROLE_ATTR[s.vendor]?`RADIUS · Access-Accept (${ROLE_ATTR[s.vendor]} + VLAN)`:"RADIUS · Access-Accept (VLAN)",tagAll:"RADIUS · Access-Accept (role / VLAN)",
  note:s=>"RADIUS applies the customer's NAC policy (allow or deny, the profile and the VLAN), then sends the accept along with the session keys. "+(ROLE_NOTE[s.vendor]||`On a ${VNAME[s.vendor]}, only the VLAN is sent.`)+" The VLAN comes as Tunnel-Private-Group-Id = 20.",
  a:doorCrew(null,null,"Policy says yes. VLAN 20."),
  seq:s=>[{f:"ray",t:"ray",l:"NAC policy → allow · profile Members · VLAN 20"},{f:"ray",t:"troller",l:`Access-Accept (EAP-Success, keys, ${ROLE_ATTR[s.vendor]?ROLE_ATTR[s.vendor]+" = cloudifi-Members, ":""}VLAN 20)`,r:1},{f:"troller",t:"dave",l:"EAP-Success",r:1}],next:"x6"};
N.x5r={choice:"nac",narr:"Ray says no.",loc:"at the members' door",bg:"door-inside",tag:"RADIUS · Access-Reject",
  note:"The credentials check out, but the customer's NAC policy doesn't let this user in here (location, SSID, profile...): RADIUS answers Access-Reject.",
  a:doorCrew(null,null,"Policy says no. Not tonight."),
  seq:[{f:"ray",t:"ray",l:"NAC policy → deny"},{f:"ray",t:"troller",l:"Access-Reject (EAP-Failure)",r:1}],next:"x6r"};
N.x6r={end:1,narr:"Not on the list.",loc:"outside",bg:"door-secure",tag:"EAP-Failure · the end",
  note:"The controller relays the EAP-Failure and drops the association: no keys, no address, no access.",
  a:[{k:"dave",x:170,mood:"flat"},{k:"troller",x:340,b:"Sorry Dave, members only.",al:"right"}],
  seq:[{f:"troller",t:"dave",l:"EAP-Failure · deauthentication",r:1}]};
N.x6={narr:"Conn hands him the keys.",loc:"stepping in",bg:"door-secure",tag:"4-way handshake · keys",
  note:"Both sides derive the same encryption keys from the 802.1X exchange and prove it in four EAPOL-Key messages. From now on Dave's traffic is encrypted, and placed in VLAN 20.",
  a:[{k:"dave",x:150,band:"--band-green"},{k:"troller",x:340,b:"VLAN 20, and your keys. See Dee.",al:"right"}],
  seq:[{f:"troller",t:"dave",l:"EAPOL-Key (4-way handshake)"},{f:"dave",t:"troller",l:"EAPOL-Key (4-way handshake)",r:1},{f:"troller",t:"dave",l:"port open · VLAN 20",r:1}],next:"x7"};
N.x7={narr:"Dee hands him an address.",loc:"cloakroom",bg:"cloakroom",tag:"DHCP · lease in VLAN 20",
  note:"Only now does the device ask for an address: on the members' VLAN, from that VLAN's pool.",
  a:[{k:"dave",x:130,b:"Hi Dee, VLAN 20 — got an IP for me?",al:"left",band:"--band-green"},{k:"dippy",x:320,b:"Members' room: 10.0.20.47.",al:"right"}],
  seq:[{f:"dave",t:"dippy",l:"DHCP DISCOVER (VLAN 20)"},{f:"dippy",t:"dave",l:"OFFER 10.0.20.47",r:1},{f:"dave",t:"dippy",l:"DHCP REQUEST"},{f:"dippy",t:"dave",l:"ACK",r:1}],next:"x8"};
N.x8={ok:1,narr:"Straight to the dancefloor.",loc:"the dancefloor",bg:"dancefloor",tag:"No portal → Internet",
  note:s=>s.os==="iot"?"No captive portal on this SSID: the printer is online as soon as it has its address.":"The OS probe goes straight through: no captive portal on this SSID, so no mini-browser pops up. Dave is online.",
  a:[{k:"troller",x:270,b:"Members don't queue. Go ahead!",al:"left"},{k:"dave",x:380,b:"No portal? Sweet!",al:"right",band:"--band-green"}],
  seq:s=>[...(s.os==="iot"?[]:[{f:"dave",t:"dave",l:"OS probe passes · not captive"}]),{f:"troller",t:"dave",l:"VLAN 20 · Internet open",r:1}]};

reachesHandsFree=s=>{ for(let id="n1";id;id=nextOf(id,s)) if(id==="dBrowse") return true; return false; }; // stops before dBrowse, which asks this very question
/* ---------- sponsor approval (Spencer) ---------- */
// the portal emails the sponsor a link to an approval page (drawn as Port Hal phoning Spencer); Dave's page shows a waiting
// message and polls; on approval it logs him in by itself, unless he has left: then he comes back with the credentials the SMS brought
const spencer=(b,o)=>[{k:"sponsor",x:220,b,al:"center",...o}];
N.sp1={narr:"Dave names a sponsor.",loc:"reception",bg:"reception",tag:"Portal · sponsor request",
  note:"Dave fills in the form with his phone number and his sponsor's email address, which must belong to a domain the customer allows. The portal asks the sponsor and shows a waiting message.",
  a:[{k:"dave",x:130,b:"My sponsor is Spencer, from the 3rd floor.",al:"left"},{k:"porter",x:320,b:"Let me ask him. Hold on.",al:"right",headSpin:true}],
  seq:[{f:"dave",t:"porter",l:"POST registration (phone, sponsor email)"},{f:"porter",t:"dave",l:"Awaiting sponsor approval…",r:1}],next:"sp2"};
N.sp2={narr:"Port Hal calls the sponsor.",loc:"reception",bg:"reception",tag:"Sponsor email · guest page polls",
  note:"The sponsor gets an email with a link to an approval page. Meanwhile Dave's page keeps asking the portal, every second or so, whether there is an answer.",
  a:[{k:"dave",x:130,b:"Spencer had better be quick.",kind:"think",al:"left"},{k:"porter",x:320,b:"Spencer? A Dave says you know him.",al:"right",headSpin:true,phone:true}],
  seq:[{f:"porter",t:"sponsor",l:"email · approval link"},{f:"dave",t:"porter",l:"GET registration status (poll)"},{f:"porter",t:"dave",l:"pending",r:1}],next:"dSpAuth"};
N.dSpAuth={dec:"Sponsor?",next:{k:"spauth",map:{none:"spA",sso:"spS",silent:"spQ"}}};
N.spA={choice:"spauth",narr:"Spencer opens the link.",loc:"his office",bg:"interior",tag:"Approval link · no sign-in",
  note:"By default the link is enough: it opens the approval page directly and stays valid for 24 hours.",
  a:spencer("Dave? From the club? Let me see.",{phone:true}),
  seq:[{f:"sponsor",t:"porter",l:"opens approval link"}],next:"dSpAns"};
N.spS={choice:"spauth",narr:"Spencer checks in with Ida Pee.",loc:"id booth",bg:"booth",tag:"Sponsor · SAML sign-in",
  note:"The customer can require the sponsor to sign in first: the approval page sends him to the company's IdP (Entra ID, Okta…) over SAML.",
  a:[{k:"sponsor",x:150,b:"Ida, it's me, Spencer.",al:"left"},{k:"soso",x:330,b:"Confirmed. Go ahead.",al:"right"}],
  seq:[{f:"sponsor",t:"porter",l:"opens approval link"},{f:"porter",t:"sponsor",l:"redirect → IdP (SAML)",r:1},{f:"sponsor",t:"soso",l:"sign-in"},{f:"soso",t:"sponsor",l:"signed assertion",r:1},{f:"sponsor",t:"porter",l:"POST assertion"}],next:"dSpAns"};
N.dSpAns={dec:"Sponsor's answer?",next:{k:"spans",map:{approve:"spY",refuse:"spN"}}};
N.spY={choice:"spans",narr:"Spencer says yes.",loc:"his office",bg:"interior",tag:"Sponsor approves · profile",
  note:"On the approval page the sponsor accepts and picks Dave's profile, which sets how long his account stays valid.",
  a:spencer("Dave? Sure. Guest profile, one day.",{phone:true}),
  seq:[{f:"sponsor",t:"porter",l:"Accept · profile Guest"},{f:"porter",t:"dave",l:"SMS · credentials",r:1}],next:"dSpWait"};
N.spN={choice:"spans",narr:"Spencer says no.",loc:"his office",bg:"interior",tag:"Sponsor refuses",
  note:"The sponsor refuses the request on the approval page.",
  a:spencer("Dave who? Never heard of him.",{phone:true}),
  seq:[{f:"sponsor",t:"porter",l:"Reject"}],next:"spNr"};
// comic-only variants of a panel (easter eggs): not criteria, so they stay out of the URL, the YAML, the sequence and the flow
const EGG={podbay:"no"};
N.spNr={end:1,narr:"Not on Spencer's list.",loc:"reception",bg:"reception",tag:"Registration refused · the end",
  variant:{key:"podbay",opts:[{v:"no",title:"Not on Spencer's list."},{v:"yes",title:"Dave asks to open the pod-bay doors."}]},
  note:"Dave's page learns the answer at its next check and shows that the registration was refused.",
  a:()=>EGG.podbay==="yes"?[{k:"dave",x:130,b:"Open the pod-bay doors, Hal.",al:"left",mood:"flat"},{k:"porter",x:320,b:"I'm sorry Dave. I'm afraid I can't do that.",al:"right"}]
    :[{k:"dave",x:130,mood:"flat"},{k:"porter",x:320,b:"Sorry Dave, your registration was refused.",al:"right"}],
  seq:[{f:"dave",t:"porter",l:"GET registration status (poll)"},{f:"porter",t:"dave",l:"rejected",r:1}]};
N.spQ={choice:"spauth",narr:"Spencer is in a meeting.",loc:"his office",bg:"interior",tag:"Sponsor · no answer",
  note:"The email sits unread and the link is never opened. Nothing expires the request: it stays pending, and the link itself dies after 24 hours.",
  a:spencer("Later. I'm in a meeting.",{kind:"think"}),
  seq:[{f:"sponsor",t:"sponsor",l:"approval email left unread"}],next:"spQr"};
N.spQr={end:1,narr:"Still waiting.",loc:"reception",bg:"reception",tag:"Pending forever · the end",
  note:"Dave's page keeps polling and the request stays pending: no answer, no access, and no end to the wait.",
  a:[{k:"dave",x:130,b:"Any news from Spencer?",al:"left",mood:"flat"},{k:"porter",x:320,b:"Still waiting...",al:"right",headSpin:true}],
  seq:[{f:"dave",t:"porter",l:"GET registration status (poll, forever)"},{f:"porter",t:"dave",l:"pending",r:1}]};
N.dSpWait={dec:"Dave still on the page?",next:{k:"spwait",map:{stays:"spW",leaves:"spL"}}};
N.spW={choice:"spwait",narr:"Dave waits at the desk.",loc:"reception",bg:"reception",tag:"Approved · automatic login",
  note:"Dave stayed on the page: at its next check it learns the approval and logs him in by itself.",
  a:[{k:"dave",x:130,b:"Spencer said yes?",al:"left"},{k:"porter",x:320,b:"He did. Logging you in!",al:"right"}],
  seq:[{f:"dave",t:"porter",l:"GET registration status (poll)"},{f:"porter",t:"dave",l:"approved · login token",r:1},{f:"dave",t:"porter",l:"login (token)"}],next:"n17"};
N.spL={choice:"spwait",narr:"Dave wanders off.",loc:"reception",bg:"reception",tag:"Waiting page left · automatic login lost",
  note:s=>`Dave left the page${ios(s)?" (on iOS, leaving the CNA even drops the network)":""} before the answer came: only that page could log him in by itself. The approval still sent him his credentials by SMS.`,
  a:[{k:"porter",x:320,b:"Approved! Dave? ...Dave?",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"leaves the page · automatic login lost"}],next:"spLr"};
N.spLr={narr:"Round two.",loc:"reception",bg:"reception",tag:"Portal · login with SMS credentials",
  note:"Dave rejoins, the journey restarts, and he logs in with the credentials from the SMS.",
  a:[{k:"dave",x:130,b:"Back! Spencer's yes came by SMS.",al:"left"},{k:"porter",x:320,b:"Logged in. Welcome!",al:"right"}],
  seq:[{f:"dave",t:"dave",l:"re-joins SSID · journey restarts"},{f:"dave",t:"porter",l:"login (credentials from the SMS)"}],next:"n17"};

function nextOf(id,s){
  const nx=N[id].next; if(!nx) return null;
  if(typeof nx==="string") return nx;
  if(nx.k){ const ok=optsFor(nx.k,s); let v=s[nx.k]; if(ok.length && !ok.some(o=>o.v===v)) v=ok.some(o=>o.v===DEF[nx.k])?DEF[nx.k]:(ok.find(o=>o.fb)||ok[0]).v; if(!ok.length) v=DEF[nx.k]; return nx.map[v]; }
  for(const c of nx.cases) if(!c.when||c.when(s)) return c.to;
  return null;
}
function fullPath(s){ const p=[]; let id="n1"; while(id){ p.push(id); id=nextOf(id,s); } return p; }
const path=s=>fullPath(s).filter(id=>!N[id].dec);
// a step's tag in a given story; graphTag is the one shown in the graph of every branch
const tagOf=(id,s)=>V(N[id].tag,s);
const graphTag=id=>N[id].tagAll||N[id].tag;
const hasChoice=(id,s)=>N[id].choice && (!N[id].choiceIf||N[id].choiceIf(s)) && optsFor(N[id].choice,s).length>1;
const optsFor=(key,s)=>CHOICES[key].opts.filter(o=>!o.when||o.when(s));
function normalize(st){
  if(secure(st)) for(const k of OPEN_ONLY) st[k]=DEF[k]; // no stale portal-side value leaks into the 802.1X story
  for(let pass=0;pass<2;pass++) for(const k in CHOICES){
    const ok=optsFor(k,st); if(ok.length && !ok.some(o=>o.v===st[k])) st[k]=ok.some(o=>o.v===DEF[k])?DEF[k]:(ok.find(o=>o.fb)||ok[0]).v;
  }
}
