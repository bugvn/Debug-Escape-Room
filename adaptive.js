// RULE-BASED ADAPTIVITY. No ML, no training data: plain thresholds you can explain and tune.
// Pure functions (no page code, no database) so node --test can check every rule.
//
// 1) nextLevel()   after each game: did the player do well enough to move up or down?
// 2) weakCategories()  which categories the player keeps missing
// 3) pickRoom()    choose the 4 puzzles for the next room from the bank
//
// Needs puzzles.js (LEVELS, PUZZLE_BANK) loaded first in the browser.

const RULES = {
  promoteAccuracy: 0.75,   // submit accuracy needed to move up
  promoteMaxHints: 1,      // hints used at most
  demoteAccuracy: 0.4,     // below this submit accuracy move down
  demoteMaxSolved: 1,      // or: left the room having solved this few or fewer
  parSec: { BEGINNER: 300, INTERMEDIATE: 420, ADVANCED: 600 },  // finish under par to move up
  weakMisses: 2,           // wrong submits in one category before it counts as "weak"
  weakSlots: 2,            // at most this many of the 4 puzzles are chosen because of weakness
  historyAttempts: 60      // how many recent submits to look at for weakness
};

const _levels = (typeof LEVELS !== 'undefined') ? LEVELS : require('./puzzles.js').LEVELS;
const _bank = (typeof PUZZLE_BANK !== 'undefined') ? PUZZLE_BANK : require('./puzzles.js').PUZZLE_BANK;

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
function weakCategories(recent) {
  const miss = {};
  (recent || []).filter((x) => (x.kind || 'submit') === 'submit' && !x.is_correct && x.category)
    .slice(0, RULES.historyAttempts).forEach((x) => { miss[x.category] = (miss[x.category] || 0) + 1; });
  return Object.entries(miss).filter((e) => e[1] >= RULES.weakMisses).sort((a, b) => b[1] - a[1]);
}

function shuffle(a, rnd) {
  a = a.slice();
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
}

// Choose n puzzles.
//   level     where the player is now
//   weak      output of weakCategories() ([] for the non-adaptive group)
//   lastIds   puzzle ids of the player's previous room (avoided when there are other choices)
//   rnd       Math.random, or a seeded fn in tests
function pickRoom({ level, weak = [], lastIds = [], n = 4, bank = _bank, rnd = Math.random }) {
  const li = Math.max(0, _levels.indexOf(level));
  // closest levels first, so a small bank still fills the room
  const order = _levels.map((l, i) => [l, Math.abs(i - li)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);
  const chosen = [], cats = new Set();
  const free = (p) => !chosen.includes(p);
  const fresh = (list) => { const f = list.filter((p) => !lastIds.includes(p.id)); return f.length ? f : list; };

  for (const lv of order) {
    if (chosen.length >= n) break;
    const pool = shuffle(bank.filter((p) => p.level === lv), rnd);
    // pass 1: weak categories first (limited slots), pass 2: unused categories, pass 3: anything left
    weak.slice(0, RULES.weakSlots).forEach(([cat]) => {
      if (chosen.length >= n) return;
      const p = fresh(pool.filter((x) => x.category === cat && free(x)))[0];
      if (p) { chosen.push(p); cats.add(p.category); }
    });
    for (const p of fresh(pool.filter((x) => free(x) && !cats.has(x.category)))) {
      if (chosen.length >= n) break;
      if (free(p) && !cats.has(p.category)) { chosen.push(p); cats.add(p.category); }
    }
    for (const p of fresh(pool.filter(free))) { if (chosen.length >= n) break; if (free(p)) chosen.push(p); }
  }
  return chosen;
}

if (typeof module !== 'undefined') module.exports = { RULES, accuracyOf, nextLevel, weakCategories, pickRoom };