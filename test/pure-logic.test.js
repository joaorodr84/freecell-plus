'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');

// The script reads/writes `localStorage` directly (it's a real global in
// a Tampermonkey page); this is a minimal in-memory stand-in so the file
// can be `require()`d under Node. See the module.exports guard at the
// bottom of freecell-plus.user.js for why requiring it doesn't also try
// to touch `document`/`window`.
function createMemoryStorage() {
  const data = new Map();
  return {
    getItem(key) {
      return data.has(key) ? data.get(key) : null;
    },
    setItem(key, value) {
      data.set(key, String(value));
    },
    removeItem(key) {
      data.delete(key);
    },
    clear() {
      data.clear();
    },
  };
}

global.localStorage = createMemoryStorage();

const {
  parseGameNumber,
  getNextSequentialGame,
  migrateLegacyStorage,
  mergeHistoryEntries,
} = require('../freecell-plus.user.js');

// Must match STORAGE_WIN_HISTORY/STORAGE_LAST_WON and the LEGACY_*
// equivalents in freecell-plus.user.js — not exported, since they're an
// implementation detail, but the tests need to seed/inspect storage
// directly.
const STORAGE_WIN_HISTORY = 'fcplus:winHistory';
const STORAGE_LAST_WON = 'fcplus:lastWon';
const LEGACY_STORAGE_WIN_HISTORY = 'freecellWinningHistory';
const LEGACY_STORAGE_LAST_WON = 'freecellLastWon';

function setHistory(entries) {
  global.localStorage.setItem(STORAGE_WIN_HISTORY, JSON.stringify(entries));
}

function winEntry(game, wonAt) {
  return { game, wonAt, time: null, score: null, moves: null };
}

test('parseGameNumber', async (t) => {
  await t.test('parses a valid positive integer string', () => {
    assert.equal(parseGameNumber('8'), 8);
  });

  await t.test('rejects non-numeric values', () => {
    assert.equal(parseGameNumber('abc'), null);
  });

  await t.test('rejects zero and negative values', () => {
    assert.equal(parseGameNumber('0'), null);
    assert.equal(parseGameNumber('-5'), null);
  });

  await t.test('rejects null/missing values', () => {
    assert.equal(parseGameNumber(null), null);
    assert.equal(parseGameNumber(undefined), null);
  });
});

test('getNextSequentialGame', async (t) => {
  t.beforeEach(() => global.localStorage.clear());

  await t.test('returns 1 when nothing has been won yet', () => {
    setHistory([]);
    assert.equal(getNextSequentialGame(), 1);
  });

  await t.test('returns the first gap in the sequence', () => {
    setHistory([winEntry(1, 't'), winEntry(2, 't'), winEntry(3, 't'), winEntry(7, 't')]);
    assert.equal(getNextSequentialGame(), 4);
  });

  await t.test('returns 1 when the low end of the sequence is missing', () => {
    setHistory([winEntry(2, 't'), winEntry(3, 't'), winEntry(4, 't')]);
    assert.equal(getNextSequentialGame(), 1);
  });

  await t.test('returns one past the run when there is no gap', () => {
    setHistory([winEntry(1, 't'), winEntry(2, 't'), winEntry(3, 't')]);
    assert.equal(getNextSequentialGame(), 4);
  });
});

test('migrateLegacyStorage', async (t) => {
  t.beforeEach(() => global.localStorage.clear());

  await t.test('copies legacy keys over when the new key is absent', () => {
    global.localStorage.setItem(LEGACY_STORAGE_WIN_HISTORY, JSON.stringify([winEntry(5, 't')]));
    global.localStorage.setItem(LEGACY_STORAGE_LAST_WON, '5');

    migrateLegacyStorage();

    assert.equal(global.localStorage.getItem(STORAGE_WIN_HISTORY), JSON.stringify([winEntry(5, 't')]));
    assert.equal(global.localStorage.getItem(STORAGE_LAST_WON), '5');
  });

  await t.test('does nothing when the new key already has data', () => {
    setHistory([winEntry(9, 't')]);
    global.localStorage.setItem(LEGACY_STORAGE_WIN_HISTORY, JSON.stringify([winEntry(1, 't')]));

    migrateLegacyStorage();

    assert.equal(global.localStorage.getItem(STORAGE_WIN_HISTORY), JSON.stringify([winEntry(9, 't')]));
  });

  await t.test('does nothing when there is nothing to migrate', () => {
    migrateLegacyStorage();
    assert.equal(global.localStorage.getItem(STORAGE_WIN_HISTORY), null);
    assert.equal(global.localStorage.getItem(STORAGE_LAST_WON), null);
  });
});

test('mergeHistoryEntries', async (t) => {
  await t.test('adds new entries and keeps existing ones', () => {
    const result = mergeHistoryEntries([winEntry(1, '2026-01-01T00:00:00Z')], [
      winEntry(2, '2026-01-02T00:00:00Z'),
    ]);
    assert.deepEqual(
      result.map((entry) => entry.game).sort(),
      [1, 2]
    );
  });

  await t.test('keeps the newer wonAt when the same game appears in both', () => {
    const result = mergeHistoryEntries(
      [winEntry(1, '2026-01-01T00:00:00Z')],
      [winEntry(1, '2026-01-05T00:00:00Z')]
    );
    assert.equal(result.length, 1);
    assert.equal(result[0].wonAt, '2026-01-05T00:00:00Z');
  });

  await t.test('does not let an older imported entry overwrite a newer local one', () => {
    const result = mergeHistoryEntries(
      [winEntry(1, '2026-01-05T00:00:00Z')],
      [winEntry(1, '2026-01-01T00:00:00Z')]
    );
    assert.equal(result[0].wonAt, '2026-01-05T00:00:00Z');
  });

  await t.test('drops malformed imported entries', () => {
    const result = mergeHistoryEntries(
      [],
      [null, { game: 'abc', wonAt: 't' }, { game: 0, wonAt: 't' }, { game: 1, wonAt: 42 }]
    );
    assert.deepEqual(result, []);
  });

  await t.test('sorts the merged result by wonAt, newest first', () => {
    const result = mergeHistoryEntries(
      [winEntry(1, '2026-01-01T00:00:00Z')],
      [winEntry(2, '2026-01-03T00:00:00Z'), winEntry(3, '2026-01-02T00:00:00Z')]
    );
    assert.deepEqual(
      result.map((entry) => entry.game),
      [2, 3, 1]
    );
  });

  await t.test('defaults invalid time/score/moves to null instead of passing them through', () => {
    const result = mergeHistoryEntries(
      [],
      [{ game: 1, wonAt: 't', time: 123, score: 'high', moves: null }]
    );
    assert.deepEqual(result[0], { game: 1, wonAt: 't', time: null, score: null, moves: null });
  });
});
