// ==UserScript==
// @name         Solitaire Bliss FreeCell Plus
// @namespace    https://github.com/joaorodr84/freecell-plus
// @version      0.3.0
// @description  Enhancements for Solitaire Bliss FreeCell.
// @author       Joao Rodrigues
// @match        https://www.solitairebliss.com/freecell*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BASE_URL = 'https://www.solitairebliss.com/freecell';
  const BUTTON_ID = 'fcplus-next-game-button';

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

  function setWon() {
    if (gameWon) {
      return;
    }
    gameWon = true;

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
