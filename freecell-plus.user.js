// ==UserScript==
// @name         Solitaire Bliss FreeCell Plus
// @namespace    https://github.com/joaorodr84/freecell-plus
// @version      0.5.0
// @description  Enhancements for Solitaire Bliss FreeCell.
// @author       Joao Rodrigues
// @match        https://www.solitairebliss.com/freecell*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BASE_URL = 'https://www.solitairebliss.com/freecell';
  const BUTTON_ID = 'fcplus-next-game-button';
  const LAST_WON_LABEL_ID = 'fcplus-last-won-label';
  const TOOLS_ROW_ID = 'fcplus-tools-row';

  // Namespaced to avoid colliding with any localStorage keys the site
  // itself (or another userscript) might use.
  const STORAGE_LAST_WON = 'fcplus:lastWon';
  const STORAGE_WIN_HISTORY = 'fcplus:winHistory';

  // Solitaire Bliss's own palette/type, lifted from its computed styles,
  // so the button reads as part of the site rather than a bolted-on
  // userscript widget.
  const COLOR_PRIMARY = '#804817';
  const COLOR_PRIMARY_HOVER_BG = '#f1f0e3';
  const BORDER_RADIUS_SMALL = '8px';

  let gameWon = false;

  function getCurrentNumber() {
    const number = parseInt(new URLSearchParams(window.location.search).get('number'), 10);
    return Number.isFinite(number) && number >= 1 ? number : 1;
  }

  const currentGame = getCurrentNumber();
  const nextGame = currentGame + 1;

  function goToNextGame() {
    window.location.href = `${BASE_URL}?number=${nextGame}`;
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

  // Replaying an already-won game updates its timestamp rather than
  // adding a duplicate entry, so history stays one row per game number.
  function recordWin(gameNumber) {
    localStorage.setItem(STORAGE_LAST_WON, String(gameNumber));

    const history = getWinHistory();
    const wonAt = new Date().toISOString();
    const existing = history.find((entry) => entry.game === gameNumber);
    if (existing) {
      existing.wonAt = wonAt;
    } else {
      history.push({ game: gameNumber, wonAt });
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
              merged.set(entry.game, { game: entry.game, wonAt: entry.wonAt });
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
          window.alert(`Histórico importado: ${history.length} jogo(s) ganho(s).`);
        } catch (error) {
          console.error('[Freecell Plus] Failed to import history:', error);
          window.alert('Não foi possível importar o ficheiro de histórico.');
        }
      };
      reader.readAsText(file);
    });

    input.click();
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';
    button.textContent = `PRÓXIMO JOGO #${nextGame}`;

    Object.assign(button.style, {
      position: 'fixed',
      right: '22px',
      bottom: '22px',
      zIndex: '2147483647',

      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      height: '45px',
      minWidth: '190px',
      padding: '0 16px',
      boxSizing: 'border-box',

      backgroundColor: COLOR_PRIMARY,
      color: '#fff7e9',
      border: 'none',
      borderRadius: BORDER_RADIUS_SMALL,

      fontFamily: '"Open Sans Condensed", Arial, Helvetica, sans-serif',
      fontSize: '20px',
      fontWeight: '700',
      lineHeight: '1',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',

      cursor: 'default',
      filter: 'drop-shadow(0 0 3px rgba(0, 0, 0, 0.5))',
      userSelect: 'none',
      transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    });

    // Only interactive once gameWon is true — see setWon().
    button.addEventListener('mouseenter', () => {
      if (!gameWon) {
        return;
      }
      button.style.backgroundColor = COLOR_PRIMARY_HOVER_BG;
      button.style.color = COLOR_PRIMARY;
    });

    button.addEventListener('mouseleave', () => {
      if (!gameWon) {
        return;
      }
      button.style.backgroundColor = COLOR_PRIMARY;
      button.style.color = '#fff7e9';
    });

    button.addEventListener('click', () => {
      if (!gameWon) {
        return;
      }
      goToNextGame();
    });

    document.body.appendChild(button);
  }

  function createLastWonLabel() {
    if (document.getElementById(LAST_WON_LABEL_ID)) {
      return;
    }

    const label = document.createElement('div');
    label.id = LAST_WON_LABEL_ID;

    Object.assign(label.style, {
      position: 'fixed',
      right: '22px',
      bottom: '75px',
      zIndex: '2147483647',

      padding: '4px 10px',
      backgroundColor: '#fff7e9',
      color: COLOR_PRIMARY,
      border: `1px solid ${COLOR_PRIMARY}`,
      borderRadius: BORDER_RADIUS_SMALL,

      fontFamily: '"Open Sans Condensed", Arial, Helvetica, sans-serif',
      fontSize: '14px',
      fontWeight: '700',
      textTransform: 'uppercase',
      whiteSpace: 'nowrap',
      userSelect: 'none',
    });

    document.body.appendChild(label);
    updateLastWonLabel();
  }

  function updateLastWonLabel() {
    const label = document.getElementById(LAST_WON_LABEL_ID);
    if (!label) {
      return;
    }

    const lastWon = getLastWon();
    label.textContent = lastWon !== null ? `Último ganho: #${lastWon}` : 'Último ganho: —';
  }

  function createToolButton(label, onClick) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = label;

    Object.assign(button.style, {
      height: '28px',
      padding: '0 10px',
      border: 'none',
      borderRadius: BORDER_RADIUS_SMALL,

      backgroundColor: COLOR_PRIMARY,
      color: '#fff7e9',

      fontFamily: '"Open Sans Condensed", Arial, Helvetica, sans-serif',
      fontSize: '13px',
      fontWeight: '700',
      textTransform: 'uppercase',

      cursor: 'pointer',
      userSelect: 'none',
      transition: 'background-color 0.2s ease-in-out, color 0.2s ease-in-out',
    });

    button.addEventListener('mouseenter', () => {
      button.style.backgroundColor = COLOR_PRIMARY_HOVER_BG;
      button.style.color = COLOR_PRIMARY;
    });
    button.addEventListener('mouseleave', () => {
      button.style.backgroundColor = COLOR_PRIMARY;
      button.style.color = '#fff7e9';
    });
    button.addEventListener('click', onClick);

    return button;
  }

  function createToolsRow() {
    if (document.getElementById(TOOLS_ROW_ID)) {
      return;
    }

    const row = document.createElement('div');
    row.id = TOOLS_ROW_ID;

    Object.assign(row.style, {
      position: 'fixed',
      right: '22px',
      bottom: '108px',
      zIndex: '2147483647',
      display: 'flex',
      gap: '8px',
    });

    row.appendChild(createToolButton('Exportar', exportHistory));
    row.appendChild(createToolButton('Importar', importHistory));

    document.body.appendChild(row);
  }

  function setWon() {
    if (gameWon) {
      return;
    }
    gameWon = true;

    recordWin(currentGame);
    updateLastWonLabel();

    const button = document.getElementById(BUTTON_ID);
    if (!button) {
      return;
    }

    button.textContent = `PRÓXIMO JOGO #${nextGame} →`;
    button.style.cursor = 'pointer';
  }

  // The win screen has no dedicated marker, but it does render a
  // "Deal Again" button reusing the site's own .generalButtonContent
  // class (confirmed by inspecting a completed game) — checking for
  // that text is far more reliable than scanning body text for
  // win-related phrases, which is what the first version did.
  function checkForWin() {
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
    createButton();
    createLastWonLabel();
    createToolsRow();
    checkForWin();

    new MutationObserver(scheduleWinCheck).observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    // Belt-and-braces: catches a win state the observer's filters miss
    // (e.g. a style/attribute-only change) without much runtime cost.
    setInterval(checkForWin, 500);
  }

  init();
})();
