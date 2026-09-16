# Freecell Plus

A Tampermonkey userscript for Solitaire Bliss FreeCell. These rules are adapted from
[Watchr](https://github.com/)'s `CLAUDE.md` — same branching, task-ID, commit and changelog
discipline, minus the pieces that only make sense for a backend with a database (migrations,
repair scripts, ownership checks).

## Branch before you work

Create the branch before the first edit, not after. When a request will change files here
(the script, `TODO.md`, docs), the first action is `git checkout -b <name>` off `main`, so no
work lands in the working tree while `HEAD` is on `main`.

- `<name>` is a plain `kebab-case-summary` of the change, prefixed with the task ID:
  `fcplus-12-add-undo-button`. Never use a `p1-`/`p2-` priority prefix.
- Already on a non-`main` branch: stay on it, don't branch off a branch.
- Skip branching for read-only work: answering questions, reading code, testing the script in a
  browser without changing it, investigating a bug without fixing it. Branch the moment an
  investigation becomes a fix.
- Don't ask permission — it's cheap and reversible, and this rule *is* the standing authorization.

The `commit` agent picks up from a feature branch: commit → push → land on `main` → cleanup.
See [.claude/agents/commit.md](.claude/agents/commit.md).

## Task completion workflow

When completing a task:

1. **Make code changes** and commit them (with the task ID in the subject if applicable)
2. **Do bookkeeping before the summary** — update `TASKS.md` (move task to Done, add date) and
   delete the `TODO.md` entry in the closing commit
3. **Then provide the summary** — at this point, the task is truly finished, all work including
   administration is complete

This ensures "finished" is actually finished: feature work, commits, and bookkeeping are all done
in the same flow, not deferred to a follow-up.

## Task IDs

Every task carries an ID `FCPLUS-<n>`, registered in [TASKS.md](TASKS.md), which holds the next
free number at the top — take it and increment it in the same commit that uses it.

**Claim the ID when the task is written down, not when it ships.** A new `TODO.md` entry gets one
immediately; the commit that closes it reuses that same ID. One ID per *task*: a feature landed
over two commits repeats the ID in both subjects, and a commit closing two tasks names both —
`(FCPLUS-11, FCPLUS-12)`.

- Commit subject: `feat: Add an undo button to the toolbar (FCPLUS-12)` — ID in parentheses at
  the end of the description, inside the subject line so the recovery grep keeps working. The
  format around it is Conventional Commits (see **Commit messages**).
- Branch name: `fcplus-12-add-undo-button`. This is the one prefix that belongs there; the banned
  `p1-`/`p2-` priority prefix is a different thing and still banned.
- Not every commit needs one. Bookkeeping — a typo fix, a formatting pass, a `TODO.md` tidy —
  goes in unnumbered rather than inflating the counter.
- Never renumber, never reuse, and never rewrite an ID into an existing commit message. History
  is immutable; `TASKS.md` holds the mapping precisely so no rewrite is ever needed.

**When a task ships, its closing commit does the bookkeeping too — in that same commit, not a
follow-up.** Move the task's row from the Open table to the Done table in `TASKS.md` (status
`done`, today's date, Commit column `—`) and delete its `TODO.md` entry. `TODO.md` is the active
backlog and `TASKS.md` the permanent record, so a shipped task leaves `TODO.md` in the commit that
lands it. (A feature landed over several commits removes the entry in the last one, the one that
actually closes it.)

**Before committing work that closes a task**, verify that the commit includes both the feature
changes AND the bookkeeping: the TODO.md deletion and the TASKS.md update. If you've committed
closing work without the bookkeeping, go back and squash or amend it in rather than creating a
follow-up commit. A commit with a task ID in the subject is your checkpoint to ask: "Is the
TODO.md entry deleted and the task moved to Done in this same commit?"

If `TASKS.md` and history disagree, history wins:

```sh
git log --oneline | grep -oE 'FCPLUS-[0-9]+' | sort -t- -k2 -n | tail -1
```

## Commit messages

Freecell Plus follows [Conventional Commits 1.0.0](https://www.conventionalcommits.org/en/v1.0.0/):

```text
<type>[optional scope][!]: <description> (FCPLUS-<n>)

[body]

[footers]
```

- **Type** is required and lowercase. `feat` (a new capability, MINOR) and `fix` (a bug, PATCH)
  are the two the spec defines — reach for them first. Also in use: `docs`, `refactor`, `perf`,
  `test`, `build`, `ci`, `chore`, for changes that genuinely ship no behaviour.
- **Scope** is optional and names the area of the script, never the task: `feat(toolbar):`,
  `fix(scoring):`. Leave it off when the change is broad.
- **Description**: plain-language imperative summary, capitalised, no trailing full stop.
- **Task ID** goes last, in parentheses.
- **Body stays substantial**: what was wrong, why this approach, what was decided and rejected,
  how it was verified (in the browser, against Solitaire Bliss). Governing the subject line is
  not licence to write a one-line commit.
- **Breaking changes** take a `!` before the colon *and* a `BREAKING CHANGE:` footer saying what
  changes for anyone with the script already installed (e.g. a `@grant`/`@match` change, a
  storage-key change that loses saved state).
- **Footers** are `Token: value` with hyphenated tokens; `BREAKING CHANGE` keeps its space.
  `Co-Authored-By:` is a footer like any other.

Worked examples:

```text
feat(toolbar): Add an undo button (FCPLUS-12)

fix(scoring): Stop double-counting a foundation move (FCPLUS-13)

refactor(dom)!: Rename the mount point Solitaire Bliss now reserves (FCPLUS-18)

docs: Break the layout items into per-task entries
```

The last carries no ID on purpose — pure bookkeeping doesn't need one.

## Versions

Freecell Plus is a single userscript, so the version lives where Tampermonkey reads it: the
`@version` line in the script's own metadata block, not a separate `package.json` or git tag.

- **Bump `@version` in the same commit** that ships the change it describes — a `feat` bumps the
  minor, a `fix`/`perf` bumps the patch, a breaking change (see **Commit messages**) bumps the
  major. Bookkeeping-only commits (`docs`, `chore`, `test`, `ci`) don't touch it.
  Semantic Versioning (`<major>.<minor>.<patch>`) is the scheme, same as Watchr's tags — it's just
  written into the script instead of a tag, because that's the field Tampermonkey's update checker
  actually reads.
- **Tag the commit that bumps it**, `v<version>`, so a version is still one `git describe` away
  from the commit that shipped it: `git tag v0.2.0 <sha>`. Tagging is a manual, deliberate step —
  nothing does it automatically — and, as with Watchr, never push a tag without deciding to
  publish that release.
- Freecell Plus starts at `0.1.0`. There is no `1.0.0` condition yet; revisit once the script has
  shipped enough real changes to know what "stable" means for it.

## Tests

`test/pure-logic.test.js` (Node's built-in `node:test`, run with `npm test`) covers the
script's pure, DOM-free logic: `parseGameNumber`, `getNextSequentialGame`, `migrateLegacyStorage`,
and `mergeHistoryEntries` (the import merge logic, extracted out of `importHistory` so it's
testable without going through `FileReader`). The script is `require()`d directly — a guard at
the bottom (`typeof document !== 'undefined'`) skips the browser bootstrap, and a
`module.exports` block at the very end exposes just those functions — so there's no separate
copy of the logic to keep in sync. `localStorage` is a plain in-memory shim defined in the test
file, not the real thing.

Everything that touches the DOM (button creation, win detection, the topbar/status-bar mounting)
has no automated coverage and isn't a good near-term candidate — it depends entirely on
Solitaire Bliss's real markup, which is exactly what can't be verified outside a real browser.

- **A change to one of the four covered functions gets its test updated in the same commit.**
  Not every commit needs new tests — most of this script is DOM glue — but don't let the suite
  drift out of sync with the functions it does cover.
- **A bug fix to covered logic gets the regression test that would have caught it**, in the same
  commit as the fix (e.g. `parseGameNumber`'s zero/negative/non-numeric cases, added
  alongside FCPLUS-18's fix, are exactly this).
- **A user-facing or DOM-touching change is still checked in a real browser** against Solitaire
  Bliss before it's called done — the test suite doesn't substitute for that.
- **A flaky check is a bug in the check**, not something to retry away, the moment there is one.

## Comments

Comments here record *why*, name the alternative that was rejected, and carry the numbers behind
the decision — not what the line below already says.

- **Write the why, not the what.** A comment restating the line below it is noise.
- **Name the alternative that was rejected**, so the next person doesn't spend an afternoon
  rediscovering why it doesn't work — especially for anything working around a quirk of Solitaire
  Bliss's own DOM or event handling, which won't be obvious from the code alone.
- **Carry the numbers** where there are any (how often a race condition fired, how many pixels a
  layout hack accounts for).
- **Put it where the decision lives** — above the constant, the selector, the guard — not in a
  document that won't be open when the line is edited.

## Where decisions live

Commit bodies and code comments, and nothing else. No separate decision-record directory: the
commit that made a decision and the comment that guards the line already carry it, and a third
home would fragment the story.

`TODO.md`, `TASKS.md` and `CHANGELOG.md` are the exceptions, and they are not decision records:
what is planned, which ID names it, and what shipped for someone who should not need the repo
open.
