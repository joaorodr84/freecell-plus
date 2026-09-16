# Freecell Plus TODO

## Priorities

Every item below carries a `[P1]`–`[P4]` tag:

- **P1 — do next.** A measured cost or a known-broken thing that is
  already diagnosed; the work is scoped and the payoff is immediate.
- **P2 — queued.** Real value or real risk, but needs a decision made
  or a self-contained chunk of work first.
- **P3 — wanted, not urgent.** Features and cleanups worth building
  when there's room; nothing else depends on them.
- **P4 — parked.** Latent, speculative, or large-and-unscoped. Revisit
  when something forces the question.

Every item also carries a `FCPLUS-<n>` ID, registered in [TASKS.md](TASKS.md).
The ID is claimed when the item is written and stays with it through the commit
that closes it; the priority changes, the ID never does.

- **[P4] FCPLUS-5** — Win history (`fcplus:winHistory` in localStorage) now
  carries time/score/moves per game (FCPLUS-7), and "next game" already
  targets the next unplayed number (FCPLUS-8), but none of it is
  surfaced as stats yet. Solitaire Bliss's own end-of-game stats
  (`#endGameTimerDisp`/`#scoredisp`/`#bsbMovesCount`) are per-current-game
  only, so this wouldn't duplicate them — it's an aggregate view across
  the numbered games. Two options, not yet decided between:
  - Simple: extend the existing `#fcplus-tracker` label (already
    showing "Last won: #N") with a completion count computed from
    distinct game numbers in `winHistory`, e.g. "Last won: #37 · 37/100
    won". Cheap, no new UI surface.
  - Fuller: a separate best-score/fastest-time display. Needs new UI
    real estate and a decision on which stat "wins" (lowest time vs.
    highest score).

