// DATA ANALYTICS for REMEDIATE. Pure functions (no page code, no database), so node --test can check them.
//
// The study has ONE group of players (no control group) and reports DESCRIPTIVE statistics only
// (mean, SD, median, counts), as written in Chapter 3.6c. Nothing here claims the adaptive rules caused a change.
//
//   normalizeSessions / normalizeAttempts   rows from Supabase or a CSV  ->  clean objects
//   analyze(sessions, attempts, opts)       everything the analytics page shows
//   insights(result)                        plain-language findings + recommendations
//   reportCSV(result)                       flat summary file for the paper / slides
//   sampleData(seed)                        SIMULATED players, for demos only (never mix with real data)
//
// Data sources are the researcher views: research_sessions, research_attempts (schema.sql) and research_integrity (migration-03.sql, anti-cheat log).
// A "room" = one game. Room 1, Room 2, ... = the player's 1st, 2nd, ... game (session_no).
// In the browser, puzzles.js and adaptive.js must be loaded first (same rule as adaptive.js).

const _P = (typeof PUZZLE_BANK !== 'undefined') ? { PUZZLE_BANK, LEVELS } : require('./puzzles.js');
const _A = (typeof pickRoom !== 'undefined') ? { pickRoom, nextLevel, weakCategories } : require('./adaptive.js');
const A_LEVELS = _P.LEVELS;
const A_CATS = ['Index', 'Type', 'Recursion', 'Scope'];

