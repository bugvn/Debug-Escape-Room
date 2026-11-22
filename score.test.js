// Run with:  node --test
const test = require('node:test');
const assert = require('node:assert');
const { scoreOf, rankOf, submitsOf, PAR_SEC } = require('./score.js');

const sess = (o) => ({ result: 'won', solved_count: 4, hints_used: 0, elapsed_sec: 0, ...o });
const bad = (n, kind = 'submit') => Array.from({ length: n }, () => ({ kind, is_correct: false }));

test('perfect instant escape is 100', () => {
  assert.strictEqual(scoreOf(sess({ elapsed_sec: 0 }), []), 100);
});

test('no time bonus at or over par', () => {
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC }), []), 80);
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC * 3 }), []), 80);
});

test('half of par gives half the bonus', () => {
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC / 2 }), []), 90);
});

test('left room gets no time bonus', () => {
  assert.strictEqual(scoreOf(sess({ result: 'left', solved_count: 2, elapsed_sec: 10 }), []), 40);
});

test('hints cost 3 each', () => {
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC, hints_used: 2 }), []), 74);
});

test('wrong submits cost 2 each, capped at 20', () => {
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC }), bad(3)), 74);
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC }), bad(50)), 60);
});

test('test runs never cost points', () => {
  assert.strictEqual(scoreOf(sess({ elapsed_sec: PAR_SEC }), bad(5, 'run')), 80);
});

test('rows saved before the kind column count as submits', () => {
  assert.strictEqual(submitsOf([{ is_correct: false }]).length, 1);
});

test('score never goes below 0', () => {
  assert.strictEqual(scoreOf(sess({ result: 'left', solved_count: 0, hints_used: 3 }), bad(10)), 0);
});

test('ranks', () => {
  assert.strictEqual(rankOf(100)[1], 'S');
  assert.strictEqual(rankOf(75)[1], 'A');
  assert.strictEqual(rankOf(60)[1], 'B');
  assert.strictEqual(rankOf(40)[1], 'C');
  assert.strictEqual(rankOf(0)[1], 'D');
});