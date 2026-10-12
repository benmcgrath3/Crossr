# Scope and reference notes

## User brief

Build a browser-based app that reproduces the Seattle Times crossword interface and solving experience, available from a hosted URL on desktop, tablet, and phone without relying on Ben’s Mac. Project name, hosting, and puzzle source were left to initial scoping.

## Reference inspection

An HTTP request to `https://www.seattletimes.com/games-universal/` returned 403 in this environment. The private Notion link also returned 403; the user subsequently supplied its brief directly. No authenticated Notion tools are available in this session.

The user subsequently supplied a screenshot of the **Midi Crossword** player. The revised implementation follows its visible layout: a bold sans-serif page title, blue navigation links, white rectangular toolbar with menu/timer/share and Result/Info/Print/Settings, blue message banner, large 11×11 black-and-white grid, two gray clue columns, and puzzle attribution under the grid. The earlier cream/green card design has been replaced.

The screenshot's filled puzzle is transcribed as a reference fixture, **Opposite activities by Phil Fraas**. The visible clues and numbering match it; clipped lower clues are reconstructed from the answers. This screenshot supports a visual comparison, not claims about the live player's settings, selection colors, mobile behavior, or puzzle-feed contract.

## First-version decisions

Name: Crossr, matching the selected repository.

Hosting: a static site with a prepared GitHub Pages workflow. Publishing remains outstanding because GitHub API access returned Forbidden. There is no live hosted URL yet.

The API failure was subsequently diagnosed as an HTTP 403 from the network proxy during CONNECT, before a GitHub response. The configured package-manager network preset does not include `api.github.com`. Network draft additions have been saved for `api.github.com` (hosting configuration), `benmcgrath3.github.io` (verification of the eventual site), and `www.seattletimes.com` / `seattletimes.com` (reference inspection). The user must review and save the network changes in environment settings and publish the environment before the affected operations can be retried. GitHub API authorization and Pages settings are still unverified; no new token is justified by this network failure alone.

Puzzles: the 11×11 supplied reference puzzle is the default, with three original sample word-square minis retained in the library. The reference has 15 black squares, 106 playable squares, 20 Across and 22 Down entries. A daily source has not been selected or connected.

Desktop: grid on the left, scrollable Across/Down lists on the right, timer and toolbar above the blue message strip. Selecting a square or clue places the active clue in that strip. Pencil, Check, Reveal, and Restart are in the hamburger menu. Results summarize actual saved state, Info includes source/help, Print opens the browser print flow with all clues visible, and Settings save timer visibility, active-word highlighting, skip-filled entry, and larger clue text.

Mobile: stacked player and clues, touch-sized on-screen letter keys, erase and direction controls; no external keyboard is needed. Saved state is local to each browser/device.

## Remaining delivery work

- Compare interactive behavior against the live Seattle Times player when access is available; the supplied visual reference has been implemented.
- Select an authorized production puzzle source and an editorial publishing schedule if daily puzzles are required.
- Publish to a static host and verify its actual HTTPS URL on desktop and phone. Prepared hosting configuration is not evidence of publication.
- Cross-device saved progress would require additional storage/authentication and is not implemented in version one.