/* ---------------- small statistics helpers (descriptive only) ---------------- */
const nums = (a) => a.filter((x) => x !== null && x !== undefined && Number.isFinite(x));
const mean = (a) => { a = nums(a); return a.length ? a.reduce((s, x) => s + x, 0) / a.length : null; };
const sd = (a) => {
  a = nums(a);
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
};
const median = (a) => {
  a = nums(a);
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
// n, mean, SD, median, min, max of a list (nulls ignored)
const desc = (a) => { a = nums(a); return { n: a.length, mean: mean(a), sd: sd(a), median: median(a), min: a.length ? Math.min(...a) : null, max: a.length ? Math.max(...a) : null }; };
const pct = (x) => (x === null || x === undefined ? null : Math.round(x * 1000) / 10);
const r2 = (x) => (x === null || x === undefined ? null : Math.round(x * 100) / 100);

/* ---------------- cleaning rows from Supabase or CSV ---------------- */
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const toBool = (v) => v === true || v === 'true' || v === 't' || v === 'TRUE' || v === 1 || v === '1';
const lvl = (v) => (A_LEVELS.includes(v) ? v : null);

function normalizeSessions(rows) {
  return (rows || []).map((r) => {
    const submits = toNum(r.submits) || 0, correct = toNum(r.submits_correct) || 0;
    return {
      participant: String(r.participant),
      sessionNo: toNum(r.session_no), sessionId: toNum(r.session_id),
      startLevel: lvl(r.start_level), level: r.level, nextLevel: r.next_level || null, result: r.result,
      solved: toNum(r.solved_count) || 0, hints: toNum(r.hints_used) || 0, elapsed: toNum(r.elapsed_sec) || 0,
      submits, correct, accuracy: submits ? correct / submits : null
    };
  }).filter((s) => s.result !== 'in_progress' && s.sessionNo !== null);
}
function normalizeAttempts(rows) {
  return (rows || []).map((r) => ({
    participant: String(r.participant),
    sessionNo: toNum(r.session_no), puzzleId: r.puzzle_id, category: r.category, kind: r.kind || 'submit',
    attemptNo: toNum(r.attempt_no), ok: toBool(r.is_correct), tag: r.mistake_tag || null
  })).filter((a) => a.kind === 'submit' && a.category);
}
// anti-cheat log (research_integrity): one row per blocked or suspicious event
function normalizeIntegrity(rows) {
  return (rows || []).map((r) => ({
    participant: String(r.participant),
    sessionNo: toNum(r.session_no), type: r.event_type, awayMs: toNum(r.away_ms), strike: toBool(r.strike)
  })).filter((e) => e.type && e.sessionNo !== null);
}

/* ---------------- the analysis ---------------- */
const key = (x) => x.participant + '#' + x.sessionNo;
const levelIdx = (l) => Math.max(0, A_LEVELS.indexOf(l));

// per game: first-attempt success and attempts per puzzle, from that game's submits
function perGameFromAttempts(attempts) {
  const games = {};
  attempts.forEach((a) => {
    const g = games[key(a)] || (games[key(a)] = {});
    const p = g[a.puzzleId] || (g[a.puzzleId] = { first: null, firstNo: Infinity, n: 0 });
    p.n++;
    if (a.attemptNo !== null && a.attemptNo < p.firstNo) { p.firstNo = a.attemptNo; p.first = a.ok; }
  });
  const out = {};
  Object.entries(games).forEach(([k, g]) => {
    const ps = Object.values(g), submits = ps.reduce((s, p) => s + p.n, 0);
    out[k] = { firstTry: ps.filter((p) => p.first === true).length / ps.length, attemptsPer: submits / ps.length };
  });
  return out;
}

function groupKpis(sessions, attempts) {
  const won = sessions.filter((s) => s.result === 'won');
  const submits = sessions.reduce((s, x) => s + x.submits, 0), correct = sessions.reduce((s, x) => s + x.correct, 0);
  const first = {};
  attempts.forEach((a) => { const k = key(a) + '|' + a.puzzleId; if (a.attemptNo !== null && (!first[k] || a.attemptNo < first[k].no)) first[k] = { no: a.attemptNo, ok: a.ok }; });
  const fv = Object.values(first);
  return {
    participants: new Set(sessions.map((s) => s.participant)).size,
    rooms: sessions.length,
    escapeRate: sessions.length ? won.length / sessions.length : null,
    giveUpRate: sessions.length ? sessions.filter((s) => s.result === 'left').length / sessions.length : null,
    accuracy: submits ? correct / submits : null,
    firstTryRate: fv.length ? fv.filter((x) => x.ok).length / fv.length : null,
    avgEscapeSec: mean(won.map((s) => s.elapsed)),
    avgHints: mean(sessions.map((s) => s.hints))
  };
}

// opts.level:         only rooms played at this level ('' = all)
// opts.start:         only players who started at this level, the stand-in for pretest placement ('' = all)
// opts.excludeStrikes: drop games with this many integrity strikes or more (0 / missing = keep every game)
function analyze(sessionsIn, attemptsIn, opts = {}, integrityIn = []) {
  const lv = opts.level || '', st = opts.start || '';
  const strikesBy = {};
  integrityIn.filter((e) => e.strike).forEach((e) => { strikesBy[key(e)] = (strikesBy[key(e)] || 0) + 1; });
  const cut = opts.excludeStrikes || 0;
  const flagged = (s) => cut > 0 && (strikesBy[key(s)] || 0) >= cut;
  let sessions = sessionsIn;
  if (lv) sessions = sessions.filter((s) => s.level === lv);
  if (st) sessions = sessions.filter((s) => s.startLevel === st);
  const before = sessions.length;
  sessions = sessions.filter((s) => !flagged(s));
  const dropped = before - sessions.length;
  const keep = new Set(sessions.map(key));
  const attempts = (lv || st || cut) ? attemptsIn.filter((a) => keep.has(key(a))) : attemptsIn;

  const pg = perGameFromAttempts(attempts);
  const rows = sessions.map((s) => ({ ...s, ...(pg[key(s)] || { firstTry: null, attemptsPer: null }) }));
  const metrics = (list) => ({
    accuracy: desc(list.map((s) => (s.accuracy === null ? null : s.accuracy * 100))),
    firstTry: desc(list.map((s) => (s.firstTry === null ? null : s.firstTry * 100))),
    attempts: desc(list.map((s) => s.attemptsPer)),
    time: desc(list.map((s) => s.elapsed)),
    hints: desc(list.map((s) => s.hints)),
    solved: desc(list.map((s) => s.solved))
  });

  const kpis = groupKpis(sessions, attempts);
  const stats = metrics(rows);                       // mean / SD / median over all rooms shown
  const outcome = { escaped: sessions.filter((s) => s.result === 'won').length, left: sessions.filter((s) => s.result === 'left').length };

  // by room number: how performance moves through a playthrough (RQ3). Descriptive, not a cause.
  const maxNo = Math.min(8, Math.max(0, ...sessions.map((s) => s.sessionNo)));
  const byRoom = [];
  for (let n = 1; n <= maxNo; n++) {
    const g = rows.filter((s) => s.sessionNo === n);
    const m = metrics(g);
    byRoom.push({ room: n, label: 'Room ' + n, n: g.length, players: new Set(g.map((s) => s.participant)).size, ...m,
      giveUp: g.length ? pct(g.filter((s) => s.result === 'left').length / g.length) : null,
      escape: g.length ? pct(g.filter((s) => s.result === 'won').length / g.length) : null });
  }

  // by starting level (the pretest placement stand-in): who starts where, and how they do
  const byStart = A_LEVELS.map((L) => {
    const g = rows.filter((s) => s.startLevel === L);
    return { level: L, players: new Set(g.map((s) => s.participant)).size, rooms: g.length, ...metrics(g) };
  });

  // weakness by topic (RQ1): share of wrong submits, and first-attempt success per topic
  const firstOf = {};
  attempts.forEach((a) => { const k = key(a) + '|' + a.puzzleId; if (a.attemptNo !== null && (!firstOf[k] || a.attemptNo < firstOf[k].no)) firstOf[k] = { no: a.attemptNo, ok: a.ok, cat: a.category }; });
  const categories = A_CATS.map((c) => {
    const x = attempts.filter((a) => a.category === c), f = Object.values(firstOf).filter((o) => o.cat === c);
    return { category: c, submits: x.length, wrong: x.filter((a) => !a.ok).length,
      wrongPct: x.length ? pct(x.filter((a) => !a.ok).length / x.length) : null,
      firstTryPct: f.length ? pct(f.filter((o) => o.ok).length / f.length) : null };
  });

  const tagCount = {};
  attempts.filter((a) => !a.ok && a.tag).forEach((a) => { tagCount[a.tag] = (tagCount[a.tag] || 0) + 1; });
  const mistakes = Object.entries(tagCount).sort((a, b) => b[1] - a[1]).map(([tag, n]) => ({ tag, n }));

  // puzzle difficulty: success rate of submits per puzzle (use it to retune the bank)
  const titles = Object.fromEntries(_P.PUZZLE_BANK.map((p) => [p.id, p.title]));
  const pz = {};
  attempts.forEach((a) => {
    const o = pz[a.puzzleId] || (pz[a.puzzleId] = { id: a.puzzleId, title: titles[a.puzzleId] || a.puzzleId, n: 0, ok: 0, category: a.category });
    o.n++; if (a.ok) o.ok++;
  });
  const puzzles = Object.values(pz).map((o) => ({ ...o, success: pct(o.ok / o.n) })).sort((a, b) => a.success - b.success);

  // per player: first room vs last room, strongest / weakest topic (the post-game debrief)
  const byPlayer = {};
  rows.forEach((s) => { (byPlayer[s.participant] = byPlayer[s.participant] || []).push(s); });
  Object.values(byPlayer).forEach((l) => l.sort((a, b) => a.sessionNo - b.sessionNo));
  const catByPlayer = {};
  attempts.forEach((a) => { const o = (catByPlayer[a.participant] = catByPlayer[a.participant] || {}); const c = o[a.category] || (o[a.category] = { n: 0, wrong: 0 }); c.n++; if (!a.ok) c.wrong++; });
  const debrief = (p) => {
    const cs = Object.entries(catByPlayer[p] || {}).filter(([, c]) => c.n >= 2).map(([cat, c]) => ({ cat, n: c.n, wrong: c.wrong, rate: c.wrong / c.n }));
    if (!cs.length) return { weakest: null, strongest: null };
    const w = cs.slice().sort((a, b) => b.rate - a.rate || b.wrong - a.wrong || a.cat.localeCompare(b.cat));
    const s = cs.slice().sort((a, b) => a.rate - b.rate || b.n - a.n || a.cat.localeCompare(b.cat));
    return { weakest: w[0].cat, strongest: cs.length > 1 ? s[0].cat : null };
  };
  const weakestCount = Object.fromEntries(A_CATS.map((c) => [c, 0]));
  Object.keys(byPlayer).forEach((p) => { const w = debrief(p).weakest; if (w && weakestCount[w] !== undefined) weakestCount[w]++; });

  const gain = [];
  Object.values(byPlayer).forEach((l) => {
    const ok = l.filter((s) => s.accuracy !== null);
    if (ok.length >= 2) gain.push((ok[ok.length - 1].accuracy - ok[0].accuracy) * 100);
  });
  const SAME = 5;                                     // within +-5 points counts as "about the same"
  const change = { improved: gain.filter((x) => x > SAME).length, same: gain.filter((x) => Math.abs(x) <= SAME).length, declined: gain.filter((x) => x < -SAME).length };
  const improvement = { ...desc(gain), ...change };

  // adaptation (RQ2): what the rules did after each room, and whether the logged next level follows the rules
  const moves = { up: 0, stay: 0, down: 0 };
  const levelByRoom = byRoom.map((r) => ({ label: r.label, ...Object.fromEntries(A_LEVELS.map((L) => [L, rows.filter((s) => s.sessionNo === r.room && s.level === L).length])) }));
  const attBy = {};
  attempts.forEach((a) => { (attBy[key(a)] = attBy[key(a)] || []).push({ kind: 'submit', is_correct: a.ok }); });
  const audit = { checked: 0, matched: 0, mismatches: [] };
  rows.forEach((s) => {
    if (!s.nextLevel) return;
    const d = levelIdx(s.nextLevel) - levelIdx(s.level);
    moves[d > 0 ? 'up' : d < 0 ? 'down' : 'stay']++;
    if (!attBy[key(s)]) return;                       // cannot re-run the rules without that game's submits
    const want = _A.nextLevel({ level: s.level, result: s.result, solved_count: s.solved, hints_used: s.hints, elapsed_sec: s.elapsed }, attBy[key(s)]);
    audit.checked++;
    if (want === s.nextLevel) audit.matched++;
    else if (audit.mismatches.length < 5) audit.mismatches.push({ participant: s.participant, room: s.sessionNo, logged: s.nextLevel, expected: want });
  });
  const lastOf = {};
  rows.forEach((s) => { if (!lastOf[s.participant] || s.sessionNo > lastOf[s.participant].sessionNo) lastOf[s.participant] = s; });
  const levelEnd = Object.fromEntries(A_LEVELS.map((L) => [L, 0]));
  Object.values(lastOf).forEach((s) => { const k = s.nextLevel || s.level; if (levelEnd[k] !== undefined) levelEnd[k]++; });
  const adaptation = { moves, levelByRoom, audit, levelEnd };

  // integrity: how often, what kind, and in which room (over the games that are kept)
  const events = integrityIn.filter((e) => keep.has(key(e)));
  const typeCount = {};
  events.forEach((e) => { typeCount[e.type] = (typeCount[e.type] || 0) + 1; });
  const struckAll = new Set(integrityIn.filter((e) => e.strike).map(key));
  const struckKept = new Set(events.filter((e) => e.strike).map(key));
  const flaggedByRoom = byRoom.map((r) => {
    const g = sessions.filter((s) => s.sessionNo === r.room);
    return { label: r.label, games: g.length, flagged: g.filter((s) => struckKept.has(key(s))).length };
  });
  const integrity = {
    hasData: integrityIn.length > 0,
    events: Object.entries(typeCount).sort((a, b) => b[1] - a[1]).map(([type, n]) => ({ type, n })),
    strikes: events.filter((e) => e.strike).length,
    flaggedByRoom,
    flaggedGames: sessionsIn.filter((s) => struckAll.has(key(s))).length, totalGames: sessionsIn.length,
    awaySec: events.filter((e) => e.awayMs !== null).reduce((s, e) => s + e.awayMs, 0) / 1000,
    autoEnded: events.filter((e) => e.type === 'auto_end').length,
    dropped
  };

  // one row per player for the explorer table
  const players = Object.entries(byPlayer).map(([p, l]) => {
    const sub = l.reduce((s, x) => s + x.submits, 0), ok = l.reduce((s, x) => s + x.correct, 0), last = l[l.length - 1];
    const d = debrief(p);
    return { participant: p, startLevel: l[0].startLevel, rooms: l.length, escapeRate: l.filter((s) => s.result === 'won').length / l.length,
      accuracy: sub ? ok / sub : null, firstTry: mean(l.map((s) => s.firstTry)), hints: mean(l.map((s) => s.hints)),
      weakest: d.weakest, level: last.nextLevel || last.level, strikes: l.reduce((s, x) => s + (strikesBy[key(x)] || 0), 0) };
  });

  return { kpis, stats, outcome, byRoom, byStart, categories, mistakes, puzzles, improvement, weakestCount, adaptation, integrity, players,
    n: { sessions: sessions.length, attempts: attempts.length, players: players.length } };
}

/* ---------------- plain-language findings ---------------- */
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const signed = (x) => (x >= 0 ? '+' : '') + f1(x);
const TARGET_PLAYERS = 30;                           // sample size in Chapter 3.6d

function insights(r) {
  const out = [];
  if (!r.n.sessions) return [{ kind: 'info', text: 'No finished games yet. Load data to see findings.' }];
  if (r.kpis.participants < TARGET_PLAYERS)
    out.push({ kind: 'info', text: `${r.kpis.participants} players so far. The study plans ${TARGET_PLAYERS}, so treat every number below as early.` });

  const rooms = r.byRoom.filter((x) => x.accuracy.mean !== null);
  if (rooms.length >= 2) {
    const a = rooms[0], b = rooms[rooms.length - 1], d = b.accuracy.mean - a.accuracy.mean;
    out.push({ kind: d > 0 ? 'good' : 'info', text: `Mean accuracy went from ${f1(a.accuracy.mean)}% in ${a.label} (SD ${f1(a.accuracy.sd ?? 0)}, n=${a.n}) to ${f1(b.accuracy.mean)}% in ${b.label} (SD ${f1(b.accuracy.sd ?? 0)}, n=${b.n}), a change of ${signed(d)} points. ` +
      'This is a description only. Players get different puzzles, so the change is not credited to the adaptive rules.' });
  }
  const im = r.improvement;
  if (im.n) out.push({ kind: 'info', text: `Of ${im.n} players with 2+ rooms, ${im.improved} improved, ${im.same} stayed about the same and ${im.declined} dropped by more than 5 points between their first and last room (mean ${signed(im.mean)} points, SD ${im.sd === null ? '--' : f1(im.sd)}).` });

  const k = r.kpis;
  if (k.escapeRate !== null) out.push({ kind: k.giveUpRate > 0.3 ? 'warn' : 'info', text: `${pct(k.escapeRate)}% of rooms ended in an escape and ${pct(k.giveUpRate)}% were given up or closed. Mean hints per room: ${f1(r.stats.hints.mean ?? 0)}.` });

  const h1 = rooms[0], hN = rooms[rooms.length - 1];
  if (rooms.length >= 2 && h1.hints.mean !== null && hN.hints.mean !== null)
    out.push({ kind: 'info', text: `Hints per room: ${f1(h1.hints.mean)} in ${h1.label} vs ${f1(hN.hints.mean)} in ${hN.label}. Fewer hints at the same accuracy would suggest players lean less on help.` });

  const cats = r.categories.filter((x) => x.wrongPct !== null).sort((x, y) => y.wrongPct - x.wrongPct);
  if (cats.length) out.push({ kind: 'warn', text: `Hardest topic overall: ${cats[0].category} (${cats[0].wrongPct}% of submits wrong). Recommendation: strengthen the ${cats[0].category} lesson and add more ${cats[0].category} puzzle variants.` });
  const wk = Object.entries(r.weakestCount).sort((a, b) => b[1] - a[1]);
  if (wk[0] && wk[0][1] > 0) out.push({ kind: 'info', text: `${wk[0][1]} of ${r.n.players} players have ${wk[0][0]} as their weakest topic. This is the list the post-game debrief shows.` });

  const hard = r.puzzles.filter((p) => p.n >= 5);
  if (hard.length) {
    const h = hard[0];
    out.push({ kind: 'warn', text: `Hardest puzzle: "${h.title}" (${h.success}% of submits correct, n=${h.n}). Review its hints and story. If it is much harder than its level, move it up a level.` });
    const easy = hard[hard.length - 1];
    if (easy.success >= 90) out.push({ kind: 'info', text: `Easiest puzzle: "${easy.title}" (${easy.success}% correct). If it sits in a higher level than its difficulty, move it down.` });
  }
  if (r.mistakes.length) out.push({ kind: 'info', text: `Most common mistake: ${r.mistakes[0].tag} (${r.mistakes[0].n} times). The post-game recommendations should target it first.` });

  const ad = r.adaptation, mv = ad.moves, mt = mv.up + mv.stay + mv.down;
  if (mt) out.push({ kind: 'info', text: `After ${mt} rooms the rules moved the player up ${mv.up} times, kept the level ${mv.stay} times and moved down ${mv.down} times.` });
  if (ad.audit.checked) {
    const ok = ad.audit.matched === ad.audit.checked;
    out.push({ kind: ok ? 'good' : 'warn', text: `Rule check: the logged next level matches the adaptation rules in ${ad.audit.matched} of ${ad.audit.checked} rooms.` + (ok ? '' : ' The mismatches are listed on the Adaptation tab. Fix them before presenting.') });
  }
  const stuck = ad.levelEnd.BEGINNER, total = Object.values(ad.levelEnd).reduce((s, x) => s + x, 0);
  if (total >= 4 && stuck / total > 0.4) out.push({ kind: 'warn', text: `${Math.round(100 * stuck / total)}% of players are still at BEGINNER after their last room. The promotion rules (75% accuracy, 1 hint, under par time) may be too strict.` });

  const ig = r.integrity;
  if (ig && ig.hasData) {
    const pc1 = ig.totalGames ? Math.round(1000 * ig.flaggedGames / ig.totalGames) / 10 : 0;
    const top = ig.events[0];
    out.push({ kind: pc1 >= 20 ? 'warn' : 'info', text: `Anti-cheat: ${ig.flaggedGames} of ${ig.totalGames} games (${pc1}%) had at least one strike${top ? '; most common event: ' + top.type.replace('_', ' ') + ' (' + top.n + ')' : ''}.` +
      (ig.dropped ? ` ${ig.dropped} flagged games are excluded from the charts.` : ' Use the integrity filter to exclude flagged games before drawing conclusions.') });
  }
  return out;
}

/* ---------------- report export ---------------- */
const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function reportCSV(r) {
  const rows = [['section', 'metric', 'mean_or_value', 'sd', 'n']];
  const k = r.kpis;
  [['players', k.participants], ['rooms', k.rooms], ['escape_rate_pct', pct(k.escapeRate)], ['give_up_rate_pct', pct(k.giveUpRate)], ['submit_accuracy_pct', pct(k.accuracy)],
    ['first_try_rate_pct', pct(k.firstTryRate)], ['avg_escape_sec', r2(k.avgEscapeSec)], ['avg_hints_per_room', r2(k.avgHints)]].forEach(([m, v]) => rows.push(['kpi', m, v, '', '']));
  const st = (name, d) => rows.push([name.section, name.metric, r2(d.mean), r2(d.sd), d.n]);
  [['accuracy_pct', 'accuracy'], ['first_attempt_pct', 'firstTry'], ['attempts_per_puzzle', 'attempts'], ['time_sec', 'time'], ['hints', 'hints'], ['puzzles_solved', 'solved']].forEach(([m, f]) => {
    st({ section: 'all_rooms', metric: m }, r.stats[f]);
    r.byRoom.forEach((x) => st({ section: 'by_room', metric: m + ' / ' + x.label }, x[f]));
    r.byStart.forEach((x) => { if (x.rooms) st({ section: 'by_start_level', metric: m + ' / ' + x.level }, x[f]); });
  });
  r.byRoom.forEach((x) => { rows.push(['by_room', 'give_up_pct / ' + x.label, x.giveUp, '', x.n]); });
  r.categories.forEach((c) => { rows.push(['topic', 'wrong_submit_pct / ' + c.category, c.wrongPct, '', c.submits]); rows.push(['topic', 'first_attempt_pct / ' + c.category, c.firstTryPct, '', '']); });
  Object.entries(r.weakestCount).forEach(([c, n]) => rows.push(['weakest_topic_players', c, n, '', r.n.players]));
  r.mistakes.forEach((m) => rows.push(['mistake', m.tag, m.n, '', '']));
  const im = r.improvement;
  rows.push(['first_to_last_room', 'accuracy_change_points', r2(im.mean), r2(im.sd), im.n]);
  ['improved', 'same', 'declined'].forEach((c) => rows.push(['first_to_last_room', c, im[c], '', im.n]));
  const mv = r.adaptation.moves;
  ['up', 'stay', 'down'].forEach((c) => rows.push(['adaptation', 'level_' + c, mv[c], '', '']));
  rows.push(['adaptation', 'rule_check_matched', r.adaptation.audit.matched, '', r.adaptation.audit.checked]);
  if (r.integrity && r.integrity.hasData) {
    rows.push(['integrity', 'flagged_games', r.integrity.flaggedGames, '', r.integrity.totalGames]);
    r.integrity.events.forEach((e) => rows.push(['integrity_event', e.type, e.n, '', '']));
  }
  r.puzzles.forEach((p) => rows.push(['puzzle_success_pct', p.title + ' (' + p.id + ')', p.success, '', p.n]));
  return rows.map((row) => row.map(csvCell).join(',')).join('\n');
}

// tiny CSV reader (handles quotes) for files exported from Supabase "Download CSV"
function parseCSV(text) {
  const rows = []; let row = [], cur = '', q = false;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (q) { if (ch === '"') { if (text[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true;
    else if (ch === ',') { row.push(cur); cur = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && text[i + 1] === '\n') i++; row.push(cur); cur = ''; if (row.length > 1 || row[0] !== '') rows.push(row); row = []; }
    else cur += ch;
  }
  if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
  const head = rows.shift() || [];
  return rows.map((r) => Object.fromEntries(head.map((h, i) => [h.trim(), r[i]])));
}

/* ---------------- SIMULATED players (demo only) ---------------- */
// 30 players x 3 rooms, the study's planned sample. Uses the real room picker and level rules from adaptive.js.
// The learning rate is an ASSUMPTION of the simulation, not a result.
function sampleData(seed = 7) {
  let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sig = (x) => 1 / (1 + Math.exp(-x));
  const tagFor = { Index: 'IndexError', Type: 'TypeError', Recursion: 'RecursionError', Scope: 'NameError' };
  const sessions = [], attempts = [];
  for (let n = 0; n < 30; n++) {
    const participant = 'sim' + String(n + 1).padStart(3, '0');
    const ability = (R() - 0.5) * 1.6, rate = 0.25;
    const hard = Object.fromEntries(A_CATS.map((c) => [c, R() * 1.2]));
    const r0 = R(), li0 = r0 < 0.4 ? 0 : r0 < 0.8 ? 1 : 2, startLevel = A_LEVELS[li0];
    let li = li0, lastIds = []; const recent = [];
    for (let no = 1; no <= 3; no++) {
      const level = A_LEVELS[li];
      const room = _A.pickRoom({ level, weak: _A.weakCategories(recent), lastIds, rnd: R });
      lastIds = room.map((p) => p.id);
      let solved = 0, hints = 0, sec = 0, submits = 0, correct = 0, left = false; const subs = [];
      for (const p of room) {
        if (left) break;
        const base = ability + rate * (no - 1) + 1.0 - 0.9 * A_LEVELS.indexOf(p.level) - hard[p.category] * (no > 2 ? 0.45 : 0.8);
        let ok = false;
        for (let t = 1; t <= 4 && !ok; t++) {
          ok = R() < sig(base + 0.45 * (t - 1));
          submits++; sec += 55 + R() * 70 + (ok ? 0 : 35);
          const row = { participant, sessionNo: no, puzzleId: p.id, category: p.category, kind: 'submit', attemptNo: t, ok, tag: ok ? null : (R() < 0.7 ? tagFor[p.category] : 'Wrong Output') };
          attempts.push(row); subs.push({ kind: 'submit', is_correct: ok, category: p.category }); recent.unshift(subs[subs.length - 1]);
          if (ok) correct++; else if (R() < 0.18 && hints < 3) hints++;
        }
        if (ok) solved++; else left = true;
      }
      const result = solved === 4 ? 'won' : 'left';
      sessions.push({ participant, startLevel, sessionNo: no, level, nextLevel: null, result, solved, hints, elapsed: Math.round(sec), submits, correct, accuracy: submits ? correct / submits : null });
      const next = _A.nextLevel({ level, result, solved_count: solved, hints_used: hints, elapsed_sec: sec }, subs);
      sessions[sessions.length - 1].nextLevel = next; li = A_LEVELS.indexOf(next);
    }
  }
  return { sessions, attempts, integrity: sampleIntegrity(sessions, seed) };
}

// SIMULATED anti-cheat events: a minority of games get a few. For demos only.
function sampleIntegrity(sessions, seed = 7) {
  let s = (seed * 7919) % 2147483647 || 1; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const out = [];
  sessions.forEach((g) => {
    if (R() > 0.22) return;                                                 // about 1 game in 5 is flagged
    const n = 1 + Math.floor(R() * 3);
    for (let i = 0; i < n; i++) {
      const r = R(), type = r < 0.38 ? 'window_blur' : r < 0.6 ? 'tab_hidden' : r < 0.78 ? 'paste' : r < 0.9 ? 'copy' : 'big_jump';
      const away = type === 'window_blur' || type === 'tab_hidden';
      const awayMs = away ? Math.round(2000 + R() * 20000) : null;
      out.push({ participant: g.participant, sessionNo: g.sessionNo, type, awayMs, strike: true });
    }
    if (R() < 0.3) out.push({ participant: g.participant, sessionNo: g.sessionNo, type: 'contextmenu', awayMs: null, strike: false });
  });
  return out;
}

const _api = { mean, sd, median, desc, normalizeSessions, normalizeAttempts, normalizeIntegrity, analyze, insights, reportCSV, parseCSV, sampleData, sampleIntegrity };
if (typeof module !== 'undefined') module.exports = _api;