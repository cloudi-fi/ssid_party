# SSID_PARTY — hand-off note

*A night at the captive portal.* An interactive stick-figure comic that explains, then documents, what a device goes through on a Cloudi-Fi captive-portal network. Written for a human first, meant to become a troubleshooting reference for support, customers and AI agents.

This note is for whoever picks the project up next, human or agent. It records the goals, the rules we settled on, how the thing is built and tested, the technical truths it encodes, and what is still missing. Conversation with the author (Julien, Cloudi-Fi) happened in French; the artifact itself is in English and stays in English.

---

## 1. Purpose and audiences

Three audiences, in order of appearance:

1. **Non-technical readers** — the comic must stay readable as a story with no legend, no reading hint and no jargon in the dialogue. The technical layer lives in the panel footers.
2. **Support engineers and customers** — the four views (comic, sequence diagram, decision diagram, criteria) are the same story graph rendered four ways, so a support case can be shared as a link that opens on the exact scenario.
3. **AI agents and the tenant-integration detection tool** — the *Criteria* tab is a flat YAML document. The detection tool should eventually produce it (with weighted or candidate values) and an agent should be able to read the story back from it: "given this tenant, this device and these observations, where on the map is the device and what breaks next".

Goal 3 is why the graph is declarative (criteria → decisions → panels) and why every story must terminate cleanly. The engineering backlog (§9) is what stands between the current state and a dependable agent-facing reference.

## 2. Files

| File | What |
|---|---|
| `index.html` | The whole artifact: CSS, SVG drawing code, story graph, four renderers, URL state. Single self-contained file, no dependencies, no network. |
| `tests/check.js` | Exhaustive consistency check (Node, no dependencies). Run it after **every** edit, see §4. |
| `HANDOFF.md` | This note. |

The artifact was developed and published as a claude.ai artifact; in the repo it is a static page and can be served as-is (GitHub Pages works).

## 3. How it is built

Everything is in one `<script>` in the HTML. Landmarks, in file order:

- **Drawing**: `figure(key, cx, opts)` draws a character (options: `band`, `mood`, `flip`, `headSpin`, `phone`, `antennas`, `cloudHead`, `zombie`), `bubble(...)` draws speech/thought/shout bubbles (wrap at 18 characters), background helpers (`interior`, `danceDoorHall`, `kiosk`, `desk`, …).
- **`CHOICES`** — the criteria. Each has a question (`q`, comic wording), a technical name (`tq`) and options `{v, label, t, when}`. `when(state)` says whether the option applies; a criterion with no applicable option is "not applicable" (shown as `none` in YAML). **Declaration order matters**: a criterion whose `when` depends on another criterion must be declared after it (the test harness enumerates in that order).
- **`DEF`** — default value of every criterion. The default story is the baseline everything else is a deviation from.
- **`TITLES`** — per criterion and value, the panel title shown in the title dropdown of the panel that carries that choice. Strings or `state => string`.
- **`N`** — the story graph. Two node kinds:
  - *Panel*: `{narr, loc, bg, tag, note, a, seq, next, choice?, end?, ok?}`. `narr` is the title, `loc` the place label, `bg` the background, `tag` the technical label, `note` the footer subtext, `a` the actors (array or `state => array`: `{k, x, b, al, kind, mood, band, zombie, …}`), `seq` the sequence-diagram messages, `next` the next node id. `choice` names the criterion whose dropdown sits in this panel's title. `end: 1` is a failure ending, `ok: 1` a dancefloor ending.
  - *Decision*: `{dec, next}` with `next` either `{k, map:{value: nodeId}}` (one criterion) or `{dl, cases:[{when, l, set, to}]}` (computed; `l` is the chip label in the decision diagram, `set` the criteria that chip applies when clicked).
