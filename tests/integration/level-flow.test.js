// INTEGRATION TESTS: game rules. Puzzle bank + adaptive rules + scoring + lesson gate working together.
// Run: node --test "tests/integration/*.test.js"
const test = require('node:test');
const assert = require('node:assert');
const { PUZZLE_BANK, LEVELS } = require('../../js/puzzles.js');
const { nextLevel, weakCategories, pickRoom, SPOT_CATS } = require('../../js/adaptive.js');
const { scoreOf, rankOf } = require('../../js/score.js');
const { lessonDue } = require('../../js/progress.js');

const seeded = (s = 7) => () => (s = (s * 16807) % 2147483647) / 2147483647;
const submits = (ok, bad) => [...Array(ok).fill({ kind: 'submit', is_correct: true }), ...Array(bad).fill({ kind: 'submit', is_correct: false })];
const game = (o) => ({ level: 'BEGINNER', result: 'won', solved_count: 4, hints_used: 0, elapsed_sec: 120, ...o });

test('INT-13 every level builds a full room: 4 puzzles, one per bug type, all at that level', () => {
  for (const level of LEVELS) {
    const room = pickRoom({ level, rnd: seeded() });
    assert.strictEqual(room.length, 4, level);
    assert.deepStrictEqual(room.map((p) => p.category).sort(), SPOT_CATS.slice().sort(), level);
    room.forEach((p) => assert.strictEqual(p.level, level));
  }
});

test('INT-14 a room never repeats the puzzles from the previous game when there is another choice', () => {
  const first = pickRoom({ level: 'BEGINNER', rnd: seeded(1) });
  const second = pickRoom({ level: 'BEGINNER', lastIds: first.map((p) => p.id), rnd: seeded(2) });
  second.forEach((p) => assert.ok(!first.some((f) => f.id === p.id), `${p.id} repeated`));
});

test('INT-15 a perfect, fast win scores S rank, promotes the player, and triggers the next lecture', () => {
  const g = game({ elapsed_sec: 90 });
  const subs = submits(4, 0);
  const score = scoreOf(g, subs);
  assert.ok(score >= 90 && rankOf(score)[1] === 'S', 'score ' + score);
  const next = nextLevel(g, subs);
  assert.strictEqual(next, 'INTERMEDIATE');
  assert.strictEqual(lessonDue(next, 'BEGINNER'), true);
});

test('INT-16 a slow or sloppy win stays on the same level and needs no new lecture', () => {
  const slow = game({ elapsed_sec: 600 });
  assert.strictEqual(nextLevel(slow, submits(4, 0)), 'BEGINNER');
  const sloppy = game({ elapsed_sec: 100, hints_used: 3 });
  assert.strictEqual(nextLevel(sloppy, submits(4, 0)), 'BEGINNER');
  assert.strictEqual(lessonDue('BEGINNER', 'BEGINNER'), false);
});

test('INT-17 leaving early with little solved moves DOWN, and the lower lecture is not repeated', () => {
  const quit = game({ level: 'INTERMEDIATE', result: 'left', solved_count: 1, elapsed_sec: 200 });
  const next = nextLevel(quit, submits(1, 2));
  assert.strictEqual(next, 'BEGINNER');
  assert.strictEqual(lessonDue(next, 'INTERMEDIATE'), false);
});

test('INT-18 a weak bug type gets an easier puzzle next room; the other three stay at the player level', () => {
  const recent = [{ category: 'Scope', is_correct: false }, { category: 'Scope', is_correct: false }];   // newest first
  const weak = weakCategories(recent);
  assert.deepStrictEqual(weak.map((w) => w[0]), ['Scope']);
  const room = pickRoom({ level: 'ADVANCED', weak, rnd: seeded(3) });
  room.forEach((p) => assert.strictEqual(p.level, p.category === 'Scope' ? 'INTERMEDIATE' : 'ADVANCED', p.category));
});

test('INT-19 once the weak type is answered correctly again, it stops being weak', () => {
  const recent = [{ category: 'Scope', is_correct: true }, { category: 'Scope', is_correct: true }, { category: 'Scope', is_correct: true }, { category: 'Scope', is_correct: false }, { category: 'Scope', is_correct: false }];
  assert.deepStrictEqual(weakCategories(recent), []);
});

test('INT-20 the level can climb Beginner -> Intermediate -> Advanced over consecutive games, and caps at Advanced', () => {
  let level = 'BEGINNER', seen = null; const lectures = [];
  for (let n = 0; n < 4; n++) {
    if (lessonDue(level, seen)) { lectures.push(level); seen = level; }
    const room = pickRoom({ level, rnd: seeded(n + 1) });
    assert.strictEqual(room.length, 4);
    level = nextLevel(game({ level, elapsed_sec: 60 }), submits(4, 0));
  }
  assert.deepStrictEqual(lectures, ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
  assert.strictEqual(level, 'ADVANCED');
});

test('INT-21 the bank has enough puzzles at every level for a room that avoids repeats (2+ per bug type)', () => {
  for (const l of LEVELS) for (const c of SPOT_CATS) assert.ok(PUZZLE_BANK.filter((p) => p.level === l && p.category === c).length >= 2, `${c} ${l}`);
});
