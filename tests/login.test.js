// Login / sign-up field rules (js/validate.js). Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { validateEmail, validatePassword, validateName } = require('../js/validate.js');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('UT-L1 empty email: "Email is required" with different wording for log in and create', () => {
  const a = validateEmail('', 'login'), b = validateEmail('', 'create');
  assert.ok(a.startsWith('Email is required.') && b.startsWith('Email is required.'));
  assert.notStrictEqual(a, b);
  assert.ok(validateEmail('   ', 'login').startsWith('Email is required.'));
});

test('UT-L2 email length: 50 passes, 51 is too long', () => {
  const e = (n) => 'a'.repeat(n - 12) + '@example.com';   // 12 chars after the local part
  assert.strictEqual(validateEmail(e(50), 'create'), '');
  assert.match(validateEmail(e(51), 'create'), /too long.*51/);
});

test('UT-L3 email format: bad shapes rejected, padded valid email passes', () => {
  for (const bad of ['plainaddress', 'a@b', 'a@b.c', 'a b@c.com', '@c.com']) {
    assert.strictEqual(validateEmail(bad, 'create'), 'Enter a valid email, like you@example.com.', bad);
  }
  assert.strictEqual(validateEmail('  you@example.com  ', 'create'), '');
});

test('UT-L4 create password length: 7 rejected, 8 and 32 pass, 33 rejected', () => {
  assert.match(validatePassword('abcde12', 'create'), /at least 8 characters.*7/);
  assert.strictEqual(validatePassword('abcdefg1', 'create'), '');
  assert.strictEqual(validatePassword('a'.repeat(31) + '1', 'create'), '');
  assert.match(validatePassword('a'.repeat(32) + '1', 'create'), /too long.*33/);
});

test('UT-L5 create or reset password needs a letter and a number', () => {
  for (const mode of ['create', 'reset']) {
    assert.strictEqual(validatePassword('abcdefgh', mode), 'Use at least one letter and one number.');
    assert.strictEqual(validatePassword('12345678', mode), 'Use at least one letter and one number.');
    assert.strictEqual(validatePassword('abcd1234', mode), '');
  }
});

test('UT-L6 log in: any non-empty password passes, empty is required', () => {
  assert.strictEqual(validatePassword('x', 'login'), '');
  assert.strictEqual(validatePassword('short', 'login'), '');
  assert.strictEqual(validatePassword('', 'login'), 'Password is required.');
});

test('UT-L7 player name length: 2 rejected, 3 and 20 pass, 21 rejected', () => {
  assert.match(validateName('ab'), /at least 3 characters.*2/);
  assert.strictEqual(validateName('abc'), '');
  assert.strictEqual(validateName('a'.repeat(20)), '');
  assert.match(validateName('a'.repeat(21)), /too long.*21/);
});

test('UT-L8 player name characters: letters, numbers, underscore only', () => {
  assert.strictEqual(validateName('Pixel_Hero9'), '');
  for (const bad of ['bad name', 'no!', 'a-b-c', 'hero😀x']) {
    assert.strictEqual(validateName(bad), 'Use only letters, numbers, and underscores (no spaces).', bad);
  }
  assert.ok(validateName('     ').startsWith('Player name is required.'));
});

test('UT-L9 wiring: login.html loads validate.js before login.js; login.js calls all three rules', () => {
  const html = read('login.html');
  const v = html.indexOf('js/validate.js'), l = html.indexOf('js/login.js');
  assert.ok(v > -1 && l > -1 && v < l, 'validate.js must load before login.js');
  const js = read('js/login.js');
  for (const fn of ['validateEmail(', 'validatePassword(', 'validateName(']) assert.ok(js.includes(fn), fn);
});