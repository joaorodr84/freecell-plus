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

- **[P3] FCPLUS-12** — Add icons to the custom topbar buttons (`NEXT`,
  `EXPORT`, `IMPORT`), matching the icon+label style the native buttons
  use (e.g. HINT's bulb icon) instead of text-only labels. Needs an
  icon source/style decision and fitting into the existing
  `generalButtonContent` structure.

- **[P2] FCPLUS-15** — Verify whether Solitaire Bliss ever changes
  `?number=` via client-side navigation without a full page reload.
  `currentGame` is captured once from the URL at script load
  (`getGameNumber`); every navigation path in the script does a full
  `location.href`/`location.replace` today, so this is probably fine,
  but it's unconfirmed against the site's own "New"/"Deal Again"
  buttons. If it turns out the SPA does navigate client-side, add a
  guard (e.g. a `popstate`/URL-change listener that re-derives
  `currentGame` and resets `gameWon`) — otherwise a win could get
  recorded under the wrong game number.

- **[P3] FCPLUS-16** — Wrap the `localStorage.setItem` calls in
  `recordWin`, `importHistory`, and `migrateLegacyStorage` in
  try/catch. Quota errors or private-browsing restrictions can throw
  on `setItem`; only `getWinHistory`'s `JSON.parse` is currently
  guarded.

- **[P3] FCPLUS-17** — The custom topbar buttons are `<div>`s with
  click handlers only — no `role="button"`, `tabindex`, or Enter/Space
  key handling (`createTopBarButton`). Add basic keyboard
  accessibility instead of relying on mouse-only interaction.

- **[P4] FCPLUS-18** — `?number=abc` (an invalid, non-numeric value)
  is treated as "has a number param" by `isBaseGameUrl`, so it skips
  the auto-redirect-to-next-game logic, then `getGameNumber` falls
  back to treating it as game `1` — which could silently misrecord a
  win under the wrong number for a malformed URL.

- **[P4] FCPLUS-19** — Reusing the site's own classes (`generalButton`,
  `statusBarLabels`, etc., see `createTopBarButton`/`createTracker`)
  means that if Solitaire Bliss renames or restyles them, our buttons
  don't error, they just silently look wrong. Consider some form of
  self-check/fallback so breakage is visible instead of silent.

- **[P3] FCPLUS-20** — The `MutationObserver` in `init` watches
  `document.body` with `subtree: true`, so every drag-and-drop
  mutation across the whole page triggers the debounced win check.
  Scope it to a narrower container if a suitable one exists, to cut
  down on how often `scheduleWinCheck` fires.

- **[P3] FCPLUS-21** — Extract the repeated magic DOM selectors
  (`#topoptions`, `#gameTopBar`, `#bsbInner`, `#bsbReportBug`,
  `.generalButtonContent`, the `'Deal Again'` text match,
  `#endGameTimerDisp`/`#scoredisp`/`#bsbMovesCount`) into named
  constants at the top of the file, so a future site-markup change is
  a one-place fix instead of a grep.

- **[P2] FCPLUS-22** — Move the custom button/tracker styling from
  inline `Object.assign(el.style, {...})` calls into a single injected
  `<style>` block with CSS classes (no `@grant` needed for this).
  `createNextButton` and `createUtilityButton` each build a near-
  identical ~15-property style object today, and hover/idle colours
  are swapped by hand in `mouseenter`/`mouseleave` listeners — a
  shared `.fcplus-btn` class plus real `:hover`/`.is-ready:hover` CSS
  would collapse the duplication and let JS own state (toggling a
  class) instead of paint. Scope it to the custom `fcplus-` elements
  only — not worth trying to override the site's own `.generalButton*`
  classes, since those are deliberately reused as-is.

- **[P3] FCPLUS-23** — Add the first unit tests, for the pure,
  DOM-free logic: `getNextSequentialGame`, the merge logic inside
  `importHistory`, and `migrateLegacyStorage`. `CLAUDE.md`'s own Tests
  section already flags this as the obvious first candidate once a
  suite exists.
