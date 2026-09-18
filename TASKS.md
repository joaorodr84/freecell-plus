# Freecell Plus task ledger

Every task carries an ID of the form `FCPLUS-<n>`. IDs are assigned once, never
reused, and never renumbered.

**Next ID to assign: `FCPLUS-27`**

If this file and history ever disagree, history wins:

```sh
git log --oneline | grep -oE 'FCPLUS-[0-9]+' | sort -t- -k2 -n | tail -1
```

## How IDs work

- **An ID is claimed when a task is written down, not when it ships.** A new
  `TODO.md` entry gets its ID immediately; the commit that closes it reuses that
  same ID.
- **One ID per task, not per commit.** A feature landed over two commits carries
  the same ID in both subjects. A commit closing two tasks names both.
- Commit subject: `feat(toolbar): Add an undo button (FCPLUS-12)` — Conventional
  Commits, with the ID in parentheses at the end. See **Commit messages** in
  `CLAUDE.md`.
- Branch name: `fcplus-12-add-undo-button`. The ID prefix is wanted here; the
  `p1-`/`p2-` priority prefix banned in `CLAUDE.md` is a different thing and
  still banned.

## Open

| ID | Task | Status | Commit |
| --- | --- | --- | --- |

## Done

| ID | Task | Status | Date | Commit |
| --- | --- | --- | --- | --- |
| FCPLUS-25 | migrateLegacyStorage doesn't sort history ascending when copying legacy data | done | 2026-09-16 | — |
| FCPLUS-26 | NEXT button shows next-unplayed-in-sequence instead of currentGame+1, and only refreshes on win | done | 2026-09-18 | — |
| FCPLUS-5 | Use win history to show completion stats (e.g. "X/100 completed") | done | 2026-09-16 | — |
| FCPLUS-1 | Add a button to jump to the next numbered game | done | 2026-09-16 | — |
| FCPLUS-2 | Give the next-game button Solitaire Bliss's own look and detect wins via the real "Deal Again" button | done | 2026-09-16 | — |
| FCPLUS-4 | Remember the last won game and win history in localStorage | done | 2026-09-16 | — |
| FCPLUS-6 | Export/import win history to a JSON file | done | 2026-09-16 | — |
| FCPLUS-7 | Record time/score/moves per win; narrow the export/import buttons | done | 2026-09-16 | — |
| FCPLUS-3 | Move the next-game button into the game's own button bar instead of floating fixed | done | 2026-09-16 | — |
| FCPLUS-8 | Sequential next-unplayed-game logic; mount the tracker/buttons in the confirmed native topbar | done | 2026-09-16 | — |
| FCPLUS-9 | Translate the script's UI text from Portuguese to English | done | 2026-09-16 | — |
| FCPLUS-10 | Add @updateURL/@downloadURL so Tampermonkey can auto-update from GitHub | done | 2026-09-16 | — |
| FCPLUS-11 | Narrow the custom topbar buttons (NEXT/EXPORT/IMPORT) | done | 2026-09-16 | — |
| FCPLUS-13 | Add a separator before the custom button group in the topbar | done | 2026-09-16 | — |
| FCPLUS-14 | Stop the win-check interval from polling forever after a win | done | 2026-09-16 | — |
| FCPLUS-15 | Verify/guard against stale currentGame on SPA-style navigation | done | 2026-09-16 | — |
| FCPLUS-16 | Guard localStorage.setItem calls with try/catch | done | 2026-09-16 | — |
| FCPLUS-17 | Add keyboard accessibility to the custom topbar buttons | done | 2026-09-16 | — |
| FCPLUS-18 | Fix invalid ?number= values being silently treated as game 1 | done | 2026-09-16 | — |
| FCPLUS-19 | Add a self-check/fallback for reused native CSS classes changing | done | 2026-09-16 | — |
| FCPLUS-21 | Extract repeated DOM selector strings into named constants | done | 2026-09-16 | — |
| FCPLUS-22 | Move custom button/tracker styling from inline JS to injected CSS | done | 2026-09-16 | — |
| FCPLUS-23 | Add first unit tests for the pure win-history/game-number logic | done | 2026-09-16 | — |
| FCPLUS-12 | Add icons to the custom topbar buttons | done | 2026-09-16 | — |
| FCPLUS-20 | Scope the MutationObserver to a narrower container | done | 2026-09-16 | — |
| FCPLUS-24 | Track every replay as its own win-history entry (GUID id, ascending sort) | done | 2026-09-16 | — |
