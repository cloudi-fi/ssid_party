# SSID_PARTY — hand-off note

*Night at the Captive Portal.* An interactive stick-figure comic that explains, then documents, what a device goes through on a Cloudi-Fi captive-portal network. Written for a human first, meant to become a troubleshooting reference for support, customers and AI agents.

This note is for whoever picks the project up next, human or agent. It records the goals, the rules we settled on, how the thing is built and tested, the technical truths it encodes, and what is still missing. Conversation with the author (Julien, Cloudi-Fi) happened in French; the artifact itself is in English and stays in English.

---

## 1. Purpose and audiences

Three audiences, in order of appearance:

1. **Non-technical readers** — the comic must stay readable as a story with no legend, no reading hint and no jargon in the dialogue. The technical layer lives in the panel footers.
2. **Support engineers and customers** — the four views (Comic, Sequence, Flow, Criteria) are the same story graph rendered four ways, so a support case can be shared as a link that opens on the exact scenario.
3. **AI agents and the tenant-integration detection tool** — the *Criteria* tab is a flat YAML document. The detection tool should eventually produce it (with weighted or candidate values) and an agent should be able to read the story back from it: "given this tenant, this device and these observations, where on the map is the device and what breaks next".

Goal 3 is why the graph is declarative (criteria → decisions → panels) and why every story must terminate cleanly. The engineering backlog (§9) is what stands between the current state and a dependable agent-facing reference.

## 2. Files

| File | What |
|---|---|
| `index.html` | Markup only: title, view tabs, the four view containers, and the scripts in load order. |
| `css/style.css` | All styles, starting with the `@font-face` rules of the self-hosted fonts. |
| `js/draw.js` | Drawing: characters, bubbles, backgrounds. |
| `js/graph.js` | Story graph: criteria, defaults, titles, nodes, path resolution, `normalize`. No DOM: loads alone in Node. |
| `js/refs.js` | Links on the panel tags: concept → standard (RFC, W3C, OASIS, OpenID), vendor doc or Wikipedia, applied automatically to every tag that mentions the concept. |
| `js/views.js` | `panelSVG` and the four renderers. |
| `js/main.js` | State in the URL hash, event handlers, startup. |
| `fonts/` | Bangers, Patrick Hand and Inter (latin subset, woff2) with their OFL licences. |
| `img/favicon.ico` | Cloudi-Fi favicon (from super.cloudi-fi.net). |
| `img/cloudi-fi-logo-mini.svg` | The Cloudi-Fi logo shown before the names of Cloudi-Fi's own services (copied from the `ui-kit` repo). |
| `img/vendors/` | Controller and firewall brand logos (copied from the `ui-kit` repo), plus the LDAP and Entra ID logos for the 802.1X identity source; sequence-diagram lane headers only. |
| `img/os/` | Apple and Android icons for the Device lane header (Simple Icons, CC0; the Android robot is CC BY 3.0, attributed in the README). IoT uses the 🤖 emoji. |
| `tests/check.js` | Exhaustive consistency check (Node, no dependencies). Run it after **every** edit, see §4. |
| `HANDOFF.md` | This note. |

The project started as a claude.ai artifact. It is now a static site with no build step, no dependencies and no external requests, published by GitHub Pages from `main` (repository root): https://cloudi-fi.github.io/ssid_party/. Opening `index.html` from disk works too.

## 3. How it is built

The JS is five classic scripts (not ES modules) sharing one global scope, loaded by `index.html` in this order: `draw.js` → `graph.js` → `refs.js` → `views.js` → `main.js`. Code that runs at load time may only use what an earlier file declares; calls made later from inside functions can reach any file. `tests/check.js` loads the scripts the same way, so a wrong order fails the check. Landmarks, in load order:

