// Run with:  node --test
const test = require('node:test');
const assert = require('node:assert');
const { PUZZLE_BANK, LEVELS, CATEGORIES, MISTAKE_CATEGORIES, SPOT_CATEGORY, categoryOfTag, TAG_CATEGORY, applyVariant, pyLiteral } = require('../js/puzzles.js');
const { RULES, SPOT_CATS, accuracyOf, nextLevel, weakCategories, pickRoom } = require('../js/adaptive.js');

const good = (n) => Array.from({ length: n }, () => ({ kind: 'submit', is_correct: true }));
const bad = (n, kind = 'submit') => Array.from({ length: n }, () => ({ kind, is_correct: false }));
const game = (o) => ({ level: 'BEGINNER', result: 'won', solved_count: 4, hints_used: 0, elapsed_sec: 41, ...o });
const seeded = (s = 1) => () => (s = (s * 16807) % 2147483647) / 2147483647;

test('bank: unique ids, every category x level covered, valid fields', () => {
  assert.strictEqual(new Set(PUZZLE_BANK.map((p) => p.id)).size, PUZZLE_BANK.length);
  for (const l of LEVELS) for (const c of CATEGORIES)
    assert.ok(PUZZLE_BANK.filter((p) => p.level === l && p.category === c).length >= 2, `need 2+ puzzles for ${c} ${l}`);
  PUZZLE_BANK.forEach((p) => { assert.ok(CATEGORIES.includes(p.category)); assert.strictEqual(p.hint.length, 2); });
});

test('tag -> category', () => {
  assert.strictEqual(categoryOfTag('IndexError'), 'Index');
  assert.strictEqual(categoryOfTag('UnboundLocalError'), 'Scope');
  assert.strictEqual(categoryOfTag('IndentationError'), 'Syntax');
  assert.strictEqual(categoryOfTag('Wrong Output'), 'Logic');
  assert.strictEqual(categoryOfTag('SomethingNew'), 'Other');
  Object.values(TAG_CATEGORY).forEach((c) => assert.ok(MISTAKE_CATEGORIES.includes(c)));
});

test('applyVariant keeps quotes, pyLiteral makes valid python', () => {
  const v = PUZZLE_BANK.find((p) => p.id === 'b-type-lock').variant;
  assert.strictEqual(applyVariant('digit = "7"', v), 'digit = "4"');
  assert.strictEqual(applyVariant('digit = 7', v), 'digit = 4');
  assert.strictEqual(pyLiteral([true, null, { a: '2' }]), '[True, None, {"a": "2"}]');
});

test('accuracy counts submits only', () => {
  assert.strictEqual(accuracyOf([...good(3), ...bad(5, 'run')]), 1);
  assert.strictEqual(accuracyOf([]), null);
});

test('clean fast win moves up one level', () => {
  assert.strictEqual(nextLevel(game(), good(4)), 'INTERMEDIATE');
  assert.strictEqual(nextLevel(game({ level: 'INTERMEDIATE' }), good(4)), 'ADVANCED');
});

test('top level stays at top, bottom level stays at bottom', () => {
  assert.strictEqual(nextLevel(game({ level: 'ADVANCED' }), good(4)), 'ADVANCED');
  assert.strictEqual(nextLevel(game({ result: 'left', solved_count: 0 }), bad(4)), 'BEGINNER');
});

test('slow, hint-heavy or sloppy win stays', () => {
  assert.strictEqual(nextLevel(game({ elapsed_sec: RULES.parSec.BEGINNER + 1 }), good(4)), 'BEGINNER');
  assert.strictEqual(nextLevel(game({ hints_used: 2 }), good(4)), 'BEGINNER');
  assert.strictEqual(nextLevel(game(), [...good(3), ...bad(2)]), 'BEGINNER');   // 60% accuracy
});

test('very low accuracy or leaving early moves down', () => {
  assert.strictEqual(nextLevel(game({ level: 'ADVANCED' }), [...good(1), ...bad(4)]), 'INTERMEDIATE');
  assert.strictEqual(nextLevel(game({ level: 'INTERMEDIATE', result: 'left', solved_count: 1 }), good(1)), 'BEGINNER');
});

test('left after solving most puzzles with good accuracy stays', () => {
  assert.strictEqual(nextLevel(game({ level: 'INTERMEDIATE', result: 'left', solved_count: 3 }), good(3)), 'INTERMEDIATE');
});

