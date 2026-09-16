# Freecell Plus task ledger

Every task carries an ID of the form `FCPLUS-<n>`. IDs are assigned once, never
reused, and never renumbered.

**Next ID to assign: `FCPLUS-10`**

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
| FCPLUS-5 | Use win history to show completion stats (e.g. "X/100 completed") | open | — |

## Done

| ID | Task | Status | Date | Commit |
| --- | --- | --- | --- | --- |
| FCPLUS-1 | Add a button to jump to the next numbered game | done | 2026-09-16 | — |
| FCPLUS-2 | Give the next-game button Solitaire Bliss's own look and detect wins via the real "Deal Again" button | done | 2026-09-16 | — |
| FCPLUS-4 | Remember the last won game and win history in localStorage | done | 2026-09-16 | — |
| FCPLUS-6 | Export/import win history to a JSON file | done | 2026-09-16 | — |
| FCPLUS-7 | Record time/score/moves per win; narrow the export/import buttons | done | 2026-09-16 | — |
| FCPLUS-3 | Move the next-game button into the game's own button bar instead of floating fixed | done | 2026-09-16 | — |
| FCPLUS-8 | Sequential next-unplayed-game logic; mount the tracker/buttons in the confirmed native topbar | done | 2026-09-16 | — |
| FCPLUS-9 | Translate the script's UI text from Portuguese to English | done | 2026-09-16 | — |
