// PUZZLE CODE + category map. The puzzles themselves live in js/puzzles.json (plain data, easy to add to).
// This file loads them, themes them on the room object and holds the shared lookups, so game-room.html, tests and
// tools/verify_bank.py all read the same data.
//
// HOW TO ADD A PUZZLE: append one object to js/puzzles.json, add its fix to tools/fixes.json (never shipped to the
// browser), then run  npm run check.  Keep 2+ puzzles per (category x level) cell so rooms can rotate.
//
// THEMING: puzzles are object-neutral. Write {obj} where the room object belongs ("The {obj} has five star tags")
// and {objfile} in the file name ("{objfile}_stars.py"). themePuzzle() swaps in the object of the room being played,
// so ANY puzzle fits ANY room, including the easier puzzle a weak category pulls down from a lower level.
//
// Fields (js/puzzles.json)
//   id, category, level   what it trains and how hard it is. Existing ids stay stable so saved data still matches.
//   title                 shown on the object label and puzzle window (use {obj})
//   story                 mission text, use {obj}, end it with "Fix the code and run it."
//   code                  buggy program the player edits: an ARRAY OF LINES here, one string in PUZZLE_BANK
//   expect                exact output the fixed program prints
//   file, status, badge   flavour text in the code panel (file uses {objfile})
//   bug                   0-based line numbers highlighted red in the code panel
//   why                   explanation shown after solving
//   hint                  2 steps, vague first then specific
//   needDef               function name the answer must still define (validate())
//   variant               hidden check 1: re-run the same code on other data. {re, to, expect}.
//                         "to" may use {1} {2} for regex groups.
//   probes                hidden check 2: call a function with other inputs. [{fn,args,expect}]
//   needCall              hidden check 3: the result must come from a real call to this function

const CATEGORIES = ['Index', 'Type', 'Recursion', 'Scope'];           // what a room can train
const MISTAKE_CATEGORIES = [...CATEGORIES, 'Syntax', 'Logic', 'Other']; // what a player's wrong answer can be tagged as
const LEVELS = ['BEGINNER', 'INTERMEDIATE', 'ADVANCED'];

// One object per category. Single source of truth: game-room.html, js/adaptive.js and the tests all read it.
const SPOT_CATEGORY = { window: 'Index', fridge: 'Type', kettle: 'Recursion', clock: 'Scope' };

// Mistake tag (what the player's code actually did) -> category. One lookup for the whole app.
// Tags come from evaluate() in game-room.html: Python error names + 3 game tags.
const TAG_CATEGORY = {
  IndexError: 'Index', KeyError: 'Index',
  TypeError: 'Type', ValueError: 'Type', AttributeError: 'Type',
  RecursionError: 'Recursion',
  NameError: 'Scope', UnboundLocalError: 'Scope',
  SyntaxError: 'Syntax', IndentationError: 'Syntax', TabError: 'Syntax',
  ZeroDivisionError: 'Logic', 'Wrong Output': 'Logic', 'Infinite Loop': 'Logic', 'Hardcoded Answer': 'Logic'
};
function categoryOfTag(tag) { return TAG_CATEGORY[tag] || 'Other'; }

// ---------- bank loading ----------
// PUZZLE_BANK is one array that is filled IN PLACE, so js/adaptive.js and js/analytics.js keep a valid reference.
//   node / tests / tools: filled right away from js/puzzles.json (see the bottom of this file).
//   browser: call  await loadPuzzleBank()  once before using the bank (game-room.html and analytics.html do).
const PUZZLE_BANK = [];

function normalizePuzzle(p) {
  return { ...p, code: Array.isArray(p.code) ? p.code.join('\n') : p.code };
}
function fillBank(raw) {
  PUZZLE_BANK.length = 0;
  raw.forEach((p) => PUZZLE_BANK.push(normalizePuzzle(p)));
  return PUZZLE_BANK;
}
let _bankPromise = null;
function loadPuzzleBank(url = 'js/puzzles.json') {
  if (PUZZLE_BANK.length) return Promise.resolve(PUZZLE_BANK);
  if (!_bankPromise) {
    _bankPromise = fetch(url)
      .then((r) => { if (!r.ok) throw new Error('cannot load ' + url + ' (' + r.status + ')'); return r.json(); })
      .then(fillBank)
      .catch((e) => { _bankPromise = null; throw e; });   // allow a retry after a failure
  }
  return _bankPromise;
}

// {obj} -> "Cactus", {objfile} -> "cactus" / "air_conditioner" / "wall_clock". Applied to title, story and file.
function themePuzzle(p, objName) {
  const slug = String(objName).toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
  const sub = (s) => String(s).replace(/\{obj\}/g, objName).replace(/\{objfile\}/g, slug);
  return { ...p, title: sub(p.title), story: sub(p.story), file: sub(p.file) };
}
// title with the object token removed, for pages that show a puzzle outside a room (analytics)
function plainTitle(p) {
  return String(p.title).replace(/\{obj\}\s*/g, '').trim();
}

// regex + replacement used by the "same code, other data" hidden check
function applyVariant(code, v) {
  const re = new RegExp(v.re);
  return code.replace(re, (...m) => v.to.replace(/\{(\d)\}/g, (_, i) => m[+i] ?? ''));
}

// JSON -> Python source (JSON true/false/null are not valid Python), used to build probe calls
function pyLiteral(v) {
  if (v === null || v === undefined) return 'None';
  if (v === true) return 'True';
  if (v === false) return 'False';
  if (typeof v === 'number') return String(v);
  if (typeof v === 'string') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(pyLiteral).join(', ') + ']';
  return '{' + Object.keys(v).map((k) => JSON.stringify(k) + ': ' + pyLiteral(v[k])).join(', ') + '}';
}

// node test runner and tools/verify_bank.py can load this file; browsers ignore it
if (typeof module !== 'undefined') {
  fillBank(require('./puzzles.json'));
  module.exports = { CATEGORIES, MISTAKE_CATEGORIES, SPOT_CATEGORY, LEVELS, TAG_CATEGORY, categoryOfTag, PUZZLE_BANK, fillBank, loadPuzzleBank, themePuzzle, plainTitle, applyVariant, pyLiteral };
}