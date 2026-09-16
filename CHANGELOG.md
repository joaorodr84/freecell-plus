# Changelog

All notable changes to Freecell Plus are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The version each entry shipped in is the userscript's own `@version` header at
the time (see [CLAUDE.md](CLAUDE.md) → Versions) — entries are grouped by that
version, newest first.

## [Unreleased]

Open work is tracked in [TODO.md](TODO.md), and registered by ID in
[TASKS.md](TASKS.md).

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
