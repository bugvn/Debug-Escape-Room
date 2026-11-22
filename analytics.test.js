// Run with:  node --test
const test = require('node:test');
const assert = require('node:assert');
const { welch, tTwoSided, normalizeSessions, normalizeAttempts, normalizeIntegrity, analyze, insights, reportCSV, parseCSV, sampleData } = require('./analytics.js');

test('welch t-test matches a hand-checked example', () => {
  const r = welch([1, 2, 3, 4, 5], [2, 3, 4, 5, 6]);
  assert.ok(Math.abs(r.t - (-1)) < 1e-9);
  assert.ok(Math.abs(r.df - 8) < 1e-9);
  assert.ok(Math.abs(r.p - 0.3466) < 0.001);
  assert.ok(Math.abs(r.d - (-0.6325)) < 0.001);
});

test('t distribution p-values are sane', () => {
  assert.ok(Math.abs(tTwoSided(2.228, 10) - 0.05) < 0.001);   // classic critical value
  assert.ok(Math.abs(tTwoSided(0, 12) - 1) < 1e-9);
});

test('welch with too little data gives no p instead of a wrong one', () => {
  assert.strictEqual(welch([1], [2, 3]).p, null);
  assert.strictEqual(welch([2, 2], [2, 2]).p, null);
});

test('rows from Supabase / CSV are cleaned, in-progress games dropped', () => {
  const s = normalizeSessions([
    { participant: 'a1', study_group: 'adaptive', session_no: '1', level: 'BEGINNER', result: 'won', solved_count: '4', hints_used: '1', elapsed_sec: '200', submits: '5', submits_correct: '4' },
    { participant: 'a1', study_group: 'adaptive', session_no: '2', level: 'BEGINNER', result: 'in_progress' }
  ]);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].accuracy, 0.8);
  const a = normalizeAttempts([{ participant: 'a1', study_group: 'control', puzzle_id: 'x', category: 'Index', kind: 'run', is_correct: 't' },
    { participant: 'a1', study_group: 'control', puzzle_id: 'x', category: 'Index', kind: 'submit', is_correct: 't', attempt_no: '1' }]);
  assert.strictEqual(a.length, 1);            // test runs are not submits
  assert.strictEqual(a[0].ok, true);
});

test('csv parser handles quotes, commas and blank lines', () => {
  const rows = parseCSV('a,b\n1,"x, y"\n\n2,"say ""hi"""\n');
  assert.deepStrictEqual(rows, [{ a: '1', b: 'x, y' }, { a: '2', b: 'say "hi"' }]);
});

test('analyze: kpis, curve, categories and level filter', () => {
  const { sessions, attempts } = sampleData(3);
  const r = analyze(sessions, attempts);
  assert.strictEqual(r.kpis.adaptive.participants, 12);
  assert.strictEqual(r.kpis.control.participants, 12);
  assert.strictEqual(r.kpis.all.sessions, 144);
  assert.strictEqual(r.curve.labels.length, 6);
  assert.strictEqual(r.categories.length, 4);
  assert.ok(r.puzzles.every((p, i, a) => i === 0 || a[i - 1].success <= p.success));  // hardest first
  const only = analyze(sessions, attempts, { level: 'BEGINNER' });
  assert.ok(only.n.sessions < r.n.sessions && only.n.sessions > 0);
});

test('control group always stays at its start level in the simulation, adaptive moves', () => {
  const { sessions } = sampleData(5);
  const ctl = {};
  sessions.filter((s) => s.group === 'control').forEach((s) => { (ctl[s.participant] = ctl[s.participant] || new Set()).add(s.level); });
  Object.values(ctl).forEach((set) => assert.strictEqual(set.size, 1));
  assert.ok(sessions.filter((s) => s.group === 'adaptive').some((s) => s.level !== 'BEGINNER'));
});

test('sample data is repeatable for the same seed', () => {
  assert.deepStrictEqual(sampleData(9).sessions.slice(0, 5), sampleData(9).sessions.slice(0, 5));
});

test('insights and report always produce something readable', () => {
  const { sessions, attempts } = sampleData(7);
  const r = analyze(sessions, attempts);
  const ins = insights(r);
  assert.ok(ins.length >= 4 && ins.every((i) => i.text.length > 10));
  assert.ok(reportCSV(r).split('\n').length > 20);
  assert.strictEqual(insights(analyze([], []))[0].kind, 'info');   // empty data does not crash
});
test('integrity rows are cleaned and counted per group', () => {
  const ev = normalizeIntegrity([
    { participant: 'a1', study_group: 'adaptive', session_no: '1', event_type: 'paste', strike: 't' },
    { participant: 'a1', study_group: 'adaptive', session_no: '1', event_type: 'window_blur', away_ms: '4000', strike: 'true' },
    { participant: 'c1', study_group: 'control', session_no: '1', event_type: 'contextmenu', strike: 'f' },
    { participant: 'c1', study_group: 'control', session_no: '1', event_type: '' }     // no type: dropped
  ]);
  assert.strictEqual(ev.length, 3);
  const mk = (participant, group) => ({ participant, group, sessionNo: 1, level: 'BEGINNER', result: 'won', solved: 4, hints: 0, elapsed: 100, submits: 4, correct: 4, accuracy: 1 });
  const r = analyze([mk('a1', 'adaptive'), mk('c1', 'control')], [], {}, ev);
  assert.strictEqual(r.integrity.perGroup.adaptive.flaggedGames, 1);
  assert.strictEqual(r.integrity.perGroup.control.flaggedGames, 0);   // a free event is not a strike
  assert.strictEqual(r.integrity.awaySec, 4);
});

test('excluding flagged games removes them from every number', () => {
  const { sessions, attempts, integrity } = sampleData(7);
  const all = analyze(sessions, attempts, {}, integrity);
  const clean = analyze(sessions, attempts, { excludeStrikes: 1 }, integrity);
  assert.ok(all.integrity.flaggedGames > 0);
  assert.strictEqual(clean.n.sessions, all.n.sessions - clean.integrity.dropped);
  assert.ok(clean.integrity.dropped > 0 && clean.n.sessions < all.n.sessions);
  assert.ok(clean.n.attempts < all.n.attempts);
  assert.strictEqual(clean.integrity.perGroup.adaptive.flaggedGames + clean.integrity.perGroup.control.flaggedGames, 0);
  const strict = analyze(sessions, attempts, { excludeStrikes: 3 }, integrity);
  assert.ok(strict.n.sessions >= clean.n.sessions);                  // a higher bar drops fewer games
});

test('analysis without any integrity data still works and says so', () => {
  const { sessions, attempts } = sampleData(7);
  const r = analyze(sessions, attempts);
  assert.strictEqual(r.integrity.hasData, false);
  assert.ok(r.players.length === 24 && r.players.every((p) => p.strikes === 0));
  assert.ok(!insights(r).some((i) => i.text.startsWith('Anti-cheat')));
});

test('insights and report mention integrity when it exists', () => {
  const { sessions, attempts, integrity } = sampleData(7);
  const r = analyze(sessions, attempts, {}, integrity);
  assert.ok(insights(r).some((i) => i.text.startsWith('Anti-cheat')));
  assert.ok(reportCSV(r).includes('integrity_event'));
});