- **Drawing** (`draw.js`): `figure(key, cx, opts)` draws a character (options: `band`, `mood`, `flip`, `headSpin`, `phone`, `antennas`, `cloudHead`, `zombie`, `handset`: a smartphone like Dave's, grey screen, at the right ear; in a panel's actors it is `phone:true`, also accepted by Ray's seated `rayDesk`), `bubble(...)` draws speech/thought/shout bubbles (wrap at 18 characters), background helpers (`interior`, `danceDoorHall`, `kiosk`, `desk`, …).
- **`CHOICES`** (`graph.js`, like everything down to `path`) — the criteria. Each has a question (`q`, comic wording), a technical name (`tq`) and options `{v, label, t, when}`. `when(state)` says whether the option applies; a criterion with no applicable option is "not applicable" (shown as `none` in YAML). **Declaration order matters**: a criterion whose `when` depends on another criterion must be declared after it (the test harness enumerates in that order).
- **`DEF`** — default value of every criterion. The default story is the baseline everything else is a deviation from.
- **`TITLES`** — per criterion and value, the panel title shown in the title dropdown of the panel that carries that choice. Strings or `state => string`.
- **`N`** — the story graph. Two node kinds:
  - *Panel*: `{narr, loc, bg, tag, note, a, seq, next, choice?, end?, ok?}`. `narr` is the title, `loc` the place label, `bg` the background, `tag` the technical label (a string, or `state => string` with a `tagAll` string for the graph of every branch: `tagOf(id, s)`, `graphTag(id)`), `note` the footer subtext, `a` the actors (array or `state => array`: `{k, x, b, al, kind, top, bx, mood, band, zombie, …}`; `top` puts the bubble at the top of the panel, `bx` shifts it sideways without moving the speaker), `seq` the sequence-diagram messages, `next` the next node id. `choice` names the criterion whose dropdown sits in this panel's title. `end: 1` is a failure ending, `ok: 1` a dancefloor ending.
  - *Decision*: `{dec, next}` with `next` either `{k, map:{value: nodeId}}` (one criterion) or `{dl, cases:[{when, l, set, to}]}` (computed; `l` is the chip label in the decision diagram, `set` the criteria that chip applies when clicked).
- **`nextOf(id, state)`** resolves a decision. Map decisions fall back to the default value (or the first applicable option) when the stored value no longer applies.
- **`normalize(state)`** rewrites impossible combinations after any change (vendor ↔ enforcement, Meraki/Mist RADIUS-optional, FortiGate-only modes, etc.).
- **`path(state)`** / **`fullPath(state)`** — the panel ids / all node ids of the current story.
- **Renderers** (`views.js`): `renderComic`, `renderSeq`, `renderDecision` (auto-layout flowchart, `layout()`), `renderCriteria` (YAML in/out, `CRIT` lists the criteria in YAML order, `derived(state)` computes the read-only block).
- **State** (`main.js`) lives in the URL hash: only non-default values plus `view=…`, and `fullwidth=1` / `showcriteria=1` when those toggles are on in a view that shows them (dropped when switching to a view without them). Old links keep working as long as criteria keys and values are not renamed; links using values renamed since publication are rewritten by `legacyHash` (`graph.js`), which `readHash` applies (see §9 about stable ids).

Helpers worth knowing: `FULL(text)` expands first names to full names in titles, `NB(text)` makes composite names non-breaking, `cloud(s)`, `fwL(s)`, `greetK(s)` (who guards the door: `troller` or `phyre`), `roleCases(...)`.

## 4. Editing and verification workflow

1. Edit the file concerned, usually `js/graph.js` (string replacement in a script is the safest way to touch the graph without breaking the rest).
2. `node tests/check.js index.html` — must end with `issues: 0`. It enumerates every valid criteria combination, walks every story and reports loops, dangling stories, unreachable nodes, `undefined`/`NaN` in any view, bubble overlaps or out-of-bounds in panels, a selected option hidden from its own menu, name labels (with their logo) overlapping or leaving the panel, a reference in `refs.js` that matches no tag, `undefined`/`NaN` in the Mermaid exports, and box/chip collisions in the decision diagram. Last known good: 180 519 valid states, 1 394 distinct stories, 0 issues.
3. Look at the result. Rasterising a panel helps: call `panelSVG(id, state)` from a tiny Node script (same DOM stubs as the harness), replace the CSS variables, and render with `cairosvg` or `rsvg-convert`.
4. Keep a backup of the previous version before structural changes.

The harness cannot see font rendering; bubble wrapping is computed from character counts, so very long words can still look off. Check them visually.

## 5. The universe

Nightclub **SSID_PARTY** with a members' door **SSID_PARTY_SECURE** for 802.1X (each name is its entrance's lintel, `door(sign)`; speech bubbles may partly cover it). The hall is the walled garden, the dancefloor door is the Internet (the INTERNET sign is its lintel; speech bubbles may partly cover it), the badge is the authorization. Music notes always point right (and sit inside the door frame when the scene is outside).

