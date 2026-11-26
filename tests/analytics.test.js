// Run with:  node --test
const test = require('node:test');
const assert = require('node:assert');
const { mean, sd, median, desc, normalizeSessions, normalizeAttempts, normalizeIntegrity, analyze, insights, reportCSV, parseCSV, sampleData } = require('../js/analytics.js');

const sess = (participant, sessionNo, o = {}) => ({ participant, sessionNo, startLevel: 'BEGINNER', level: 'BEGINNER', nextLevel: 'BEGINNER', result: 'won', solved: 4, hints: 0, elapsed: 100, submits: 4, correct: 4, accuracy: 1, ...o });
const att = (participant, sessionNo, puzzleId, category, attemptNo, ok) => ({ participant, sessionNo, puzzleId, category, kind: 'submit', attemptNo, ok, tag: ok ? null : 'IndexError' });

test('descriptive helpers match hand-checked values and ignore nulls', () => {
  assert.strictEqual(mean([1, 2, 3, null]), 2);
  assert.ok(Math.abs(sd([2, 4, 4, 4, 5, 5, 7, 9]) - 2.13809) < 1e-4);   // sample SD
  assert.strictEqual(median([5, 1, 3]), 3);
  assert.strictEqual(median([1, 2, 3, 4]), 2.5);
  assert.strictEqual(sd([5]), null);
  assert.deepStrictEqual(desc([]), { n: 0, mean: null, sd: null, median: null, min: null, max: null });
});

test('rows from Supabase / CSV are cleaned, in-progress games dropped, no group column needed', () => {
  const s = normalizeSessions([
    { participant: 'a1', start_level: 'INTERMEDIATE', session_no: '1', level: 'BEGINNER', result: 'won', solved_count: '4', hints_used: '1', elapsed_sec: '200', submits: '5', submits_correct: '4' },
    { participant: 'a1', session_no: '2', level: 'BEGINNER', result: 'in_progress' }
  ]);
  assert.strictEqual(s.length, 1);
  assert.strictEqual(s[0].accuracy, 0.8);
  assert.strictEqual(s[0].startLevel, 'INTERMEDIATE');
  assert.ok(!('group' in s[0]));
  const a = normalizeAttempts([{ participant: 'a1', puzzle_id: 'x', category: 'Index', kind: 'run', is_correct: 't' },
    { participant: 'a1', puzzle_id: 'x', category: 'Index', kind: 'submit', is_correct: 't', attempt_no: '1' }]);
  assert.strictEqual(a.length, 1);            // test runs are not submits
  assert.strictEqual(a[0].ok, true);
});

test('csv parser handles quotes, commas and blank lines', () => {
  assert.deepStrictEqual(parseCSV('a,b\n1,"x, y"\n\n2,"say ""hi"""\n'), [{ a: '1', b: 'x, y' }, { a: '2', b: 'say "hi"' }]);
});

test('analyze: one group, kpis, per-room means and SDs are hand-checkable', () => {
  const s = [sess('p1', 1, { accuracy: 0.5, hints: 2, elapsed: 60 }), sess('p2', 1, { accuracy: 1, hints: 0, elapsed: 120, result: 'left' }),
             sess('p1', 2, { accuracy: 1 }), sess('p2', 2, { accuracy: 0.75 })];
  const r = analyze(s, []);
  assert.strictEqual(r.kpis.participants, 2);
  assert.strictEqual(r.kpis.rooms, 4);
  assert.strictEqual(r.byRoom.length, 2);
  assert.strictEqual(r.byRoom[0].accuracy.mean, 75);
  assert.ok(Math.abs(r.byRoom[0].accuracy.sd - 35.3553) < 1e-3);
  assert.strictEqual(r.byRoom[0].hints.mean, 1);
  assert.strictEqual(r.byRoom[0].time.mean, 90);
  assert.strictEqual(r.byRoom[0].giveUp, 50);
  assert.strictEqual(r.outcome.escaped, 3);
  assert.strictEqual(r.outcome.left, 1);
  assert.ok(!('control' in r.kpis) && !('test' in r));      // no control group, no significance test
});