- **`nextOf(id, state)`** resolves a decision. Map decisions fall back to the default value (or the first applicable option) when the stored value no longer applies.
- **`normalize(state)`** rewrites impossible combinations after any change (vendor ↔ enforcement, Meraki/Mist RADIUS-optional, FortiGate-only modes, etc.).
- **`path(state)`** / **`fullPath(state)`** — the panel ids / all node ids of the current story.
- **Renderers**: `renderComic`, `renderSeq`, `renderDecision` (auto-layout flowchart, `layout()`), `renderCriteria` (YAML in/out, `CRIT` lists the criteria in YAML order, `derived(state)` computes the read-only block).
- **State** lives in the URL hash: only non-default values plus `view=…`. Old links keep working as long as criteria keys and values are not renamed (see §9 about stable ids).

Helpers worth knowing: `FULL(text)` expands first names to full names in titles, `NB(text)` makes composite names non-breaking, `cloud(s)`, `fwL(s)`, `greetK(s)` (who guards the door: `troller` or `phyre`), `roleCases(...)`.

## 4. Editing and verification workflow

1. Edit the HTML (string replacement in a script is the safest way to touch the graph without breaking the rest).
2. `node tests/check.js index.html` — must end with `issues: 0`. It enumerates every valid criteria combination, walks every story and reports loops, dangling stories, unreachable nodes, `undefined`/`NaN` in any view, bubble overlaps or out-of-bounds in panels, a selected option hidden from its own menu, and box/chip collisions in the decision diagram. Last known good: 232 083 valid states, 1 059 distinct stories, 0 issues.
3. Look at the result. Rasterising a panel helps: call `panelSVG(id, state)` from a tiny Node script (same DOM stubs as the harness), replace the CSS variables, and render with `cairosvg` or `rsvg-convert`.
4. Keep a backup of the previous version before structural changes.

The harness cannot see font rendering; bubble wrapping is computed from character counts, so very long words can still look off. Check them visually.

## 5. The universe

Nightclub **SSID_PARTY**. The hall is the walled garden, the dancefloor door is the Internet, the wristband is the authorization. Music notes always point right (and sit inside the door frame when the scene is outside).

| Character | Role | Look |
|---|---|---|
| **Dave Ice** | the device | blue; iPhone (blue screen), Android (green screen) or IP camera prop. Zombie rendering (dashed limbs, skull face) when stuck forever |
| **Conn Troller** | the controller / NAS | cyan, antennas; "Conn" in dialogue |
| **Ray Dius** | RADIUS | dark grey, shades, seated at a desk with the big ledger |
| **Dee Ashcipee** | DHCP | orange, cloakroom tickets; option 114 = a note on the ticket; skeleton devices next to her when zombies fill the quarantine |
| **Cee Peahy** | Captive-Portal API (CPI) | violet, kiosk |
| **Port Al** | the portal | green, bowtie, reception desk with a bell; head spinner when waiting |
| **Heidi Pea** | IdP / SSO | fuchsia, badge |
| **Phyre Wall** | the firewall | red, flame; antennas when a FortiGate is controller *and* firewall; cloud-shaped head in cloud modes |