| Character | Role | Look |
|---|---|---|
| **Dave Ice** | the device | blue; iPhone (blue screen), Android (green screen) or IP camera prop. Zombie rendering (dashed limbs, skull face) when stuck forever |
| **Conn Troller** | the controller / NAS | cyan, antennas; "Conn" in dialogue |
| **Ray Dius** | RADIUS | dark grey, shades, seated at a desk with the big ledger |
| **Dee Ashcipee** | DHCP | orange, cloakroom tickets; option 114 = a note on the ticket; skeleton devices next to her when zombies fill the quarantine; cloud-shaped head when the DHCP is Cloudi-Fi's cloud DHCP |
| **Cee Peahy** | Captive-Portal API (CPI) | violet, kiosk |
| **Port Al** | the portal | green, bowtie, reception desk with a bell; head spinner when waiting |
| **Ida Pee** | IdP / SSO; on the 802.1X door, the directory RADIUS calls (lane "Directory", `techName`) | fuchsia, badge; takes Ray's call in her booth, phone to the ear; cloud-shaped head for Entra ID, Cloudi-Fi logo for the guest accounts |
| **Phyre Wall** | the firewall | red, flame; antennas when a FortiGate is controller *and* firewall; cloud-shaped head in cloud modes |

The Cloudi-Fi logo before a name marks Cloudi-Fi's own services: Port Al, Cee Peahy, Ray Dius, and Dee Ashcipee with the cloud DHCP (`OURS()` in `graph.js`; also on the sequence-diagram lane headers). A cloud-shaped head marks a role played by a cloud service when customers also run it themselves (Phyre Wall as Zscaler or Netskope, Dee Ashcipee as the cloud DHCP, Ida Pee as Entra ID): the head says the service is a cloud one, the logo says who runs it. Cloud-only characters (Ray Dius, Port Al, Cee Peahy) keep a plain head. A plain head does not mean "on site": an LDAP directory may run on the customer's servers, on a cloud VM or as a hosted service (JumpCloud, Google Secure LDAP), and the comic doesn't say where; in every case Ray reaches the directory from outside the customer's network, hence the phone call. Vendor logos stay out of the comic, where they would dilute the Cloudi-Fi marker; they appear only on the sequence-diagram lane headers (Device: Apple, Android, 🤖 for IoT; Controller: Cisco, Aruba, Fortinet, and for now Cisco for Meraki, Juniper for Mist, CommScope for Ruckus; Firewall: Zscaler, Netskope, Fortinet, only when a firewall is in the story).

