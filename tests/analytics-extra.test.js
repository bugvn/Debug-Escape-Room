// Extra analytics edge cases (js/analytics.js). Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const { mean, sd, median, normalizeSessions, analyze, insights, reportCSV, parseCSV, sampleData } = require('../js/analytics.js');

test('UT-A1 helpers are null-safe: empty or all-null input gives null, not NaN', () => {
  for (const f of [mean, sd, median]) {
    assert.strictEqual(f([]), null);
    assert.strictEqual(f([null, undefined]), null);
  }
  assert.strictEqual(mean([null, 4, undefined, 6]), 5);
});

test('UT-A5 empty data: zero KPIs, an insights list and a CSV string, no crash', () => {
  const r = analyze([], []);
  assert.strictEqual(r.kpis.participants, 0);
  assert.strictEqual(r.kpis.rooms, 0);
  const ins = insights(r);
  assert.ok(Array.isArray(ins) && ins.length >= 1);
  const csv = reportCSV(r);
  assert.strictEqual(typeof csv, 'string');
  assert.ok(csv.startsWith('section,metric,mean_or_value,sd,n'));
});

test('UT-A6 only unfinished games: 0 rooms counted', () => {
  const s = normalizeSessions([
    { participant: 'a', session_no: '1', level: 'BEGINNER', result: 'in_progress' },
    { participant: 'b', session_no: '1', level: 'BEGINNER', result: 'in_progress' }
  ]);
  assert.strictEqual(s.length, 0);
  assert.strictEqual(analyze(s, []).kpis.rooms, 0);
});

test('UT-A3 parseCSV reads Windows CRLF line endings', () => {
  assert.deepStrictEqual(parseCSV('a,b\r\n1,2\r\n3,4\r\n'), [{ a: '1', b: '2' }, { a: '3', b: '4' }]);
});

test('UT-A3 parseCSV: header only gives no rows, empty text gives no rows', () => {
  assert.deepStrictEqual(parseCSV('a,b\n'), []);
  assert.deepStrictEqual(parseCSV(''), []);
});

test('UT-A4 level filter narrows every number', () => {
  const { sessions, attempts } = sampleData(5);
  const all = analyze(sessions, attempts);
  const adv = analyze(sessions, attempts, { level: 'ADVANCED' });
  assert.ok(adv.n.sessions > 0 && adv.n.sessions < all.n.sessions);
  assert.ok(adv.kpis.rooms < all.kpis.rooms);
});

test('UT-A8 same seed gives same data; analysis and report run end to end', () => {
  const a = sampleData(11), b = sampleData(11);
  assert.deepStrictEqual(a.sessions, b.sessions);
  assert.deepStrictEqual(a.attempts, b.attempts);
  const r = analyze(a.sessions, a.attempts, {}, a.integrity);
  assert.ok(r.kpis.rooms > 0);
  assert.ok(reportCSV(r).split('\n').length > 10);
  assert.notDeepStrictEqual(sampleData(12).sessions, a.sessions);
});