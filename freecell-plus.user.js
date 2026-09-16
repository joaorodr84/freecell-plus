// ==UserScript==
// @name         Solitaire Bliss FreeCell Plus
// @namespace    https://github.com/joaorodr84/freecell-plus
// @version      0.9.2
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

  let gameWon = false;
  let winCheckIntervalId = null;

  function getGameNumber() {
    const number = parseInt(new URLSearchParams(window.location.search).get('number'), 10);
    return Number.isFinite(number) && number >= 1 ? number : 1;
  }

  function isBaseGameUrl() {
    return !new URLSearchParams(window.location.search).has('number');
  }

  // Not `const`: syncCurrentGameFromUrl() may reassign this — see there
  // for why.
  let currentGame = getGameNumber();

  function migrateLegacyStorage() {
    if (localStorage.getItem(STORAGE_WIN_HISTORY) !== null) {
      return;
    }

    const legacyHistory = localStorage.getItem(LEGACY_STORAGE_WIN_HISTORY);
    const legacyLastWon = localStorage.getItem(LEGACY_STORAGE_LAST_WON);
    if (legacyHistory !== null) {
      localStorage.setItem(STORAGE_WIN_HISTORY, legacyHistory);
    }
    if (legacyLastWon !== null) {
      localStorage.setItem(STORAGE_LAST_WON, legacyLastWon);
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
    const timerText = document.getElementById('endGameTimerDisp')?.textContent ?? '';
    const time = timerText.replace(/^Time:\s*/i, '').trim() || null;

    const score = parseInt(document.getElementById('scoredisp')?.textContent, 10);
    const moves = parseInt(document.getElementById('bsbMovesCount')?.textContent, 10);

    return {
      time,
      score: Number.isFinite(score) ? score : null,
      moves: Number.isFinite(moves) ? moves : null,
    };
  }

  // Replaying an already-won game updates its timestamp (and stats)
  // rather than adding a duplicate entry, so history stays one row per
  // game number.
  function recordWin(gameNumber, statistics) {
    localStorage.setItem(STORAGE_LAST_WON, String(gameNumber));

    const history = getWinHistory();
    const entry = { game: gameNumber, wonAt: new Date().toISOString(), ...statistics };
    const existing = history.find((item) => item.game === gameNumber);
    if (existing) {
      Object.assign(existing, entry);
    } else {
      history.push(entry);
    }
    history.sort((a, b) => new Date(b.wonAt) - new Date(a.wonAt));

    localStorage.setItem(STORAGE_WIN_HISTORY, JSON.stringify(history));
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

          const merged = new Map(getWinHistory().map((entry) => [entry.game, entry]));
          for (const entry of data.history) {
            if (
              !entry ||
              !Number.isFinite(entry.game) ||
              entry.game < 1 ||
              typeof entry.wonAt !== 'string'
            ) {
              continue;
            }
            const existing = merged.get(entry.game);
            if (!existing || new Date(entry.wonAt) > new Date(existing.wonAt)) {
              merged.set(entry.game, {
                game: entry.game,
                wonAt: entry.wonAt,
                time: typeof entry.time === 'string' ? entry.time : null,
                score: Number.isFinite(entry.score) ? entry.score : null,
                moves: Number.isFinite(entry.moves) ? entry.moves : null,
              });
            }
          }

          const history = Array.from(merged.values()).sort(
            (a, b) => new Date(b.wonAt) - new Date(a.wonAt)
          );
          localStorage.setItem(STORAGE_WIN_HISTORY, JSON.stringify(history));

          const importedLastWon =
            Number.isFinite(data.lastWon) && data.lastWon >= 1
              ? data.lastWon
              : (history[0] && history[0].game) || null;
          if (importedLastWon !== null) {
            localStorage.setItem(STORAGE_LAST_WON, String(importedLastWon));
          }

          updateLastWonLabel();
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

  function insertIntoTopBar(element) {
    const options = document.getElementById('topoptions');
    if (options && options.parentElement) {
      options.parentElement.appendChild(element);
      return;
    }

    const topBar = document.getElementById('gameTopBar');
    if (topBar) {
      topBar.appendChild(element);
    }
  }

  // Solitaire Bliss's own topbar buttons are built from this exact
  // body/face/overlay/content structure (confirmed by inspecting the
  // real page) — reusing it, rather than a plain <button>, is what makes
  // ours read as native instead of bolted on.
  function createTopBarButton(id, label) {
    const wrapper = document.createElement('div');
    wrapper.className = 'gameTopBarBtnsWrap';

    const button = document.createElement('div');
    button.id = id;
    button.className = 'generalButton displayInlineFlex';

    const body = document.createElement('div');
    body.className = 'generalButtonBody';
    const face = document.createElement('div');
    face.className = 'generalButtonFace';
    const overlay = document.createElement('div');
    overlay.className = 'generalButtonOverlay';
    const content = document.createElement('div');
    content.className = 'generalButtonContent';

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

    const { wrapper, button } = createTopBarButton(
      'fcplus-next',
      `NEXT #${getNextSequentialGame()}`
    );

    Object.assign(button.style, {
      height: '45px',
      // Overrides whatever min-width .generalButton itself carries —
      // the button was visibly wider than UNDO/HINT/NEW even before our
      // own 120px minWidth was added on top of that.
      minWidth: '0',
      boxSizing: 'border-box',
      padding: '0 10px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',

      fontFamily: '"Open Sans Condensed", Arial, Helvetica, sans-serif',
      fontSize: '24px',
      fontWeight: '700',
      textTransform: 'uppercase',
      color: COLOR_LABEL_IDLE,

      border: 'none',
      borderRadius: '14px',
      backgroundColor: 'transparent',
      boxShadow: 'none',

      // Only interactive once gameWon is true — see setWon().
      cursor: 'not-allowed',
      opacity: '0.45',
      userSelect: 'none',
      transition: 'background-color 0.1s ease, color 0.1s ease',
    });

    button.addEventListener('mouseenter', () => {
      if (!gameWon) {
        return;
      }
      button.style.backgroundColor = COLOR_ACCENT_HOVER_BG;
      button.style.color = COLOR_ACCENT;
    });
    button.addEventListener('mouseleave', () => {
      if (!gameWon) {
        return;
      }
      button.style.backgroundColor = 'transparent';
      button.style.color = COLOR_LABEL_IDLE;
    });
    button.addEventListener('click', () => {
      if (!gameWon) {
        return;
      }
      window.location.href = `${BASE_URL}?number=${getNextSequentialGame()}`;
    });

    insertIntoTopBar(wrapper);
  }

  function createUtilityButton(id, label, title, onClick) {
    if (document.getElementById(id)) {
      return;
    }

    const { wrapper, button } = createTopBarButton(id, label);
    button.title = title;

    Object.assign(button.style, {
      height: '45px',
      minWidth: '0',
      boxSizing: 'border-box',
      padding: '0 8px',
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',

      fontFamily: '"Open Sans Condensed", Arial, Helvetica, sans-serif',
      fontSize: '24px',
      fontWeight: '700',
      textTransform: 'uppercase',
      color: COLOR_LABEL_IDLE,

      border: 'none',
      borderRadius: '14px',
      backgroundColor: 'transparent',
      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background-color 0.1s ease, color 0.1s ease',
    });

    button.addEventListener('click', onClick);
    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = COLOR_ACCENT_HOVER_BG;
      button.style.color = COLOR_ACCENT;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = 'transparent';
      button.style.color = COLOR_LABEL_IDLE;
    });

    insertIntoTopBar(wrapper);
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
    Object.assign(separator.style, {
      width: '1px',
      height: '28px',
      margin: '0 4px',
      backgroundColor: 'rgba(0, 0, 0, 0.15)',
    });

    wrapper.appendChild(separator);
    insertIntoTopBar(wrapper);
  }

  function createImportExportButtons() {
    createUtilityButton('fcplus-export', 'Export', 'Export win history', exportHistory);
    createUtilityButton('fcplus-import', 'Import', 'Import win history', importHistory);
  }

  // Mounted into #bsbInner (the game's own status-bar area) rather than
  // floating, and reuses its .statusBarLabels class — the same one the
  // real Time/Score/Moves labels use — for visual consistency.
  function createTracker() {
    if (document.getElementById('fcplus-tracker')) {
      return;
    }

    const inner = document.getElementById('bsbInner');
    if (!inner) {
      return;
    }

    const tracker = document.createElement('div');
    tracker.id = 'fcplus-tracker';

    Object.assign(tracker.style, {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '40px',
      boxSizing: 'border-box',
      padding: '4px 16px',
      backgroundColor: 'rgba(0, 0, 0, 0.12)',

      fontFamily: '"Open Sans Condensed", Arial, Helvetica, sans-serif',
      fontSize: '24px',
      fontWeight: '700',
      color: '#000',
      whiteSpace: 'nowrap',

      userSelect: 'none',
      flexShrink: '0',
    });

    const label = document.createElement('span');
    label.id = 'fcplus-last-won-label';
    label.className = 'statusBarLabels';
    tracker.appendChild(label);

    const reportBug = document.getElementById('bsbReportBug');
    if (reportBug) {
      inner.insertBefore(tracker, reportBug);
    } else {
      inner.appendChild(tracker);
    }

    updateLastWonLabel();
  }

  function updateLastWonLabel() {
    const label = document.getElementById('fcplus-last-won-label');
    if (!label) {
      return;
    }

    const lastWon = getLastWon();
    label.textContent = lastWon !== null ? `Last won: #${lastWon}` : 'Last won: —';
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

    const button = document.getElementById('fcplus-next');
    const label = document.getElementById('fcplus-next-label');
    if (!button || !label) {
      return;
    }

    label.textContent = `NEXT #${getNextSequentialGame()} →`;
    Object.assign(button.style, { cursor: 'pointer', opacity: '1' });
  }

  function resetNextButtonToIdle() {
    const button = document.getElementById('fcplus-next');
    const label = document.getElementById('fcplus-next-label');
    if (!button || !label) {
      return;
    }
    label.textContent = `NEXT #${getNextSequentialGame()}`;
    Object.assign(button.style, { cursor: 'not-allowed', opacity: '0.45' });
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

    const buttons = document.querySelectorAll('.generalButtonContent');
    for (const el of buttons) {
      if (el.textContent.trim() === 'Deal Again') {
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

    createTracker();
    createTopBarSeparator();
    createNextButton();
    createImportExportButtons();
    checkForWin();

    new MutationObserver(scheduleWinCheck).observe(document.body, {
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
    if (document.getElementById('gameTopBar') || document.getElementById('bsbInner')) {
      init();
      return;
    }
    setTimeout(startWhenReady, 100);
  }

  startWhenReady();
})();