Red is reserved for Phyre Wall and failure endings (`--c-fail`). The NAC, if it ever appears, sits between Conn Troller and Ray Dius (Ray's boss; §8).

## 6. Writing rules

- Dave is not always a phone: a sentence that names his device goes through `dev(s)` (`DEVICE_NOUN` in `graph.js`: phone for iOS and Android, camera for IoT). Windows PCs and Macs will come as laptops (Macs behave like iPhones with captive portals); add them there.

- **Names.** Titles use full names (automatic through `FULL()`). Direct address uses first names ("Hi Dave", "Hey Ray", "Hi Ida"). Referring to a third party uses the full name ("See Dee Ashcipee", "Ask Cee Peahy first"). Port Al is always "Port Al". Composite names never break across lines (`NB()`).
- **Titles** are sentences in the story's voice, never "what if…". Alternatives of a choice appear as other titles in the dropdown of the same panel. There is no notion of "main story"; the default is just the default.
- **Dialogue** is short and in character; bubbles wrap at 18 characters, shout bubbles take the speaker's colour. Thought bubbles for inner state.
- **Footer** = technical tag (what this step is, e.g. `802.11 · assoc`, `DHCP · no option 114`) above a full-width note (why it happens, what it implies). The note is where the technical truth lives; keep it precise and reusable by support. Concepts in the tag are linked automatically from `REFS` (`refs.js`): add an entry there for a new concept (standard first, vendor doc for vendor-specific notions, Wikipedia otherwise), more specific entries first.
- **Endings.** Failures end with a neutral "The end." card. The static-IP bypass that really reaches the Internet ends with a red-bordered card saying nobody ever verified Dave's identity. Dave only says "Ahah, I'm in, son of a switch." (smiling) in that real-bypass case.
- No legend, no reading hint, no dark mode (light theme is forced; the viewer's dark mode mangled the page).

## 7. UI and format rules

- Scrolling comic, two panels per row. Panel = numbered title (dropdown with optgroups when a choice applies; menu only shown if more than one option applies), scene SVG (full-bleed interior, floor edge to edge, names under the floor), footer.
- Title: the page title is the SSID picker (`renderTitle`, criterion `ssid`): "SSID_PARTY" (open, captive portal, default) or "SSID_PARTY_SECURE 🔒" (802.1X), a transparent select over the title text as in the panel titles. Each SSID has its own tagline, a film title: "Night at the Captive Portal." (Night at the Museum) and "Keys Wide Shut." (Eyes Wide Shut: a members-only party with a password at the door). On phones the longer name is set a little smaller (`h1.long`, 9.6 vw) so it stays on one line down to 320 px; on desktop it keeps the full size and the tabs stay on one row.
- Header: on desktop (≥ 1025 px) the view tabs sit right of the title, with the tool buttons ("Show criteria", "Full width", "Copy Mermaid") under them on the tagline line (out of the tab row, so the tabs never move); on tablets and phones the tabs go below the tagline.
- Tabs: Comic / Sequence (sequence diagram: technical participant names; only the actors in the story unless "Show criteria" is on, which keeps all eight lanes so the layout stays put while switching; coloured lanes spread over the available width (re-laid out on window resize; a self-message label goes left of its lane when the right edge is too close), sticky header synced horizontally, messages only by default; a "Show criteria" toggle, off by default, adds the `alt` frames with the criterion and its clickable choice chips; red end markers, "Full width" button) / Flow (decision diagram, `view=flow` in the URL, older `view=decision` links still open it: steps framed in the colour of the actor that handles them, as in the sequence-diagram lanes: the actor most present in the step's messages besides the device, ties going to the more specific component; endings marked ✓ or ✕; the current story's steps in one column by default; "Show criteria", shared with the sequence diagram, shows the auto-layout flowchart of every branch: diamonds with clickable value chips below, current path in bold; "Full width") / Criteria (editable YAML, validation, Apply or Ctrl+Enter, derived block, share link).
- "Copy Mermaid" (Sequence and Flow) copies the diagram as it is shown, as Mermaid text: `seqMermaid` (same lanes via `seqLanes`, replies as dashed `-->>`, with criteria each choice step in an `alt` block naming the current option, end notes) and `flowMermaid` (the story's steps, or with criteria every node and edge of `graphEdges()`, decisions as diamonds, choices as edge labels, the current path in bold, steps outlined in their actor's colour read from the CSS variables). Both are pure functions of the state in `views.js`; no character name appears in the export: participants and colour classes are named after `TECH` (`IdP (SSO)` → `IdP`), and labels go through `mmd()`, which swaps character names for technical ones ("Dave's MAC" → "Device's MAC") and turns `# ; " < >` into Mermaid entity codes; `check.js` fails on a character name in any export. The Clipboard API needs HTTPS or localhost; elsewhere `copyText` falls back to `execCommand("copy")`.
- Every control that changes a criterion goes through the same state → `normalize` → re-render path. Never special-case a view.

## 8. Technical truths the graph encodes

These were validated with the author; change them only with evidence.

**Criteria (hash key → YAML name)**: `browse`→`android_browse` (Android, once the sign-in app has closed by itself: stay default = nothing opens a browser, stuck in the hall, the end (`n12aw`); http = Dave thinks of opening an HTTP-only site such as 3wi.fi and the story goes on (`n12a`); applicable only when the story reaches `dBrowse`, `reachesHandsFree`) · `ssid`→`ssid` (open default, secure = 802.1X: the portal-side criteria `OPEN_ONLY` don't apply there and `normalize` resets them to their default) · `os`→`device_os` (ios default, android, iot) · `method`→`eap_method` (secure only: tls default, ttls) · `idsrc`→`identity_source` (secure + EAP-TTLS only: ldap default, entraid, guest = Cloudi-Fi guest account made at the lobby) · `creds`→`credentials` (secure only: ok default, bad → Access-Reject before any policy, EAP-Failure, the end; the verdict has its own panel, Ray reading the certificate or hearing Ida's answer on the phone) · `nac`→`nac_policy` (secure, valid credentials only: allow default, deny, blacklist = device blacklisted or in quarantine → Access-Reject, EAP-Failure, the end) · `vendor`→`controller_vendor` (cisco-wlc default, aruba, meraki, mist, ruckus-ap, ruckus-smartzone, fortigate) · `integ`→`enforcement` (who guards the door, and whether they check the MAC with RADIUS at association (MAB): controller default = the controller runs the captive portal without MAB, controllerMab = same with MAB, mabOnly = MAB-only SSID, fwLocal / fwLocalMab on-site FortiGate behind the controller, fwBoth / fwBothMab FortiGate is controller + firewall, cloud; the panel-3 menu offers all of them) · `mlogin`→`meraki_login` (Meraki + controller only: grant default = grant URL, radius = RADIUS login) · `fwvendor`→`fw_vendor` (zscaler default, netskope, fortigate) · `transient` (cloud only, default no) · `radius`→`mab` (Ray's answer when the MAC is checked at the door: unknown default, known; n/a without MAB) · `qpolicy`→`meraki_quarantine_policy` (Meraki MAB with an unknown MAC: defined default, missing) · `dhcp` (on-prem: ok, conflict, exhausted; cloud: quarantine, whitelist, blacklist, zombies) · `hack`→`static_ip_bypass` (blacklist only) · `snooping`→`dhcp_snooping` (hack only) · `o114`→`option_114` (no default) · `visit` (ios + option 114: first, returning) · `done`→`cna_done` (iOS, CPI path) · `reg`→`registration` (form default, sms, email, sso, mfa, passkey; the SSO lane shows the Entra ID logo, the most common IdP with Okta: indicative only, to help readers picture it, so Ida Pee keeps a plain head in the SSO panels) · `smsexit`→`sms_notification` (type, tap).

Schema conventions: one line per criterion, `none` when not applicable, `?` unknown, a list = candidates, a map = weighted probabilities (for the detection tool). Derived, read-only: `dhcp_hosting`, `mab_at_association`, `portal_runs_in`, `app_switch_risk`, `final_auth`, `outcome`, `steps`.

**Vendors.** Cisco WLC, Aruba, Ruckus AP, FortiGate: redirect, then RADIUS at login (the "one last double-check" step) — mandatory. Ruckus SmartZone: the NBI API triggers a new Access-Request, RADIUS mandatory. Meraki: grant URL (click-through, no RADIUS, nothing signed) or RADIUS login. Mist: always a signed authorization URL, no RADIUS at login. MAB at association is optional on every controller: without it, the controller admits every device into its captive role without asking RADIUS ("Conn doesn't even ask Ray").

**MAB with an unknown MAC.** Cloudi-Fi RADIUS answers Access-Reject on every vendor except Meraki. In captive mode the controller then falls back to its captive role (device gets an IP); on a MAB-only SSID the device is ejected (IoT use case). Meraki takes a rejected device off the SSID, so RADIUS answers Access-Accept with the group policy name `cloudifi-Quarantine` (Filter-Id) instead: if that group policy exists on the Meraki dashboard the device is admitted like any unregistered guest (on a MAB-only SSID it stays quarantined, no portal); if it doesn't, the device is refused at the door.

**Final authorization variants.** Controller login → RADIUS; firewall login → RADIUS; NBI → RADIUS; Meraki grant URL (no Ray); Mist signed URL (stamp on the hand, no Ray); SAML with IP surrogate (cloud firewall); DHCP whitelist (portal bypassed, Zscaler only).

**Cloud firewall.** Zscaler: SAML IdP-initiated. Netskope: SP-initiated. Transient mode: the portal hands a "visitor pass" first and the device carries the SAML assertion to the firewall.

**Cloud DHCP.** Its pools (quarantine / whitelist) are only enforced by a Zscaler integration (policies on the ranges). Anywhere else the range is just an address: the device runs captive detection and is held by the controller or firewall ("Nobody honours the VIP ticket"). Blacklist = silent drop (no OFFER, no NAK). A static IP skips DHCP and does not re-contact the controller: with Zscaler and no DHCP snooping it is a full bypass (warning end card, outcome `internet_bypass`); without Zscaler it only restores connectivity and the captive journey resumes; with DHCP snooping / IP source guard the unlearned address is dropped (`static_ip_dropped`) — the fix is on the customer's network. Quarantine leases are renewed forever, so zombies can exhaust the pool.

**iOS.** Captive detection by probe (captive.apple.com) or, with option 114, by CPI (`captive:true` opens the CNA; CPI requests carry no cookie: the option-114 URL itself, with the MAC and IP written in it, identifies the device). The CNA "Done" button leaves an HTTPS black hole (only a plain http:// site escapes; SSL-decrypting firewalls are the noted exception). Leaving the CNA for an MFA app, an SMS notification or mail drops the SSID (SMS: typing the code is fine, tapping the notification loses the CNA; email is painful; MFA app is lost). Passkeys (Face ID) are unsupported in the CNA. **Returning iPhone** after a CPI-based CNA bypass: iOS remembers the network as not captive, runs no probe and never calls the CPI again → stuck zombie (`stale_captive_state`); only exists when option 114 is in play.

**Android.** The sign-in app closes itself on `captive:false`; switching apps keeps the Wi-Fi. Passkeys assumed unsupported in the sign-in app (to confirm).

**IoT.** No probe, no CPI, no browser → stuck unless MAB (known MAC) or, with Zscaler, the whitelist range.

**NAC.** Not drawn. Technically it sits between the controller (enforcement point) and RADIUS (decision): Ray Dius plays that role today; a customer NAC (ISE, ClearPass, Forescout) would be Ray's boss at panel 2, answering MAB/802.1x itself, proxying to Ray or redirecting to Port Al. Belongs with the 802.1x branch.

## 9. Backlog

**In progress: 802.1X (SSID_PARTY_SECURE).** Done: the `ssid` criterion and the title picker; the first cut of the branch, happy path only (`x2`…`x8` in `graph.js`: EAP identity, TLS handshake with the server certificate, EAP-TLS or EAP-TTLS (then Ray phones Ida Pee: LDAP, Entra ID or guest account), credentials verdict, Access-Accept with the role attribute of the controller vendor (`ROLE_ATTR`: Aruba-User-Role, Filter-Id for Meraki and Mist, Ruckus-User-Groups, Fortinet-Group-Name; Cisco gets the VLAN only, pending the network engineers' answer on Framed-User) and the VLAN, then the controller gives the VLAN with the keys in the 4-way handshake, DHCP in the VLAN, Internet without a portal; or the credentials, the NAC policy or the device blacklist say no: Access-Reject, EAP-Failure, the end). Next: the Cisco attributes (waiting for the network engineers). Not shown on purpose (Julien, 2026-10-22): PEAP (not supported, so not depicted), an untrusted server certificate (rare). Decided (Julien, 2026-10-21): Ray stays the RADIUS character; Dave already has his certificate (MDM or SCEP only in the panel note); the target product is shown, NAC included; the tagline changes with the SSID (done).

Agreed order for the narrative branches:

1. **Rejections in loop** — registration rejected by the portal (domain not allowed, blocked user, IdP denies) and final authorization rejected by RADIUS (bad credentials, expired, too many devices), both returning to the portal.
2. **Static IP generalised** — available from quarantine and exhausted/zombie pools, not only from the blacklist; DHCP snooping as the common parade; the Zscaler IP-surrogate hijack (taking an authenticated guest's IP) as a variant to validate with the team; MAC clone of an authorized device in the same family.
3. **Wired** (switch ports, MAB/802.1x on the port) and **Windows** (NCSI probe, default browser, so no mini-browser trouble).
4. **802.1x** — a separate world: no portal, profile/VLAN by RADIUS, terminal reject; where the NAC appears.
5. Later: re-authentication / CPI "blocked white page" / 3wi.fi reminder (adds a notion of time); network issue (broken redirect, walled-garden or DNS misconfiguration — very useful for support); MAC randomisation (attach to `visit`); sponsoring as a registration method (new character likely; not developed at Cloudi-Fi yet); zombie eviction if the quarantine ever gets purged.

Pending confirmations: Android sign-in app and passkeys; whether a returning iPhone's lease still carries option 114 (observed: no probe and no CPI call anyway); what gets a stale iPhone out (forgetting the network on the phone is the only known way); address conflict only exists in the on-prem DHCP group; transient default stays `no`; what Mist does on an Access-Reject at MAB (drawn as the usual captive fallback); Meraki with a missing `cloudifi-Quarantine` group policy refusing the device at the door (observed by the author; Meraki's wireless documentation doesn't say).

Engineering, needed before agents rely on it:

- **Stable, meaningful node ids** (`firewall.intercept_probe` instead of `n13pL`). Keep a mapping for old hash links or accept breaking them once.
- **Weighted / candidate values** in the Criteria tab, fed by the detection tool, with the vendor → enforcement mapping table.
- **Per-step `observable`**: what the logs show at that step (the heart of "track a device anywhere on the map").
- **YAML export of the whole graph** (steps, decisions, criteria) in the same format.
- Optional `dhcp_pool` field for multiple whitelists.
- Case 11 (first `captive:true` opening the CNA with Port Al and Cee Peahy sharing storage) is shown as a message: accepted simplification, revisit if the agent needs the real mechanism.

## 10. Decisions already taken (do not reopen without reason)

- Scroll layout, two per row; no slide mode.
- Default story: iPhone, Cisco WLC, captive portal on the controller, **no MAB at association** (Ray is in the room but nobody asks him until login), on-prem DHCP, **no option 114** (probe path), SSO registration.
- "What if" removed from all titles; alternatives are titles.
- Footer tag above note, full width.
- Light theme only.
- The cloud is Phyre Wall's head, not a sign over the door.
- "Son of a switch" only when the bypass is real.
- Landing/success page not drawn: the badge is the proof.
- Firewall vendors other than Zscaler, Netskope and FortiGate set aside for now.