test('weak categories need 2 misses, worst first, runs ignored', () => {
  const rows = [
    { category: 'Index', is_correct: false }, { category: 'Index', is_correct: false }, { category: 'Index', is_correct: false },
    { category: 'Type', is_correct: false }, { category: 'Type', is_correct: false },
    { category: 'Scope', is_correct: false },
    { category: 'Logic', is_correct: false, kind: 'run' }, { category: 'Logic', is_correct: false, kind: 'run' }
  ];
  assert.deepStrictEqual(weakCategories(rows), [['Index', 3], ['Type', 2]]);
});

test('room: 4 distinct puzzles, all from the asked level when the bank has enough', () => {
  const r = pickRoom({ level: 'INTERMEDIATE', rnd: seeded(3) });
  assert.strictEqual(r.length, 4);
  assert.strictEqual(new Set(r.map((p) => p.id)).size, 4);
  assert.ok(r.every((p) => p.level === 'INTERMEDIATE'));
  assert.strictEqual(new Set(r.map((p) => p.category)).size, 4);
});

test('room: weak categories are always included, capped by weakSlots', () => {
  for (let s = 1; s < 30; s++) {
    const r = pickRoom({ level: 'BEGINNER', weak: [['Recursion', 4], ['Scope', 3], ['Syntax', 2]], rnd: seeded(s) });
    const cats = r.map((p) => p.category);
    assert.ok(cats.includes('Recursion') && cats.includes('Scope'));
  }
});

test('room: tops up from the nearest level when a level is short', () => {
  const small = PUZZLE_BANK.filter((p) => p.level !== 'ADVANCED' || p.category === 'Index');
  const r = pickRoom({ level: 'ADVANCED', bank: small, rnd: seeded(5) });
  assert.strictEqual(r.length, 4);
  assert.strictEqual(r[0].level, 'ADVANCED');
  assert.ok(r.slice(1).every((p) => p.level === 'INTERMEDIATE'));
});

test('room: puzzles from the last room are not repeated', () => {
  for (const level of LEVELS) for (let s = 1; s < 20; s++) {
    const first = pickRoom({ level, rnd: seeded(s) });
    const next = pickRoom({ level, lastIds: first.map((p) => p.id), rnd: seeded(s + 100) });
    assert.strictEqual(next.length, 4);
    next.forEach((p) => assert.ok(!first.some((f) => f.id === p.id), `${p.id} repeated`));
  }
});

test('room: every object gets a puzzle that is themed on it', () => {
  // each level is its own room (bedroom / kitchen / living room), so a puzzle names the object of ITS room
  const WORD = {
    BEGINNER:     { window: /cactus/i, fridge: /air conditioner/i, kettle: /teddy bear/i, clock: /computer/i },
    INTERMEDIATE: { window: /plant/i,  fridge: /cabinet/i,         kettle: /pan/i,        clock: /wall clock/i },
    ADVANCED:     { window: /\btv\b/i,  fridge: /green box/i,       kettle: /roomba/i,     clock: /laptop/i }
  };
  for (const [spot, cat] of Object.entries(SPOT_CATEGORY))
    PUZZLE_BANK.filter((p) => p.category === cat).forEach((p) =>
      assert.ok(WORD[p.level][spot].test(p.story + ' ' + p.title), `${p.id} is a ${p.level} ${cat} puzzle but never mentions its ${spot} object`));
  for (const level of LEVELS) for (let s = 1; s < 10; s++) {
    const room = pickRoom({ level, rnd: seeded(s) });
    assert.deepStrictEqual(room.map((p) => p.category), SPOT_CATS);
  }
});

test('room: a weak category gets a puzzle one level easier', () => {
  for (let s = 1; s < 20; s++) {
    const r = pickRoom({ level: 'ADVANCED', weak: [['Type', 3]], rnd: seeded(s) });
    assert.strictEqual(r.find((p) => p.category === 'Type').level, 'INTERMEDIATE');
    assert.ok(r.filter((p) => p.category !== 'Type').every((p) => p.level === 'ADVANCED'));
  }
});

test('weak categories expire once the player gets them right', () => {
  const rows = [  // newest first
    { category: 'Index', is_correct: true }, { category: 'Index', is_correct: true }, { category: 'Index', is_correct: true },
    { category: 'Index', is_correct: false }, { category: 'Index', is_correct: false }, { category: 'Index', is_correct: false }
  ];
  assert.deepStrictEqual(weakCategories(rows), []);
});