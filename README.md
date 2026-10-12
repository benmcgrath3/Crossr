# Crossr

A responsive browser crossword player modeled on the Seattle Times midi screenshot supplied by the user: a white page, compact player toolbar, blue message strip, an 11×11 grid with black squares, and Across/Down clue columns. It runs on any static host and does not depend on a particular computer being online.

## Develop

Requires Node.js 22 or newer (validated with Node 24). No runtime packages or external services are required.

```sh
npm ci --ignore-scripts --no-audit --no-fund
npm run dev
```

The development server listens on port 5173. Set `PORT` and `HOST` to override it. The server only exposes the application’s public files.

```sh
npm run check
npm test
npm run build
```

The production output is `dist/`. Browser smoke coverage is in `tests/browser.py`; with Python Playwright and Chromium installed, run `python tests/browser.py` while the development server is running. `CROSSR_TEST_URL` and `CHROMIUM_PATH` override its defaults.

Production assets receive a shared content version in their URLs, including the puzzle module import. This prevents a refreshed page from reusing incompatible scripts from an earlier deployment. After building, `python tests/cache.py` verifies an actual cached-script upgrade on desktop and phone, including retained puzzle progress.

## First version

- Grid entry with mouse, keyboard, and an on-screen touch keyboard.
- Across and Down clues, active word and crossing clue highlights, conventional clue numbering.
- Arrow navigation, Space/Enter to switch direction, Tab/Shift+Tab to navigate clues, Backspace/Delete to erase, and paste into the active word.
- Pencil entries, checking a word or puzzle, revealing a letter, word, or puzzle.
- Timer and pause screen, completion feedback, confirmed restart.
- Per-puzzle browser-local progress and a library containing the midi reference and three original minis.
- Working Result, Info, Print, and Settings controls; saved timer, highlighting, skip-filled, and clue-size preferences.
- Responsive desktop, tablet, and phone layouts; native modal dialogs and accessible button labels.

Progress is stored in localStorage and does not sync between devices. The answer data is available in the client, as expected for a casual offline-capable puzzle player. The app has no accounts, analytics, paid content, or publishing backend.

## Puzzle source

The default puzzle is **Opposite activities**, credited to **Phil Fraas**, transcribed from the user's filled reference screenshot. Its 121-cell grid contains 15 black squares, 106 playable cells, 20 Across clues, and 22 Down clues. The lower clues not visible in the screenshot are reconstructed from the filled answers; Info records this source. This is a reference fixture rather than a connected daily feed.

Three original word-square minis remain in the library in `src/crossword.js`. Existing mini progress is retained; the layout update selects the midi puzzle once so returning users see the revised default.

The engine handles black squares (`#`), skips them in arrow navigation, and excludes them from saved letters and completion counts. A future authorized puzzle feed or an editor can supply the same data structure. A feed, an archive schedule, and cross-device sync remain future scope.

## Hosting

GitHub Pages is the proposed first host. `.github/workflows/pages.yml` checks, tests, builds, and deploys the site on pushes to `main` or manual dispatch. Relative asset URLs support a repository subpath.

To publish, put this code on the repository’s `main` branch and select **GitHub Actions** in **Settings → Pages → Build and deployment**. Run the workflow and use the URL returned by its deploy step. This can be hosted independently of Ben’s Mac. No deployment has been completed from this workspace: the GitHub API request returned Forbidden, so repository settings and deployment access could not be verified.

Alternatively upload `dist/` to any static web host. No server-side runtime is needed in production.

## Reference and scope

See [the scope notes](docs/scope.md). The visual reference has been inspected from the user's screenshot and the revised layout verified in Chromium. Interactive parity with the live Seattle Times player remains unverified.