test('first-attempt success and attempts per puzzle come from the submits', () => {
  const s = [sess('p1', 1, { submits: 4, correct: 2, accuracy: 0.5 })];
  const a = [att('p1', 1, 'A', 'Index', 1, true), att('p1', 1, 'B', 'Type', 1, false), att('p1', 1, 'B', 'Type', 2, false), att('p1', 1, 'B', 'Type', 3, true)];
  const r = analyze(s, a);
  assert.strictEqual(r.byRoom[0].firstTry.mean, 50);          // A on first try, B not
  assert.strictEqual(r.byRoom[0].attempts.mean, 2);           // 4 submits / 2 puzzles
  assert.strictEqual(r.kpis.firstTryRate, 0.5);
  const idx = r.categories.find((c) => c.category === 'Index'), ty = r.categories.find((c) => c.category === 'Type');
  assert.strictEqual(idx.wrongPct, 0);
  assert.ok(Math.abs(ty.wrongPct - 66.7) < 0.1);
});

test('first room vs last room: improved / same / dropped use a 5 point band', () => {
  const s = [sess('up', 1, { accuracy: 0.4 }), sess('up', 2, { accuracy: 0.9 }),
             sess('eq', 1, { accuracy: 0.8 }), sess('eq', 2, { accuracy: 0.84 }),
             sess('dn', 1, { accuracy: 0.9 }), sess('dn', 2, { accuracy: 0.5 }),
             sess('one', 1, { accuracy: 1 })];                       // 1 room: not counted
  const im = analyze(s, []).improvement;
  assert.deepStrictEqual([im.n, im.improved, im.same, im.declined], [3, 1, 1, 1]);
});

test('weakest topic per player needs 2+ submits in a topic', () => {
  const s = [sess('p1', 1), sess('p2', 1)];
  const a = [att('p1', 1, 'A', 'Index', 1, false), att('p1', 1, 'A', 'Index', 2, false), att('p1', 1, 'B', 'Type', 1, true), att('p1', 1, 'B', 'Type', 2, true),
             att('p2', 1, 'C', 'Scope', 1, false)];                  // only 1 submit: no weakest
  const r = analyze(s, a);
  assert.strictEqual(r.weakestCount.Index, 1);
  assert.strictEqual(Object.values(r.weakestCount).reduce((x, y) => x + y, 0), 1);
  const p1 = r.players.find((p) => p.participant === 'p1');
  assert.strictEqual(p1.weakest, 'Index');
});

test('rule check re-runs js/adaptive.js on the logged submits and finds a wrong next level', () => {
  const ok = sess('p1', 1, { nextLevel: 'INTERMEDIATE', elapsed: 100, hints: 0 });    // 4/4 correct, fast: should go up
  const bad = sess('p2', 1, { nextLevel: 'ADVANCED' });                                // same data but jumped two levels
  const a = ['p1', 'p2'].flatMap((p) => [1, 2, 3, 4].map((i) => att(p, 1, 'P' + i, 'Index', 1, true)));
  const r = analyze([ok, bad], a);
  assert.strictEqual(r.adaptation.audit.checked, 2);
  assert.strictEqual(r.adaptation.audit.matched, 1);
  assert.strictEqual(r.adaptation.audit.mismatches[0].participant, 'p2');
  assert.strictEqual(r.adaptation.audit.mismatches[0].expected, 'INTERMEDIATE');
  assert.strictEqual(r.adaptation.moves.up, 2);
  assert.strictEqual(analyze([ok], []).adaptation.audit.checked, 0);                   // no submits: cannot check, says so
});

test('room level and starting level filters narrow every number', () => {
  const s = [sess('p1', 1, { level: 'BEGINNER', startLevel: 'BEGINNER' }), sess('p2', 1, { level: 'ADVANCED', startLevel: 'ADVANCED' })];
  assert.strictEqual(analyze(s, [], { level: 'ADVANCED' }).n.sessions, 1);
  assert.strictEqual(analyze(s, [], { start: 'BEGINNER' }).kpis.participants, 1);
  assert.strictEqual(analyze(s, []).byStart.find((x) => x.level === 'ADVANCED').rooms, 1);
});

