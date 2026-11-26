// Run with:  node --test
const test = require('node:test');
const assert = require('node:assert');
const { INTEGRITY, countsAsStrike, isDevtoolsKey, isBigInsert } = require('../js/integrity.js');

test('copy, paste, cut, drop and big inserts are strikes', () => {
  ['paste', 'copy', 'cut', 'drop', 'big_jump'].forEach((t) => assert.strictEqual(countsAsStrike(t), true, t));
});

test('right-click and devtools keys are logged but free', () => {
  assert.strictEqual(countsAsStrike('contextmenu'), false);
  assert.strictEqual(countsAsStrike('devtools_key'), false);
});

test('leaving the window only costs a strike after the grace time', () => {
  assert.strictEqual(countsAsStrike('window_blur', INTEGRITY.awayGraceMs - 1), false);
  assert.strictEqual(countsAsStrike('window_blur', INTEGRITY.awayGraceMs), true);
  assert.strictEqual(countsAsStrike('tab_hidden', 15000), true);
  assert.strictEqual(countsAsStrike('tab_hidden'), false);          // no duration = no strike
});

test('developer-tools shortcuts are recognised, normal typing is not', () => {
  assert.ok(isDevtoolsKey({ key: 'F12' }));
  assert.ok(isDevtoolsKey({ key: 'I', ctrlKey: true, shiftKey: true }));
  assert.ok(isDevtoolsKey({ key: 'j', ctrlKey: true, shiftKey: true }));
  assert.ok(isDevtoolsKey({ key: 'i', metaKey: true, altKey: true }));
  assert.ok(isDevtoolsKey({ key: 'u', ctrlKey: true }));
  assert.ok(!isDevtoolsKey({ key: 'u' }));
  assert.ok(!isDevtoolsKey({ key: 'c', ctrlKey: true }));           // plain Ctrl+C is handled by the copy event
  assert.ok(!isDevtoolsKey({ key: 'Tab' }));
});

test('typing one character is fine, a long one-shot insert is not', () => {
  assert.strictEqual(isBigInsert('insertText', 'a'), false);
  assert.strictEqual(isBigInsert('insertText', '    '), false);      // the editor's Tab key
  assert.strictEqual(isBigInsert('insertText', 'x'.repeat(INTEGRITY.bigInsertChars + 1)), true);
  assert.strictEqual(isBigInsert('deleteContentBackward', null), false);
});