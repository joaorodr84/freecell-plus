// ==UserScript==
// @name         Solitaire Bliss FreeCell Plus
// @namespace    https://github.com/joaorodr84/freecell-plus
// @version      0.2.0
// @description  Enhancements for Solitaire Bliss FreeCell.
// @author       Joao Rodrigues
// @match        https://www.solitairebliss.com/freecell*
// @grant        none
// ==/UserScript==

(function () {
  'use strict';

  const BASE_URL = 'https://www.solitairebliss.com/freecell';
  const BUTTON_ID = 'fcplus-next-game-button';

  // Win screen has no known stable selector yet, so we scan for text
  // instead. Broad net on purpose: narrow it to a real selector once
  // someone inspects the win dialog's markup.
  const WIN_PHRASES = [
    'you won',
    'you win',
    'congratulations',
    'game won',
    'well done',
  ];

  function getCurrentNumber() {
    const number = parseInt(new URLSearchParams(window.location.search).get('number'), 10);
    return Number.isFinite(number) && number >= 1 ? number : null;
  }

  function goToNextGame() {
    const current = getCurrentNumber();
    window.location.href = `${BASE_URL}?number=${current !== null ? current + 1 : 1}`;
  }

  function createButton() {
    if (document.getElementById(BUTTON_ID)) {
      return;
    }

    const button = document.createElement('button');
    button.id = BUTTON_ID;
    button.type = 'button';

    Object.assign(button.style, {
      position: 'fixed',
      right: '20px',
      bottom: '20px',
      zIndex: '999999',
      padding: '12px 18px',
      border: 'none',
      borderRadius: '8px',
      background: '#22b7fe',
      color: '#fff',
      fontSize: '16px',
      fontWeight: 'bold',
      fontFamily: 'Arial, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
      display: 'none',
    });

    button.addEventListener('click', goToNextGame);
    document.body.appendChild(button);
  }

  function showNextButton() {
    const button = document.getElementById(BUTTON_ID);
    if (!button) {
      return;
    }

    const current = getCurrentNumber();
    button.textContent = `Próximo jogo #${current !== null ? current + 1 : 1} →`;
    button.style.display = 'block';
  }

  function checkForWin() {
    const text = document.body.innerText.toLowerCase();
    if (WIN_PHRASES.some((phrase) => text.includes(phrase))) {
      showNextButton();
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
    setInterval(checkForWin, 1000);
  }

  init();
})();