test('sample data: 30 players, 3 rooms each, repeatable, rules agree with the log', () => {
  const { sessions, attempts, integrity } = sampleData(3);
  const r = analyze(sessions, attempts, {}, integrity);
  assert.strictEqual(r.kpis.participants, 30);
  assert.strictEqual(r.kpis.rooms, 90);
  assert.strictEqual(r.byRoom.length, 3);
  assert.strictEqual(r.categories.length, 4);
  assert.ok(r.puzzles.every((p, i, x) => i === 0 || x[i - 1].success <= p.success));  // hardest first
  assert.strictEqual(r.adaptation.audit.matched, r.adaptation.audit.checked);
  assert.deepStrictEqual(sampleData(9).sessions.slice(0, 5), sampleData(9).sessions.slice(0, 5));
});

test('insights are descriptive: no significance claims, no control group, empty data does not crash', () => {
  const { sessions, attempts, integrity } = sampleData(7);
  const ins = insights(analyze(sessions, attempts, {}, integrity));
  assert.ok(ins.length >= 6 && ins.every((i) => i.text.length > 10));
  const all = ins.map((i) => i.text).join(' ').toLowerCase();
  assert.ok(!/control|significan|p=|welch/.test(all));
  assert.ok(all.includes('not credited to the adaptive rules'));
  assert.strictEqual(insights(analyze([], []))[0].kind, 'info');
});

test('report CSV has mean, SD and n columns and no control column', () => {
  const { sessions, attempts, integrity } = sampleData(7);
  const csv = reportCSV(analyze(sessions, attempts, {}, integrity));
  assert.strictEqual(csv.split('\n')[0], 'section,metric,mean_or_value,sd,n');
  assert.ok(csv.split('\n').length > 40 && csv.includes('by_room') && csv.includes('integrity_event'));
  assert.ok(!/control/i.test(csv));
});

test('integrity rows are cleaned; a free event is not a strike', () => {
  const ev = normalizeIntegrity([
    { participant: 'a1', session_no: '1', event_type: 'paste', strike: 't' },
    { participant: 'a1', session_no: '1', event_type: 'window_blur', away_ms: '4000', strike: 'true' },
    { participant: 'c1', session_no: '1', event_type: 'contextmenu', strike: 'f' },
    { participant: 'c1', session_no: '1', event_type: '' }                   // no type: dropped
  ]);
  assert.strictEqual(ev.length, 3);
  const r = analyze([sess('a1', 1), sess('c1', 1)], [], {}, ev);
  assert.strictEqual(r.integrity.flaggedGames, 1);
  assert.strictEqual(r.integrity.strikes, 2);
  assert.strictEqual(r.integrity.awaySec, 4);
  assert.strictEqual(r.integrity.flaggedByRoom[0].flagged, 1);
});

test('excluding flagged games removes them from every number', () => {
  const { sessions, attempts, integrity } = sampleData(7);
  const all = analyze(sessions, attempts, {}, integrity);
  const clean = analyze(sessions, attempts, { excludeStrikes: 1 }, integrity);
  assert.ok(all.integrity.flaggedGames > 0 && clean.integrity.dropped > 0);
  assert.strictEqual(clean.n.sessions, all.n.sessions - clean.integrity.dropped);
  assert.ok(clean.n.attempts < all.n.attempts);
  assert.strictEqual(clean.integrity.strikes, 0);
  assert.ok(analyze(sessions, attempts, { excludeStrikes: 3 }, integrity).n.sessions >= clean.n.sessions);
});

test('analysis without any integrity data still works and says so', () => {
  const { sessions, attempts } = sampleData(7);
  const r = analyze(sessions, attempts);
  assert.strictEqual(r.integrity.hasData, false);
  assert.ok(r.players.length === 30 && r.players.every((p) => p.strikes === 0));
  assert.ok(!insights(r).some((i) => i.text.startsWith('Anti-cheat')));
});