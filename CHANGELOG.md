# Changelog

All notable changes to Freecell Plus are documented in this file.

The format is loosely based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
The version each entry shipped in is the userscript's own `@version` header at
the time (see [CLAUDE.md](CLAUDE.md) → Versions) — entries are grouped by that
version, newest first.

## [Unreleased]

Open work is tracked in [TODO.md](TODO.md), and registered by ID in
[TASKS.md](TASKS.md).

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
