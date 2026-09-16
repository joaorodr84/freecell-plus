// ==UserScript==
// @name         Solitaire Bliss FreeCell Plus
// @namespace    https://github.com/joaorodr84/freecell-plus
// @version      0.14.1
// @description  Enhancements for Solitaire Bliss FreeCell.
// @author       Joao Rodrigues
// @match        https://www.solitairebliss.com/freecell*
// @grant        none
// @updateURL    https://raw.githubusercontent.com/joaorodr84/freecell-plus/main/freecell-plus.user.js
// @downloadURL  https://raw.githubusercontent.com/joaorodr84/freecell-plus/main/freecell-plus.user.js
// ==/UserScript==

(function () {
  'use strict';

  const BASE_URL = 'https://www.solitairebliss.com/freecell';

  const STORAGE_LAST_WON = 'fcplus:lastWon';
  const STORAGE_WIN_HISTORY = 'fcplus:winHistory';

  // Pre-repo prototyping accumulated real win history under these
  // unnamespaced keys — migrated once (see migrateLegacyStorage) so
  // moving to fcplus: doesn't orphan it.
  const LEGACY_STORAGE_LAST_WON = 'freecellLastWon';
  const LEGACY_STORAGE_WIN_HISTORY = 'freecellWinningHistory';

  // Colours confirmed against the site's own topbar buttons rather than
  // guessed: COLOR_ACCENT/HOVER_BG are the hover state, COLOR_LABEL_IDLE
  // is the idle label colour those same buttons use.
  const COLOR_ACCENT = '#804817';
  const COLOR_ACCENT_HOVER_BG = '#f1f0e3';
  const COLOR_LABEL_IDLE = '#9e3c06';

  // DOM ids/classes/text confirmed against Solitaire Bliss's real
  // markup (FCPLUS-2, FCPLUS-8) — named here once so a future
  // site-markup change is a one-place fix instead of a grep.
  const ID_TOP_OPTIONS = 'topoptions';
  const ID_GAME_TOP_BAR = 'gameTopBar';
  const ID_GAME_MAIN = 'gameMainDiv';
  const ID_STATUS_BAR_INNER = 'bsbInner';
  const ID_REPORT_BUG = 'bsbReportBug';
  const ID_END_GAME_TIMER = 'endGameTimerDisp';
  const ID_SCORE_DISPLAY = 'scoredisp';
  const ID_MOVES_COUNT = 'bsbMovesCount';
  const CLASS_BUTTON_CONTENT = 'generalButtonContent';
  const TEXT_DEAL_AGAIN = 'Deal Again';
  const STYLE_ELEMENT_ID = 'fcplus-styles';

  // Solitaire Bliss's own topbar icons (HINT's bulb, etc.) come from a
  // fixed JPG sprite sheet (.gameIconsSpriteBlock) that has no entries
  // for actions we invented (next numbered game, export/import) — so
  // there's nothing of theirs to reuse here. These are plain inline SVG
  // instead: self-contained (no extra asset request/@grant), and
  // `currentColor` means they pick up the idle/hover colour for free
  // from the same CSS that already colours the label text.
  const ICON_NEXT =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M5 2l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_EXPORT =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 10V2M4 6l4-4 4 4M3 12v2h10v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const ICON_IMPORT =
    '<svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true" focusable="false"><path d="M8 2v8M4 6l4 4 4-4M3 12v2h10v-2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  let gameWon = false;
  let winCheckIntervalId = null;

  // Returns null for anything that isn't a real game number (missing,
  // non-numeric, zero, negative) — a single place both getGameNumber and
  // isBaseGameUrl rely on, so a malformed ?number= can't be treated as
  // "valid" by one and "absent" by the other.
  function parseGameNumber(value) {
    const number = parseInt(value, 10);
    return Number.isFinite(number) && number >= 1 ? number : null;
  }

  function getGameNumber() {
    return parseGameNumber(new URLSearchParams(window.location.search).get('number')) ?? 1;
  }

  // A malformed ?number= (e.g. ?number=abc) used to count as "has a
  // number param" here while getGameNumber silently fell back to
  // treating it as game 1 — a win could then get recorded under the
  // wrong number instead of redirecting to the real next game.
  function isBaseGameUrl() {
    const value = new URLSearchParams(window.location.search).get('number');
    return value === null || parseGameNumber(value) === null;
  }

  // Not `const`: syncCurrentGameFromUrl() may reassign this — see there
  // for why. Guarded so this file can also be `require()`d under Node
  // (no `window`) to unit test the pure functions below — see the
  // module.exports block at the bottom.
  let currentGame = typeof window !== 'undefined' ? getGameNumber() : null;

  function migrateLegacyStorage() {
    if (localStorage.getItem(STORAGE_WIN_HISTORY) !== null) {
      return;
    }

    const legacyHistory = localStorage.getItem(LEGACY_STORAGE_WIN_HISTORY);
    const legacyLastWon = localStorage.getItem(LEGACY_STORAGE_LAST_WON);
    if (legacyHistory !== null) {
      safeSetItem(STORAGE_WIN_HISTORY, sortHistoryJson(legacyHistory));
    }
    if (legacyLastWon !== null) {
      safeSetItem(STORAGE_LAST_WON, legacyLastWon);
    }
  }

  // Legacy data predates the ascending-by-wonAt sort recordWin/mergeHistoryEntries
  // both apply before every write (FCPLUS-25) — copying it over verbatim left a
  // one-time migration on an old install unsorted until the next win or import
  // re-sorted it. Falls back to the raw string on unparseable/non-array input so
  // a corrupt or foreign value still migrates rather than being dropped.
  function sortHistoryJson(json) {
    try {
      const parsed = JSON.parse(json);
      if (!Array.isArray(parsed)) {
        return json;
      }
      parsed.sort((a, b) => new Date(a.wonAt) - new Date(b.wonAt));
      return JSON.stringify(parsed);
    } catch {
      return json;
    }
  }

  // localStorage.setItem can throw (quota exceeded, or restrictions some
  // browsers apply in private/incognito mode) — only getWinHistory's
  // JSON.parse was guarded before this; swallow and log a write failure
  // instead of letting it break win tracking outright.
  function safeSetItem(key, value) {
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (error) {
      console.error(`[Freecell Plus] Failed to write ${key} to localStorage:`, error);
      return false;
    }
  }

  function getLastWon() {
    const number = parseInt(localStorage.getItem(STORAGE_LAST_WON), 10);
    return Number.isFinite(number) && number >= 1 ? number : null;
  }

  function getWinHistory() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_WIN_HISTORY));
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  // The sequence always starts at #1 and skips whatever's already been
  // won, so a gap (won 1,2,3,7) resumes at 4, not 8.
  function getNextSequentialGame() {
    const won = new Set(getWinHistory().map((entry) => entry.game));
    let next = 1;
    while (won.has(next)) {
      next++;
    }
    return next;
  }

  function loadNextSequentialGame() {
    window.location.replace(`${BASE_URL}?number=${getNextSequentialGame()}`);
  }

  // The end-game dialog (confirmed via its actual markup) reports these
  // under #endGameTimerDisp/#scoredisp/#bsbMovesCount. Falls back to null
  // per field rather than failing outright, in case the dialog hasn't
  // finished rendering statistics when checkForWin's debounce fires.
  function getGameStatistics() {
    const timerText = document.getElementById(ID_END_GAME_TIMER)?.textContent ?? '';
    const time = timerText.replace(/^Time:\s*/i, '').trim() || null;

    const score = parseInt(document.getElementById(ID_SCORE_DISPLAY)?.textContent, 10);
    const moves = parseInt(document.getElementById(ID_MOVES_COUNT)?.textContent, 10);

    return {
      time,
      score: Number.isFinite(score) ? score : null,
      moves: Number.isFinite(moves) ? moves : null,
    };
  }

  // Time is stored exactly as #endGameTimerDisp renders it (e.g. "2:15",
  // or "1:02:15" for a game long enough to cross an hour) — split on ":"
  // and treat the segments as decreasing units (…, hours, minutes,
  // seconds) rather than assuming a fixed field count, so both formats
  // resolve to the same total-seconds scale for comparison.
  function parseTimeToSeconds(time) {
    if (typeof time !== 'string' || time.trim() === '') {
      return null;
    }
    const parts = time.split(':').map((part) => parseInt(part, 10));
    if (parts.some((part) => !Number.isFinite(part))) {
      return null;
    }
    return parts.reduce((total, part) => total * 60 + part, 0);
  }

  // Best score and fastest time are surfaced side by side rather than
  // picking one as "the" headline stat (the open question TODO.md left
  // for this task) — they're not comparable on one scale, and showing
  // both avoids an arbitrary call between "highest score" and "lowest
  // time" as the thing that matters more.
  function getStatsSummary(history) {
    let bestScore = null;
    let fastest = null;
    // A replay (FCPLUS-24) adds its own history entry rather than
    // overwriting the last one, so history.length now counts plays, not
    // distinct games — "completed" needs the distinct game count instead,
    // otherwise replaying #1 five times would read as "Won: 5".
    const distinctGames = new Set();

    for (const entry of history) {
      distinctGames.add(entry.game);

      if (Number.isFinite(entry.score) && (bestScore === null || entry.score > bestScore.score)) {
        bestScore = { game: entry.game, score: entry.score };
      }

      const seconds = parseTimeToSeconds(entry.time);
      if (seconds !== null && (fastest === null || seconds < fastest.seconds)) {
        fastest = { game: entry.game, time: entry.time, seconds };
      }
    }

    return { completed: distinctGames.size, bestScore, fastest };
  }

  function formatStatsLabel(summary) {
    const parts = [`Won: ${summary.completed}`];
    if (summary.bestScore) {
      parts.push(`Best score: ${summary.bestScore.score} (#${summary.bestScore.game})`);
    }
    if (summary.fastest) {
      parts.push(`Fastest: ${summary.fastest.time} (#${summary.fastest.game})`);
    }
    return parts.join(' · ');
  }

  // crypto.randomUUID() needs a secure context, which page-injected code
  // always has here (Tampermonkey with @grant none runs directly in the
  // https:// page) — the fallback only exists for the Node test
  // environment, in case it's ever run under a Node build old enough not
  // to expose a global crypto.
  function generateId() {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID();
    }
    return `id-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  }

  // Replaying an already-won game now adds a new history entry instead of
  // overwriting the previous one (FCPLUS-24) — every completion is kept,
  // not just the latest. Game number is therefore no longer a unique key
  // across entries, so each one carries its own id — see
  // mergeHistoryEntries for why that matters on import.
  function recordWin(gameNumber, statistics) {
    safeSetItem(STORAGE_LAST_WON, String(gameNumber));

    const history = getWinHistory();
    history.push({
      id: generateId(),
      game: gameNumber,
      wonAt: new Date().toISOString(),
      ...statistics,
    });
    history.sort((a, b) => new Date(a.wonAt) - new Date(b.wonAt));

    safeSetItem(STORAGE_WIN_HISTORY, JSON.stringify(history));
  }

  // Extracted from importHistory so the merge logic is testable without
  // going through FileReader/localStorage. Dedupes by entry identity (id
  // when present, else a game+wonAt fallback for entries exported before
  // FCPLUS-24 added ids) rather than by game number — two genuinely
  // different wins of the same game number are both kept; only an entry
  // that's already present (e.g. re-importing the same backup) is
  // dropped. Sorted ascending by wonAt, oldest first, matching recordWin.
  function identityKey(entry) {
    return typeof entry.id === 'string' && entry.id ? entry.id : `${entry.game}:${entry.wonAt}`;
  }

  function mergeHistoryEntries(existingHistory, importedEntries) {
    const merged = new Map(existingHistory.map((entry) => [identityKey(entry), entry]));
    for (const entry of importedEntries) {
      if (
        !entry ||
        !Number.isFinite(entry.game) ||
        entry.game < 1 ||
        typeof entry.wonAt !== 'string'
      ) {
        continue;
      }
      const key = identityKey(entry);
      if (merged.has(key)) {
        continue;
      }
      merged.set(key, {
        id: typeof entry.id === 'string' && entry.id ? entry.id : null,
        game: entry.game,
        wonAt: entry.wonAt,
        time: typeof entry.time === 'string' ? entry.time : null,
        score: Number.isFinite(entry.score) ? entry.score : null,
        moves: Number.isFinite(entry.moves) ? entry.moves : null,
      });
    }

    return Array.from(merged.values()).sort((a, b) => new Date(a.wonAt) - new Date(b.wonAt));
  }

  // localStorage doesn't survive a browser/profile switch, so export lets
  // you carry the history to another machine and import brings it back.
  function exportHistory() {
    const data = {
      version: 1,
      exportedAt: new Date().toISOString(),
      lastWon: getLastWon(),
      history: getWinHistory(),
    };

    const url = URL.createObjectURL(
      new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    );
    const link = document.createElement('a');
    link.href = url;
    link.download = 'freecell-plus-history.json';
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  // Merges with the existing history instead of replacing it outright,
  // so importing an older backup can't wipe out more recent local wins.
  function importHistory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';

    input.addEventListener('change', () => {
      const file = input.files[0];
      if (!file) {
        return;
      }

      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(reader.result);
          if (!data || !Array.isArray(data.history)) {
            throw new Error('Missing history array');
          }

          const history = mergeHistoryEntries(getWinHistory(), data.history);
          safeSetItem(STORAGE_WIN_HISTORY, JSON.stringify(history));

          // history is sorted ascending (oldest first, see
          // mergeHistoryEntries), so the most recent win is the last
          // entry, not the first.
          const importedLastWon =
            Number.isFinite(data.lastWon) && data.lastWon >= 1
              ? data.lastWon
              : (history.length > 0 && history[history.length - 1].game) || null;
          if (importedLastWon !== null) {
            safeSetItem(STORAGE_LAST_WON, String(importedLastWon));
          }

          updateLastWonLabel();
          updateStatsLabel();
          window.alert(`History imported: ${history.length} game(s) won.`);
        } catch (error) {
          console.error('[Freecell Plus] Failed to import history:', error);
          window.alert('Could not import the history file.');
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  // Reusing the site's own classes (generalButton*, statusBarLabels)
  // means a rename/restyle on Solitaire Bliss's side wouldn't throw —
  // our element would just silently collapse to nothing. Checking after
  // the fact (next frame, so layout has actually happened) turns that
  // into a visible console warning instead.
  function warnIfNotVisible(element, description) {
    requestAnimationFrame(() => {
      if (!element.isConnected) {
        console.warn(
          `[Freecell Plus] ${description} isn't attached to the DOM — Solitaire Bliss's markup may have changed.`
        );
        return;
      }
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        console.warn(
          `[Freecell Plus] ${description} rendered with zero size — Solitaire Bliss's markup/CSS may have changed.`
        );
      }
    });
  }

  // A single shared stylesheet for our own fcplus- elements, instead of
  // each of createNextButton/createUtilityButton building its own
  // near-identical inline style object and hand-swapping hover colours
  // in mouseenter/mouseleave. JS now only toggles the is-ready class;
  // real :hover CSS owns the paint. Scoped to fcplus- elements only —
  // not worth fighting the site's own .generalButton* classes, which
  // are deliberately reused as-is for structure.
  function injectStyles() {
    if (document.getElementById(STYLE_ELEMENT_ID)) {
      return;
    }

    const style = document.createElement('style');
    style.id = STYLE_ELEMENT_ID;
    style.textContent = `
      .fcplus-btn {
        height: 45px;
        min-width: 0;
        box-sizing: border-box;
        padding: 0 8px;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        position: relative;
        font-family: "Open Sans Condensed", Arial, Helvetica, sans-serif;
        font-size: 24px;
        font-weight: 700;
        text-transform: uppercase;
        color: ${COLOR_LABEL_IDLE};
        border: none;
        border-radius: 14px;
        background-color: transparent;
        cursor: pointer;
        user-select: none;
        transition: background-color 0.1s ease, color 0.1s ease;
      }
      .fcplus-btn.is-ready:hover {
        background-color: ${COLOR_ACCENT_HOVER_BG};
        color: ${COLOR_ACCENT};
      }
      .fcplus-btn--next {
        padding: 0 10px;
        box-shadow: none;
        cursor: not-allowed;
        opacity: 0.45;
      }
      .fcplus-btn--next.is-ready {
        cursor: pointer;
        opacity: 1;
      }
      .fcplus-btn-icon {
        display: inline-flex;
        margin-right: 6px;
      }
      .fcplus-tracker {
        display: flex;
        align-items: center;
        justify-content: center;
        height: 40px;
        box-sizing: border-box;
        padding: 4px 16px;
        background-color: rgba(0, 0, 0, 0.12);
        font-family: "Open Sans Condensed", Arial, Helvetica, sans-serif;
        font-size: 24px;
        font-weight: 700;
        color: #000;
        white-space: nowrap;
        user-select: none;
        flex-shrink: 0;
      }
      .fcplus-separator {
        width: 1px;
        height: 28px;
        margin: 0 4px;
        background-color: rgba(0, 0, 0, 0.15);
      }
    `;
    document.head.appendChild(style);
  }

  function insertIntoTopBar(element) {
    const options = document.getElementById(ID_TOP_OPTIONS);
    if (options && options.parentElement) {
      options.parentElement.appendChild(element);
      return;
    }

    const topBar = document.getElementById(ID_GAME_TOP_BAR);
    if (topBar) {
      topBar.appendChild(element);
    }
  }

  // Solitaire Bliss's own topbar buttons are built from this exact
  // body/face/overlay/content structure (confirmed by inspecting the
  // real page) — reusing it, rather than a plain <button>, is what makes
  // ours read as native instead of bolted on.
  function createTopBarButton(id, label, extraClassName, iconSvg) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gameTopBarBtnsWrap';

    const button = document.createElement('div');
    button.id = id;
    button.className = `generalButton displayInlineFlex fcplus-btn${
      extraClassName ? ` ${extraClassName}` : ''
    }`;

    // A <div> with only a click handler is invisible to keyboard users —
    // role/tabindex make it focusable and reachable via Tab, and this
    // relays Enter/Space to the same click handler each caller attaches
    // afterward (createNextButton/createUtilityButton), rather than
    // every caller having to wire this up itself.
    button.setAttribute('role', 'button');
    button.tabIndex = 0;
    button.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter' && event.key !== ' ') {
        return;
      }
      event.preventDefault();
      button.click();
    });

    const body = document.createElement('div');
    body.className = 'generalButtonBody';
    const face = document.createElement('div');
    face.className = 'generalButtonFace';
    const overlay = document.createElement('div');
    overlay.className = 'generalButtonOverlay';
    const content = document.createElement('div');
    content.className = CLASS_BUTTON_CONTENT;

    // .generalButtonContent is confirmed display:flex on the site's own
    // stylesheet, so an icon span ahead of the label lays out inline
    // without us needing to set that ourselves.
    if (iconSvg) {
      const icon = document.createElement('span');
      icon.className = 'fcplus-btn-icon';
      icon.innerHTML = iconSvg;
      content.appendChild(icon);
    }

    const labelSpan = document.createElement('span');
    labelSpan.id = `${id}-label`;
    labelSpan.textContent = label;
    content.appendChild(labelSpan);

    button.append(body, face, overlay, content);
    wrapper.appendChild(button);

    return { wrapper, button };
  }

  function createNextButton() {
    if (document.getElementById('fcplus-next')) {
      return;
    }

    // Idle/ready visuals and the :hover swap live in the .fcplus-btn/
    // .fcplus-btn--next CSS (see injectStyles) — this only toggles the
    // is-ready class (done in setWon()/resetNextButtonToIdle()).
    const { wrapper, button } = createTopBarButton(
      'fcplus-next',
      `NEXT #${getNextSequentialGame()}`,
      'fcplus-btn--next',
      ICON_NEXT
    );

    button.addEventListener('click', () => {
      if (!gameWon) {
        return;
      }
      window.location.href = `${BASE_URL}?number=${getNextSequentialGame()}`;
    });

    insertIntoTopBar(wrapper);
    warnIfNotVisible(button, 'NEXT button');
  }

  function createUtilityButton(id, label, title, onClick, iconSvg) {
    if (document.getElementById(id)) {
      return;
    }

    // Export/Import are clickable from the start (unlike NEXT), so they
    // get is-ready immediately rather than toggling it later.
    const { wrapper, button } = createTopBarButton(id, label, 'is-ready', iconSvg);
    button.title = title;

    button.addEventListener('click', onClick);

    insertIntoTopBar(wrapper);
    warnIfNotVisible(button, `${label} button`);
  }

  // Approximates the divider the native UI shows between button clusters
  // (e.g. HINT/NEW) as a plain element rather than replicating its exact
  // mechanism (border vs. pseudo-element vs. dedicated element on the
  // native side is unconfirmed) — cheap and low-risk either way, but
  // worth a visual check against the real thing.
  function createTopBarSeparator() {
    if (document.getElementById('fcplus-separator')) {
      return;
    }

    const wrapper = document.createElement('div');
    wrapper.className = 'gameTopBarBtnsWrap';

    const separator = document.createElement('div');
    separator.id = 'fcplus-separator';
    separator.className = 'fcplus-separator';

    wrapper.appendChild(separator);
    insertIntoTopBar(wrapper);
    warnIfNotVisible(separator, 'topbar separator');
  }

  function createImportExportButtons() {
    createUtilityButton('fcplus-export', 'Export', 'Export win history', exportHistory, ICON_EXPORT);
    createUtilityButton('fcplus-import', 'Import', 'Import win history', importHistory, ICON_IMPORT);
  }

  // Mounted into #bsbInner (the game's own status-bar area) rather than
  // floating, and reuses its .statusBarLabels class — the same one the
  // real Time/Score/Moves labels use — for visual consistency.
  function createTracker() {
    if (document.getElementById('fcplus-tracker')) {
      return;
    }

    const inner = document.getElementById(ID_STATUS_BAR_INNER);
    if (!inner) {
      return;
    }

    const tracker = document.createElement('div');
    tracker.id = 'fcplus-tracker';
    tracker.className = 'fcplus-tracker';

    const label = document.createElement('span');
    label.id = 'fcplus-last-won-label';
    label.className = 'statusBarLabels';
    tracker.appendChild(label);

    const reportBug = document.getElementById(ID_REPORT_BUG);
    if (reportBug) {
      inner.insertBefore(tracker, reportBug);
    } else {
      inner.appendChild(tracker);
    }

    updateLastWonLabel();
    warnIfNotVisible(tracker, 'tracker');
  }

  function updateLastWonLabel() {
    const label = document.getElementById('fcplus-last-won-label');
    if (!label) {
      return;
    }

    const lastWon = getLastWon();
    label.textContent = lastWon !== null ? `Last won: #${lastWon}` : 'Last won: —';
  }

  // A second tracker alongside the "Last won" one (FCPLUS-5's "Fuller"
  // option) rather than folding this into the same label — best
  // score/fastest time is a different axis from "what did I last win",
  // and cramming both into one string made the simple case harder to
  // read for no space actually saved.
  function createStatsTracker() {
    if (document.getElementById('fcplus-stats')) {
      return;
    }

    const inner = document.getElementById(ID_STATUS_BAR_INNER);
    if (!inner) {
      return;
    }

    const tracker = document.createElement('div');
    tracker.id = 'fcplus-stats';
    tracker.className = 'fcplus-tracker';

    const label = document.createElement('span');
    label.id = 'fcplus-stats-label';
    label.className = 'statusBarLabels';
    tracker.appendChild(label);

    const reportBug = document.getElementById(ID_REPORT_BUG);
    if (reportBug) {
      inner.insertBefore(tracker, reportBug);
    } else {
      inner.appendChild(tracker);
    }

    updateStatsLabel();
    warnIfNotVisible(tracker, 'stats tracker');
  }

  function updateStatsLabel() {
    const label = document.getElementById('fcplus-stats-label');
    if (!label) {
      return;
    }

    label.textContent = formatStatsLabel(getStatsSummary(getWinHistory()));
  }

  function setWon() {
    if (gameWon) {
      return;
    }
    gameWon = true;

    if (winCheckIntervalId !== null) {
      clearInterval(winCheckIntervalId);
      winCheckIntervalId = null;
    }

    recordWin(currentGame, getGameStatistics());
    updateLastWonLabel();
    updateStatsLabel();

    const button = document.getElementById('fcplus-next');
    const label = document.getElementById('fcplus-next-label');
    if (!button || !label) {
      return;
    }

    label.textContent = `NEXT #${getNextSequentialGame()} →`;
    button.classList.add('is-ready');
  }

  function resetNextButtonToIdle() {
    const button = document.getElementById('fcplus-next');
    const label = document.getElementById('fcplus-next-label');
    if (!button || !label) {
      return;
    }
    label.textContent = `NEXT #${getNextSequentialGame()}`;
    button.classList.remove('is-ready');
  }

  // Every navigation this script performs (loadNextSequentialGame, the
  // NEXT button's click handler) does a full location.href/replace, so
  // currentGame staying stale isn't a risk from our own code. It's
  // unconfirmed, though, whether Solitaire Bliss's own "New"/"Deal
  // Again" controls ever change ?number= via client-side navigation
  // without a full reload — if they do, this catches it instead of
  // silently recording a win under the wrong game number.
  function syncCurrentGameFromUrl() {
    const urlGame = getGameNumber();
    if (urlGame === currentGame) {
      return;
    }
    currentGame = urlGame;
    gameWon = false;
    resetNextButtonToIdle();
  }

  // The win screen has no dedicated marker, but it does render a
  // "Deal Again" button reusing the site's own .generalButtonContent
  // class (confirmed by inspecting a completed game) — checking for
  // that text is far more reliable than scanning body text for
  // win-related phrases, which is what the first version did.
  function checkForWin() {
    syncCurrentGameFromUrl();

    const buttons = document.querySelectorAll(`.${CLASS_BUTTON_CONTENT}`);
    for (const el of buttons) {
      if (el.textContent.trim() === TEXT_DEAL_AGAIN) {
        setWon();
        return;
      }
    }
  }

  // subtree mutations fire constantly while cards are dragged, so the
  // win check is debounced instead of running on every single mutation.
  let debounceHandle = null;
  function scheduleWinCheck() {
    if (debounceHandle !== null) {
      clearTimeout(debounceHandle);
    }
    debounceHandle = setTimeout(checkForWin, 150);
  }

  function init() {
    migrateLegacyStorage();

    // Bare /freecell (no ?number=) jumps straight to the next unplayed
    // game in the sequence instead of landing on whatever number the
    // site defaults to.
    if (isBaseGameUrl()) {
      loadNextSequentialGame();
      return;
    }

    injectStyles();
    createTracker();
    createStatsTracker();
    createTopBarSeparator();
    createNextButton();
    createImportExportButtons();
    checkForWin();

    // #gameMainDiv (confirmed real — the game's own top-level wrapper,
    // display:block/width:100%/height:100% in the site's real
    // stylesheet) is a lot narrower than document.body: it excludes
    // page chrome outside the game (ads, nav, cookie banners) and,
    // notably, the once-a-second status-bar timer tick, which isn't
    // inside it. Not scoped all the way down to #playarea (the actual
    // card board) — the end-game dialog markup is built dynamically and
    // its insertion point wasn't confirmed, and modals commonly get
    // appended outside their triggering container to escape overflow/
    // z-index clipping, so that risked missing the win dialog's
    // mutation entirely rather than just observing more than strictly
    // needed. Falls back to document.body if the id isn't there. Either
    // way this only affects how fast a win is noticed via mutation —
    // the 500ms interval below still catches it regardless.
    const observedRoot = document.getElementById(ID_GAME_MAIN) || document.body;
    new MutationObserver(scheduleWinCheck).observe(observedRoot, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Belt-and-braces: catches a win state the observer's filters miss
    // (e.g. a style/attribute-only change) without much runtime cost.
    // Cleared in setWon() — otherwise it'd poll .generalButtonContent
    // every 500ms for the rest of the session after already winning.
    winCheckIntervalId = setInterval(checkForWin, 500);
  }

  // #gameTopBar/#bsbInner are rendered by the site's own SPA after load,
  // not guaranteed to exist yet at document-idle — poll briefly instead
  // of assuming.
  function startWhenReady() {
    if (document.getElementById(ID_GAME_TOP_BAR) || document.getElementById(ID_STATUS_BAR_INNER)) {
      init();
      return;
    }
    setTimeout(startWhenReady, 100);
  }

  // Only runs in a real browser (Tampermonkey); guarded so requiring
  // this file under Node for tests doesn't try to touch `document`.
  if (typeof document !== 'undefined') {
    startWhenReady();
  }

  // Exposes the pure, DOM/localStorage-call-only functions for the
  // Node test suite under test/ — everything else here needs a real
  // browser page and is exercised manually per CLAUDE.md's Tests
  // section instead.
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
      parseGameNumber,
      getNextSequentialGame,
      getWinHistory,
      migrateLegacyStorage,
      mergeHistoryEntries,
      parseTimeToSeconds,
      getStatsSummary,
    };
  }
})();
