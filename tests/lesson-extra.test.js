// Extra lesson-gate checks (js/progress.js). Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { LEVEL_ORDER, levelRank, higherLevel, lessonDue } = require('../js/progress.js');

test('UT-S5 full matrix: 3 levels x 4 seen values, due only when level rank > seen rank', () => {
  const seen = [null, 'BEGINNER', 'INTERMEDIATE', 'ADVANCED'];
  for (const level of LEVEL_ORDER) {
    for (const s of seen) {
      assert.strictEqual(lessonDue(level, s), levelRank(level) > levelRank(s), `${level} / ${s}`);
    }
  }
});

test('UT-S6 unknown, empty or lower-case level counts as BEGINNER, no crash', () => {
  for (const bad of ['', 'beginner', 'EXPERT', null, undefined, 42]) {
    assert.doesNotThrow(() => lessonDue(bad, null));
    assert.strictEqual(lessonDue(bad, null), true);          // never saw a lesson
    assert.strictEqual(lessonDue(bad, 'BEGINNER'), false);   // treated as BEGINNER
  }
});

test('LEVEL_ORDER is Beginner, Intermediate, Advanced and levelRank follows it', () => {
  assert.deepStrictEqual(LEVEL_ORDER, ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']);
  assert.deepStrictEqual(LEVEL_ORDER.map(levelRank), [0, 1, 2]);
  assert.strictEqual(levelRank('nope'), -1);
});

test('UT-S7 higherLevel gives the higher level in either argument order, ignores null', () => {
  assert.strictEqual(higherLevel('BEGINNER', 'ADVANCED'), 'ADVANCED');
  assert.strictEqual(higherLevel('ADVANCED', 'BEGINNER'), 'ADVANCED');
  assert.strictEqual(higherLevel('INTERMEDIATE', 'INTERMEDIATE'), 'INTERMEDIATE');
  assert.strictEqual(higherLevel(null, 'BEGINNER'), 'BEGINNER');
  assert.strictEqual(higherLevel('INTERMEDIATE', undefined), 'INTERMEDIATE');
});