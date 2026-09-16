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

- **[P3] FCPLUS-3** — Move the next-game button into the game's own button bar
  (next to "Deal Again") instead of floating fixed bottom-right. Cosmetic only;
  no known selector for the bar's container yet.
- **[P4] FCPLUS-5** — Win history (`fcplus:winHistory` in localStorage) is
  recorded but only used for the "last won" label so far. Could drive a
  completion count (e.g. "8/100 games") or point "next game" at the next
  *unplayed* number instead of always `current + 1`.