Red is reserved for Phyre Wall and failure endings (`--c-fail`). The NAC, if it ever appears, sits between Conn Troller and Ray Dius (Ray's boss; §8).

## 6. Writing rules

- **Names.** Titles use full names (automatic through `FULL()`). Direct address uses first names ("Hi Dave", "Hey Ray", "Hi Heidi"). Referring to a third party uses the full name ("See Dee Ashcipee", "Ask Cee Peahy first"). Port Al is always "Port Al". Composite names never break across lines (`NB()`).
- **Titles** are sentences in the story's voice, never "what if…". Alternatives of a choice appear as other titles in the dropdown of the same panel. There is no notion of "main story"; the default is just the default.
- **Dialogue** is short and in character; bubbles wrap at 18 characters, shout bubbles take the speaker's colour. Thought bubbles for inner state.
- **Footer** = technical tag (what this step is, e.g. `802.11 · assoc`, `DHCP · no option 114`) above a full-width note (why it happens, what it implies). The note is where the technical truth lives; keep it precise and reusable by support.
- **Endings.** Failures end with a neutral "The end." card. The static-IP bypass that really reaches the Internet ends with a red-bordered card saying nobody ever verified Dave's identity. Dave only says "Ahah, I'm in, son of a switch." (smiling) in that real-bypass case.
- No legend, no reading hint, no dark mode (light theme is forced; the viewer's dark mode mangled the page).

## 7. UI and format rules

- Scrolling comic, two panels per row. Panel = numbered title (dropdown with optgroups when a choice applies; menu only shown if more than one option applies), scene SVG (full-bleed interior, floor edge to edge, names under the floor), footer.
- Tabs: Comic / Sequence diagram (technical participant names, coloured lanes, sticky header synced horizontally, `alt` frames with clickable chips, red end markers, "Full width" button) / Decision diagram (auto-layout flowchart; diamonds with clickable value chips below; current path in bold; "Full width") / Criteria (editable YAML, validation, Apply or Ctrl+Enter, derived block, share link).
- Every control that changes a criterion goes through the same state → `normalize` → re-render path. Never special-case a view.

## 8. Technical truths the graph encodes

These were validated with the author; change them only with evidence.

**Criteria (hash key → YAML name)**: `os`→`device_os` (ios default, android, iot) · `vendor`→`controller_vendor` (cisco-wlc default, aruba, meraki, mist, ruckus-ap, ruckus-smartzone, fortigate) · `integ`→`enforcement` (radius default = captive mode, mabOnly, noRadius Meraki/Mist only, fwLocal on-site FortiGate behind the controller, fwBoth FortiGate is controller + firewall, cloud) · `fwvendor`→`fw_vendor` (zscaler default, netskope, fortigate) · `transient` (cloud only, default no) · `radius`→`mab` (open default = Access-Accept base, reject, mab = known MAC; open hidden in mabOnly) · `dhcp` (on-prem: ok, conflict, exhausted; cloud: quarantine, whitelist, blacklist, zombies) · `hack`→`static_ip_bypass` (blacklist only) · `snooping`→`dhcp_snooping` (hack only) · `o114`→`option_114` (no default) · `visit` (ios + option 114: first, returning) · `done`→`cna_done` (iOS, CPI path) · `reg`→`registration` (sso, mfa, passkey, form, sms, email) · `smsexit`→`sms_notification` (type, tap).

Schema conventions: one line per criterion, `none` when not applicable, `?` unknown, a list = candidates, a map = weighted probabilities (for the detection tool). Derived, read-only: `dhcp_hosting`, `portal_runs_in`, `app_switch_risk`, `final_auth`, `outcome`, `steps`.

**Vendors.** Cisco WLC, Aruba, Ruckus AP, FortiGate: redirect + RADIUS mandatory. Meraki: grant URL, RADIUS optional. Mist: signed return URL, RADIUS optional. Ruckus SmartZone: NBI API triggers a new Access-Request, RADIUS mandatory. In MAB-only SSIDs unknown MACs are ejected (IoT use case); in captive mode a MAB reject falls back to captive (device gets an IP) except on Meraki, which ejects.

**Final authorization variants.** Controller login → RADIUS; firewall login → RADIUS; NBI → RADIUS; signed URL (stamp on the hand, no Ray); SAML with IP surrogate (cloud firewall); DHCP whitelist (portal bypassed, Zscaler only).

**Cloud firewall.** Zscaler: SAML IdP-initiated. Netskope: SP-initiated. Transient mode: the portal hands a "visitor pass" first and the device carries the SAML assertion to the firewall.

**Cloud DHCP.** Its pools (quarantine / whitelist) are only enforced by a Zscaler integration (policies on the ranges). Anywhere else the range is just an address: the device runs captive detection and is held by the controller or firewall ("Nobody honours the VIP ticket"). Blacklist = silent drop (no OFFER, no NAK). A static IP skips DHCP and does not re-contact the controller: with Zscaler and no DHCP snooping it is a full bypass (warning end card, outcome `internet_bypass`); without Zscaler it only restores connectivity and the captive journey resumes; with DHCP snooping / IP source guard the unlearned address is dropped (`static_ip_dropped`) — the fix is on the customer's network. Quarantine leases are renewed forever, so zombies can exhaust the pool.

**iOS.** Captive detection by probe (captive.apple.com) or, with option 114, by CPI (`captive:true` opens the CNA; CPI requests carry no cookie or MAC, the token in the option-114 URL identifies the device). The CNA "Done" button leaves an HTTPS black hole (only a plain http:// site escapes; SSL-decrypting firewalls are the noted exception). Leaving the CNA for an MFA app, an SMS notification or mail drops the SSID (SMS: typing the code is fine, tapping the notification loses the CNA; email is painful; MFA app is lost). Passkeys (Face ID) are unsupported in the CNA. **Returning iPhone** after a CPI-based CNA bypass: iOS remembers the network as not captive, runs no probe and never calls the CPI again → stuck zombie (`stale_captive_state`); only exists when option 114 is in play.

**Android.** The sign-in app closes itself on `captive:false`; switching apps keeps the Wi-Fi. Passkeys assumed unsupported in the sign-in app (to confirm).

**IoT.** No probe, no CPI, no browser → stuck unless MAB (known MAC) or, with Zscaler, the whitelist range.

**NAC.** Not drawn. Technically it sits between the controller (enforcement point) and RADIUS (decision): Ray Dius plays that role today; a customer NAC (ISE, ClearPass, Forescout) would be Ray's boss at panel 2, answering MAB/802.1x itself, proxying to Ray or redirecting to Port Al. Belongs with the 802.1x branch.

## 9. Backlog

Agreed order for the narrative branches:

1. **Rejections in loop** — registration rejected by the portal (domain not allowed, blocked user, IdP denies) and final authorization rejected by RADIUS (bad credentials, expired, too many devices), both returning to the portal.
2. **Static IP generalised** — available from quarantine and exhausted/zombie pools, not only from the blacklist; DHCP snooping as the common parade; the Zscaler IP-surrogate hijack (taking an authenticated guest's IP) as a variant to validate with the team; MAC clone of an authorized device in the same family.
3. **Wired** (switch ports, MAB/802.1x on the port) and **Windows** (NCSI probe, default browser, so no mini-browser trouble).
4. **802.1x** — a separate world: no portal, profile/VLAN by RADIUS, terminal reject; where the NAC appears.
5. Later: re-authentication / CPI "blocked white page" / 3wi.fi reminder (adds a notion of time); network issue (broken redirect, walled-garden or DNS misconfiguration — very useful for support); MAC randomisation (attach to `visit`); sponsoring as a registration method (new character likely; not developed at Cloudi-Fi yet); zombie eviction if the quarantine ever gets purged.

Pending confirmations: Android sign-in app and passkeys; whether a returning iPhone's lease still carries option 114 (observed: no probe and no CPI call anyway); what gets a stale iPhone out (forgetting the network on the phone is the only known way); address conflict only exists in the on-prem DHCP group; transient default stays `no`.

Engineering, needed before agents rely on it:

- **Stable, meaningful node ids** (`firewall.intercept_probe` instead of `n13pL`). Keep a mapping for old hash links or accept breaking them once.
- **Weighted / candidate values** in the Criteria tab, fed by the detection tool, with the vendor → enforcement mapping table.
- **Per-step `observable`**: what the logs show at that step (the heart of "track a device anywhere on the map").
- **YAML export of the whole graph** (steps, decisions, criteria) in the same format.
- Optional `dhcp_pool` field for multiple whitelists.
- Case 11 (first `captive:true` opening the CNA with Port Al and Cee Peahy sharing storage) is shown as a message: accepted simplification, revisit if the agent needs the real mechanism.

## 10. Decisions already taken (do not reopen without reason)

- Scroll layout, two per row; no slide mode.
- Default story: iPhone, Cisco WLC, captive mode with RADIUS, open MAB, on-prem DHCP, **no option 114** (probe path), SSO registration.
- "What if" removed from all titles; alternatives are titles.
- Footer tag above note, full width.
- Light theme only.
- The cloud is Phyre Wall's head, not a sign over the door.
- "Son of a switch" only when the bypass is real.
- Landing/success page not drawn: the wristband is the proof.
- Firewall vendors other than Zscaler, Netskope and FortiGate set aside for now.
