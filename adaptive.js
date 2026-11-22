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
// The 4 spot-pinned categories that the room always needs one of each.
// pickRoom returns exactly one puzzle per spot-category so buildRoom can
// assign them to the right appliance. Weak-slot overrides stay inside this set.
const SPOT_CATS = ['Index', 'Type', 'Recursion', 'Scope'];

function pickRoom({ level, weak = [], lastIds = [], n = 4, bank = _bank, rnd = Math.random }) {
  const li = Math.max(0, _levels.indexOf(level));
  // closest levels first, so a small bank still fills the room
  const order = _levels.map((l, i) => [l, Math.abs(i - li)]).sort((a, b) => a[1] - b[1]).map((x) => x[0]);

  // Only pick from spot-pinned categories so buildRoom can always match appliance→category.
  // weak slots: demote by 1 level (capped at 0) for the weakest matching categories.
  const weakCats = weak.map(([c]) => c).filter((c) => SPOT_CATS.includes(c)).slice(0, RULES.weakSlots);
  const chosen = {}; // cat -> puzzle

  for (const cat of SPOT_CATS) {
    const demote = weakCats.includes(cat);
    // try preferred level (demoted for weak), then fall back outward
    const wantLi = demote ? Math.max(0, li - 1) : li;
    const tryOrder = _levels.map((_, i) => i).sort((a, b) => Math.abs(a - wantLi) - Math.abs(b - wantLi) || a - b);
    for (const k of tryOrder) {
      const pool = shuffle(bank.filter((p) => p.category === cat && p.level === _levels[k]), rnd);
      const fresh = pool.filter((p) => !lastIds.includes(p.id));
      const pick = (fresh.length ? fresh : pool)[0];
      if (pick) { chosen[cat] = pick; break; }
    }
  }
  // return in SPOT_CATS order so buildRoom sees a consistent array
  return SPOT_CATS.map((c) => chosen[c]).filter(Boolean);
}

if (typeof module !== 'undefined') module.exports = { RULES, accuracyOf, nextLevel, weakCategories, pickRoom };