# SSID_PARTY

*A night at the captive portal.*

An interactive stick-figure comic about what a device goes through on a Cloudi-Fi captive-portal network: joining the Wi-Fi, the RADIUS check, getting an address, captive-portal detection, registration, and the final authorization that opens the Internet. Pick the phone, the controller vendor, the enforcement mode, the DHCP setup or the registration method, and the story changes with you, including the ways it goes wrong.

There are 14 criteria. Together they give 232,083 valid configurations, which play out as 1,059 distinct stories: many configurations lead to the same sequence of panels. `node tests/check.js` prints the current counts.

**Live: https://cloudi-fi.github.io/ssid_party/**

## The cast

The nightclub is the network. The hall is the walled garden, the dancefloor door is the Internet, and the wristband is the authorization.

| Character | Plays |
|---|---|
| Dave Ice | the device |
| Conn Troller | the Wi-Fi controller |
| Ray Dius | the RADIUS server |
| Dee Ashcipee | the DHCP server |
| Cee Peahy | the Captive-Portal API (RFC 8908) |
| Port Al | the captive portal |
| Ida Pee | the identity provider (SSO) |
| Phyre Wall | the firewall |

## Four views of the same story

- **Comic**: the story, panel by panel. A dropdown in a panel's title shows the other ways that step can go.
- **Sequence diagram**: the same steps as messages between the network components.
- **Decision diagram**: every branch the story can take, with the current path in bold.
- **Criteria**: the scenario as flat, editable YAML.

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
js/views.js      comic, sequence, decision and criteria renderers
js/main.js       state in the URL, events, startup
fonts/           self-hosted fonts and their licences
tests/check.js   exhaustive consistency check
```

The scripts are plain `<script>` files (not ES modules), and they share one global scope. Keep the order they have in `index.html`.

## Checking a change

```sh
node tests/check.js
```

Run it from the repository root. It needs Node, but no packages. It goes through every valid combination of criteria (about 232,000), plays every story, and reports loops, stories that never end, unreachable steps, `undefined`/`NaN` in any view, and overlapping bubbles or diagram boxes. A good run ends with `issues: 0`. The check takes a few seconds.

## Before you change the story

Read [HANDOFF.md](HANDOFF.md) first. It covers the goals, the writing rules, how the graph is built, the technical facts the story encodes (validate any change to those with evidence), and the backlog.

GitHub Pages publishes the `main` branch from the repository root, so merging into `main` deploys the site.

## Fonts

[Bangers](https://github.com/googlefonts/bangers), [Patrick Hand](https://fonts.google.com/specimen/Patrick+Hand) and [Inter](https://github.com/rsms/inter) are served from `fonts/`. They are licensed under the SIL Open Font License 1.1; the licence files are next to the fonts.
