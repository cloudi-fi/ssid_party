# SSID_PARTY

*Night at the Captive Portal.*

An interactive stick-figure comic about what a device goes through on a Cloudi-Fi captive-portal network: joining the Wi-Fi, the RADIUS check, getting an address, captive-portal detection, registration, and the final authorization that opens the Internet. Pick the phone, the controller vendor, the enforcement mode, the DHCP setup or the registration method, and the story changes with you, including the ways it goes wrong. The title picks the door: SSID_PARTY, the open network with its captive portal, or SSID_PARTY_SECURE 🔒, where 802.1X checks a certificate or a password before letting the device in, with no portal at all.

There are 25 criteria. Together they give 389,903 valid configurations, which play out as 2,320 distinct stories: many configurations lead to the same sequence of panels. `node tests/check.js` prints the current counts.

**Live: https://cloudi-fi.github.io/ssid_party/**

## The cast

The nightclub is the network. The hall is the walled garden, the dancefloor door is the Internet, and the badge is the authorization.

| Character | Plays |
|---|---|
| Dave Ice | the device |
| Conn Troller | the Wi-Fi controller |
| Ray Dius | the RADIUS server |
| Dee Ashcipee | the DHCP server |
| Cee Peahy | the Captive-Portal API (RFC 8908) |
| Port Hal | the captive portal |
| Ida Pee | the identity provider (SSO); on the 802.1X door, the directory RADIUS calls (LDAP, Entra ID or Cloudi-Fi guest accounts) |
| Phyre Wall | the firewall |
| Spencer | the sponsor who approves a guest |

In the comic, the Cloudi-Fi logo before a name marks Cloudi-Fi's own services: Port Hal, Cee Peahy, Ray Dius, and Dee Ashcipee when the DHCP is Cloudi-Fi's cloud DHCP. A cloud-shaped head marks a role played by a cloud service when customers also run it themselves: Phyre Wall as a cloud firewall, Dee Ashcipee as the cloud DHCP, Ida Pee as Entra ID. Characters that only exist in the cloud, such as Ray Dius or Port Hal, keep a plain head: the logo already says where they live.

## Four views of the same story

- **Comic**: the story, panel by panel. A dropdown in a panel's title shows the other ways that step can go.
- **Sequence**: the same steps as messages between the network components involved. "Show criteria" adds the decision points and their choices.
- **Flow**: the steps of the current story, top to bottom. "Show criteria" reveals every branch the story can take, with the current path in bold.
- **Criteria**: the scenario as flat, editable YAML, in two groups: the local context (the site's network and services) and the user context (the device and its journey).

In both diagram views, "Copy Mermaid" copies the diagram as shown, in [Mermaid](https://mermaid.js.org) syntax, ready to paste into a Markdown file, a wiki or the Mermaid Live Editor.

You can change a choice from any view: a panel title, a diagram chip or the YAML. All four views then follow.

## Sharing a scenario

The page URL holds the scenario and the open view, so a link opens on the exact case:

```
https://cloudi-fi.github.io/ssid_party/#view=sequence&os=android&integ=cloud
```

The **Criteria** view also shows the link for the current scenario.

## Running it locally

There is no build step and nothing to install. Open `index.html` in a browser, or serve the folder:

```sh
python3 -m http.server
# then http://localhost:8000
```

## Project layout

```
index.html       markup, and the scripts in load order
css/style.css    styles and @font-face rules
js/draw.js       characters, speech bubbles, backgrounds
js/graph.js      story graph: criteria, steps, path resolution (no DOM)
js/refs.js       links on the panel tags (RFCs, vendor docs, Wikipedia)
js/views.js      comic, sequence, decision and criteria renderers
js/main.js       state in the URL, events, startup
fonts/           self-hosted fonts and their licences
img/             the Cloudi-Fi favicon and logo, and OS and vendor logos for the sequence diagram
tests/check.js   exhaustive consistency check
```

The scripts are plain `<script>` files (not ES modules), and they share one global scope. Keep the order they have in `index.html`.

## Checking a change

```sh
node tests/check.js
```

Run it from the repository root. It needs Node, but no packages. It goes through every valid combination of criteria (about 171,000), plays every story, and reports loops, stories that never end, unreachable steps, `undefined`/`NaN` in any view, and overlapping bubbles or diagram boxes. A good run ends with `issues: 0`. The check takes a few seconds.

## Before you change the story

Read [HANDOFF.md](HANDOFF.md) first. It covers the goals, the writing rules, how the graph is built, the technical facts the story encodes (validate any change to those with evidence), and the backlog.

GitHub Pages publishes the `main` branch from the repository root, so merging into `main` deploys the site.

## Logos

The Apple and Android icons come from [Simple Icons](https://simpleicons.org) (CC0). The Android robot is reproduced or modified from work created and shared by Google and used according to terms described in the Creative Commons 3.0 Attribution License. Brand logos are trademarks of their respective owners.

## Fonts

[Bangers](https://github.com/googlefonts/bangers), [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) and [Inter](https://github.com/rsms/inter) are served from `fonts/`. They are licensed under the SIL Open Font License 1.1; the licence files are next to the fonts.
