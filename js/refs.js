/* ---------- references linked from the panel tags: concept → standard, vendor doc or encyclopedia ---------- */
// Matched in this order; a piece of a tag already linked is not linked again, so specific entries come before generic ones.
const REFS=[
  [/802\.11/,"https://en.wikipedia.org/wiki/IEEE_802.11","IEEE 802.11 (Wikipedia)"],
  [/\bL2\b/,"https://en.wikipedia.org/wiki/Data_link_layer","Data link layer (Wikipedia)"],
  [/\bMAC\b/,"https://en.wikipedia.org/wiki/MAC_address","MAC address (Wikipedia)"],
  [/Access-Request/,"https://www.rfc-editor.org/rfc/rfc2865#section-4.1","RFC 2865 §4.1 · Access-Request"],
  [/Access-Accept/,"https://www.rfc-editor.org/rfc/rfc2865#section-4.2","RFC 2865 §4.2 · Access-Accept"],
  [/Access-Reject/,"https://www.rfc-editor.org/rfc/rfc2865#section-4.3","RFC 2865 §4.3 · Access-Reject"],
  [/\bRADIUS\b/,"https://www.rfc-editor.org/rfc/rfc2865","RFC 2865 · RADIUS"],
  [/\bMAB\b/,"https://www.cisco.com/c/en/us/td/docs/solutions/Enterprise/Security/TrustSec_1-99/MAB/MAB_Dep_Guide.html","MAC Authentication Bypass deployment guide (Cisco)"],
  [/cloudifi-Quarantine/,"https://help.cloudi-fi.com/hc/en-us/articles/30062400984093-How-to-handle-IoT-Devices-using-a-Dedicated-SSID-in-Cisco-Meraki-with-MAC-Based-Authentication","IoT devices on a Meraki SSID with MAC-based authentication (Cloudi-Fi help)"],
  [/Group policy/,"https://documentation.meraki.com/MR/Group_Policies_and_Block_Lists/Using_RADIUS_Attributes_to_Apply_Group_Policies","Using RADIUS attributes to apply group policies (Meraki)"],
  [/\bSSID\b/,"https://en.wikipedia.org/wiki/Service_set_(802.11_network)","Service set and SSID (Wikipedia)"],
  [/DHCP snooping/,"https://en.wikipedia.org/wiki/DHCP_snooping","DHCP snooping (Wikipedia)"],
  [/DISCOVER \/ OFFER/,"https://www.rfc-editor.org/rfc/rfc2131#section-3.1","RFC 2131 §3.1 · client-server interaction"],
  [/option 114/,"https://www.rfc-editor.org/rfc/rfc8910","RFC 8910 · captive portal identification in DHCP"],
  [/\bDHCP\b/,"https://www.rfc-editor.org/rfc/rfc2131","RFC 2131 · DHCP"],
  [/\bAPIPA\b/,"https://www.rfc-editor.org/rfc/rfc3927","RFC 3927 · IPv4 link-local addresses"],
  [/captive:(true|false)/,"https://www.rfc-editor.org/rfc/rfc8908#section-5","RFC 8908 §5 · API state structure"],
  [/\bCPI\b/,"https://www.rfc-editor.org/rfc/rfc8908","RFC 8908 · Captive Portal API"],
  [/connectivity probe|intercepts probe|Probe passes|captive detection|captive state|\bCNA\b/,"https://en.wikipedia.org/wiki/Captive_portal","Captive portal (Wikipedia)"],
  [/\b[Pp]ortal\b/,"https://www.rfc-editor.org/rfc/rfc8952","RFC 8952 · captive portal architecture"],
  [/HTTP 302/,"https://www.rfc-editor.org/rfc/rfc9110#section-15.4.3","RFC 9110 §15.4.3 · 302 Found"],
  [/\bHTTPS\b/,"https://www.rfc-editor.org/rfc/rfc9110#section-4.2.2","RFC 9110 §4.2.2 · https URI scheme"],
  [/\bOIDC\b/,"https://openid.net/specs/openid-connect-core-1_0.html","OpenID Connect Core 1.0"],
  [/\bSAML\b/,"https://docs.oasis-open.org/security/saml/Post2.0/sstc-saml-tech-overview-2.0.html","SAML 2.0 technical overview (OASIS)"],
  [/\bSSO\b/,"https://en.wikipedia.org/wiki/Single_sign-on","Single sign-on (Wikipedia)"],
  [/\bMFA\b/,"https://en.wikipedia.org/wiki/Multi-factor_authentication","Multi-factor authentication (Wikipedia)"],
  [/\bOTP\b/,"https://en.wikipedia.org/wiki/One-time_password","One-time password (Wikipedia)"],
  [/WebAuthn/,"https://www.w3.org/TR/webauthn/","Web Authentication (W3C)"],
  [/\bpasskey\b/,"https://fidoalliance.org/passkeys/","Passkeys (FIDO Alliance)"],
  [/IP surrogate/,"https://help.zscaler.com/zia/what-surrogate-ip","What is Surrogate IP? (Zscaler)"],
  [/grant URL/,"https://developer.cisco.com/meraki/captive-portal-api/click-through-api/","Click-through API and grant URL (Meraki)"],
  [/signed URL/,"https://www.juniper.net/documentation/us/en/software/mist/mist-wireless/topics/task/guest-access-external-portal.html","External portal for guest access (Juniper Mist)"],
  [/\bNBI\b/,"https://docs.cloud.ruckuswireless.com/ruckusone/wispr-api/GUID-C4CA5429-AF83-4CE8-A2C5-44445B3B51FB.html","Northbound interface (RUCKUS)"],
  [/\bController\b/,"https://en.wikipedia.org/wiki/Wireless_LAN_controller","Wireless LAN controller (Wikipedia)"],
  [/\bfirewall\b/i,"https://en.wikipedia.org/wiki/Firewall_(computing)","Firewall (Wikipedia)"],
];
// a tag as HTML, with every concept found in REFS turned into a link
function tagHTML(tag){
  const spans=[];
  for(const r of REFS){
    const re=new RegExp(r[0].source,r[0].flags+"g"); let m;
    while((m=re.exec(tag))){ const a=m.index, b=a+m[0].length; if(!spans.some(s=>a<s[1]&&s[0]<b)) spans.push([a,b,r]); }
  }
  spans.sort((x,y)=>x[0]-y[0]);
  let out="", i=0;
  for(const [a,b,r] of spans){ out+=esc(tag.slice(i,a))+`<a href="${r[1]}" target="_blank" rel="noopener" title="${esc(r[2])}">${esc(tag.slice(a,b))}</a>`; i=b; }
  return out+esc(tag.slice(i));
}
