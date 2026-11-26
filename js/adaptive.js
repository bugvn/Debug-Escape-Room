// RULE-BASED ADAPTIVITY. No ML, no training data: plain thresholds you can explain and tune.
// Pure functions (no page code, no database) so node --test can check every rule.
//
// 1) nextLevel()   after each game: did the player do well enough to move up or down?
// 2) weakCategories()  which categories the player keeps missing
// 3) pickRoom()    choose the 4 puzzles (one per object in the room) for the next room from the bank
//
// Needs js/puzzles.js (LEVELS, PUZZLE_BANK) loaded first in the browser, and the bank filled (await loadPuzzleBank()).

const RULES = {
  promoteAccuracy: 0.75,   // submit accuracy needed to move up
  promoteMaxHints: 1,      // hints used at most
  demoteAccuracy: 0.4,     // below this submit accuracy move down
  demoteMaxSolved: 1,      // or: left the room having solved this few or fewer
  parSec: { BEGINNER: 300, INTERMEDIATE: 420, ADVANCED: 600 },  // finish under par to move up
  weakMisses: 2,           // wrong submits (inside the window below) before a category counts as "weak"
  weakWindow: 4,           // only the player's last N submits in a category count, so old misses expire
  weakSlots: 2,            // at most this many of the 4 puzzles are chosen because of weakness
  historyAttempts: 60      // how many recent submits to look at for weakness
};

const _levels = (typeof LEVELS !== 'undefined') ? LEVELS : require('./puzzles.js').LEVELS;
const _bank = (typeof PUZZLE_BANK !== 'undefined') ? PUZZLE_BANK : require('./puzzles.js').PUZZLE_BANK;
const _spots = (typeof SPOT_CATEGORY !== 'undefined') ? SPOT_CATEGORY : require('./puzzles.js').SPOT_CATEGORY;

// accuracy over real submits only (test runs do not count). null when there were none.
function accuracyOf(subs) {
  const s = subs.filter((x) => (x.kind || 'submit') === 'submit');
  return s.length ? s.filter((x) => x.is_correct).length / s.length : null;
}

// g = { level, result, solved_count, hints_used, elapsed_sec }, subs = that game's attempt rows.
// Returns the level the NEXT room should use.
function nextLevel(g, subs) {
  const i = _levels.indexOf(g.level) < 0 ? 0 : _levels.indexOf(g.level);
  const acc = accuracyOf(subs || []);
  const par = RULES.parSec[_levels[i]];
  const won = g.result === 'won';
  const up = won && acc !== null && acc >= RULES.promoteAccuracy
    && g.hints_used <= RULES.promoteMaxHints && g.elapsed_sec <= par;
  const down = (acc !== null && acc < RULES.demoteAccuracy) || (!won && g.solved_count <= RULES.demoteMaxSolved);
  return _levels[Math.max(0, Math.min(_levels.length - 1, i + (up ? 1 : down ? -1 : 0)))];
}

// recent = submit rows, newest first: [{ category, is_correct, kind }]. Returns [[category, misses], ...] worst first.
// Only the last weakWindow submits of each category count, so a category the player has since fixed stops being "weak".
function weakCategories(recent) {
  const seen = {}, miss = {};
  (recent || []).filter((x) => (x.kind || 'submit') === 'submit' && x.category)
    .slice(0, RULES.historyAttempts).forEach((x) => {
      seen[x.category] = (seen[x.category] || 0) + 1;
      if (seen[x.category] <= RULES.weakWindow && !x.is_correct) miss[x.category] = (miss[x.category] || 0) + 1;
    });
  return Object.entries(miss).filter((e) => e[1] >= RULES.weakMisses).sort((a, b) => b[1] - a[1]);
}

function shuffle(a, rnd) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Choose the room's puzzles: exactly one per object in the room.
//   Each object owns one category (SPOT_CATEGORY in js/puzzles.js). Puzzles use the {obj} token, so game-room.html
//   themes whatever is picked (even an easier puzzle from a lower level) on the object that was clicked.
//   level     where the player is now
//   weak      output of weakCategories() ([] for the non-adaptive group)
//   lastIds   puzzle ids of the player's previous room (avoided when there is another choice)
//   rnd       Math.random, or a seeded fn in tests
// Adaptivity: a weak category (up to weakSlots of them) gets an easier puzzle, one level down.
const SPOT_CATS = Object.values(_spots);

function pickRoom({ level, weak = [], lastIds = [], bank = _bank, rnd = Math.random }) {
  const li = Math.max(0, _levels.indexOf(level));
  const weakCats = weak.map(([c]) => c).filter((c) => SPOT_CATS.includes(c)).slice(0, RULES.weakSlots);
  const chosen = {};

  for (const cat of SPOT_CATS) {
    const wantLi = weakCats.includes(cat) ? Math.max(0, li - 1) : li;
    // wanted level first, then the closest levels, so a small bank still fills the room
    const tryOrder = _levels.map((_, i) => i).sort((a, b) => Math.abs(a - wantLi) - Math.abs(b - wantLi) || a - b);
    for (const k of tryOrder) {
      const pool = shuffle(bank.filter((p) => p.category === cat && p.level === _levels[k]), rnd);
      const fresh = pool.filter((p) => !lastIds.includes(p.id));
      const pick = (fresh.length ? fresh : pool)[0];
      if (pick) { chosen[cat] = pick; break; }
    }
  }
  return SPOT_CATS.map((c) => chosen[c]).filter(Boolean);
}

if (typeof module !== 'undefined') module.exports = { RULES, SPOT_CATS, accuracyOf, nextLevel, weakCategories, pickRoom };