# Changelog

All notable changes to Freecell Plus are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The version each entry shipped in is the userscript's own `@version` header at
the time (see [CLAUDE.md](CLAUDE.md) → Versions) — entries are grouped by that
version, newest first.

## [Unreleased]

Open work is tracked in [TODO.md](TODO.md), and registered by ID in
[TASKS.md](TASKS.md).

## [0.9.3]

### Fixed

- `localStorage.setItem` can throw (quota exceeded, or restrictions some
  browsers apply in private/incognito mode) — only `getWinHistory`'s
  `JSON.parse` was guarded before. Added a `safeSetItem()` helper
  (try/catch + console.error) and routed every `setItem` call through it
  (`migrateLegacyStorage`, `recordWin`, `importHistory`). (FCPLUS-16)

## [0.9.2]

### Fixed

- Added `syncCurrentGameFromUrl()`, called on every `checkForWin` tick,
  to re-derive `currentGame` from `?number=` and reset `gameWon` if it
  changes underneath the script. Guards against the (still unconfirmed)
  possibility that Solitaire Bliss's own "New"/"Deal Again" controls
  navigate client-side without a full reload — every navigation this
  script performs already does a full reload, so this only matters for
  the site's own controls. Not verified live; added as low-cost
  insurance against a win getting recorded under the wrong game number.
  (FCPLUS-15)

## [0.9.1]

### Fixed

- `setInterval(checkForWin, 500)` ran for the rest of the session even
  after a win was already recorded — `checkForWin` was a no-op past that
  point (`setWon` guards on `gameWon`), but the interval itself was never
  cleared. Now cleared in `setWon()`. (FCPLUS-14)

## [0.9.0]

### Added

- A thin vertical separator before our custom button group in the
  topbar, approximating the divider the native UI shows between button
  clusters (e.g. HINT/NEW). A plain element rather than a replica of the
  native mechanism (border/pseudo-element/dedicated element — unconfirmed
  which), so it's worth a visual check. (FCPLUS-13)

## [0.8.1]

### Fixed

- The custom `NEXT`/`EXPORT`/`IMPORT` topbar buttons were visibly wider
  than the native UNDO/HINT/NEW ones. `NEXT`'s explicit `minWidth: '120px'`
  is gone, and both button styles now set `minWidth: '0'` +
  `boxSizing: 'border-box'` to override whatever width `.generalButton`
  itself contributes, rather than fighting it with more padding tweaks.
  Not verified pixel-for-pixel against the native buttons in a browser —
  worth a visual check. (FCPLUS-11)

## [0.8.0]

### Added

- `@updateURL`/`@downloadURL` metadata pointing at the raw GitHub file on
  `main`, so Tampermonkey can check for and offer updates instead of
  requiring a manual reinstall for every change. (FCPLUS-10)

## [0.7.1]

### Changed

- All UI text (button labels, the last-won tracker, alert messages) is now
  in English; it had been Portuguese since the earliest version. (FCPLUS-9)

## [0.7.0]

### Added

- Visiting `/freecell` with no `?number=` now jumps straight to the next
  *unplayed* game in the sequence (the first gap in win history, starting
  from #1), instead of whatever the site defaults to. The next-game button
  targets the same number, so it skips over already-won games rather than
  always being `current + 1`. (FCPLUS-8)
- The next-game button, tracker and Export/Import are now mounted directly
  in the site's own topbar (`#topoptions`'s container) and status bar
  (`#bsbInner`), reusing its real button markup
  (`.generalButton`/`.generalButtonBody`/`.generalButtonFace`/
  `.generalButtonOverlay`/`.generalButtonContent`) and `.statusBarLabels`
  class, now that those elements are confirmed to exist — closes FCPLUS-3.
  Replaces the earlier fixed-position floating widget entirely.

### Fixed

- `localStorage` keys are now namespaced under `fcplus:`; a one-time
  migration copies over any data already sitting under the unnamespaced
  `freecellLastWon`/`freecellWinningHistory` keys so existing win history
  isn't orphaned by the rename. (FCPLUS-8)

## [0.6.0]

### Added

- Each win now records time, score and moves (from the end-game dialog's
  own `#endGameTimerDisp`/`#scoredisp`/`#bsbMovesCount`), alongside the
  game number and timestamp already recorded. Export/import carry these
  automatically since they're just extra fields on the same history
  entries. (FCPLUS-7)

### Fixed

- Importing a history file dropped any `time`/`score`/`moves` fields on
  merge, keeping only `game`/`wonAt` — fixed alongside adding those fields
  so import doesn't regress the moment it has more to preserve. (FCPLUS-7)

### Changed

- Export/Import buttons are a little narrower (`0 8px` padding, from
  `0 10px`). (FCPLUS-7)

## [0.5.0]

### Added

- Export/import buttons for the win history, since `localStorage` doesn't
  follow you to another browser or machine. Export downloads
  `freecell-plus-history.json`; import merges a backup's entries into the
  existing history (per-game, keeping whichever timestamp is newer) rather
  than replacing it outright. (FCPLUS-6)

## [0.4.0]

### Added

- The last game won is remembered across sessions (`localStorage`) and shown
  in a small label next to the next-game button. Every win is also recorded
  into a history list (game number + timestamp), not yet surfaced in the UI
  beyond the last-won label. (FCPLUS-4)

## [0.3.0]

### Changed

- The next-game button now uses Solitaire Bliss's own colours, type
  (Open Sans Condensed, uppercase, 700 weight) and sizing, and stays visible
  (but inert) before a win instead of popping in afterwards. (FCPLUS-2)
- Win detection now checks for the site's own "Deal Again" button
  (`.generalButtonContent` with that text) instead of scanning page text for
  win-related phrases — found by inspecting a completed game, and far less
  prone to missing a win the phrase list didn't anticipate. (FCPLUS-2)

## [0.2.0]

### Added

- A "next game" button that appears once a numbered game (`?number=`) is won,
  and jumps straight to the next number. (FCPLUS-1)

### Fixed

- `@match` targeted `/FreeCell*`, but the site serves the page at lowercase
  `/freecell` and 404s on the capitalised path — the script never ran at all
  before this fix. (FCPLUS-1)

## [0.1.0]

### Added

- Initial project scaffold: no game-affecting behaviour yet.
