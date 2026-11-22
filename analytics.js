// DATA ANALYTICS for REMEDIATE. Pure functions (no page code, no database), so node --test can check them.
//
//   normalizeSessions / normalizeAttempts   rows from Supabase or a CSV  ->  clean objects
//   analyze(sessions, attempts, opts)       everything the analytics page shows
//   welch(a, b)                             two-group comparison (mean, SD, t, p, Cohen's d)
//   insights(result)                        plain-language findings + recommendations
//   reportCSV(result)                       flat summary file for the paper / slides
//   sampleData(seed)                        SIMULATED players, for demos only (never mix with real data)
//
// Data sources are the researcher views: research_sessions, research_attempts (schema.sql) and research_integrity (migration-03.sql, anti-cheat log).
// In the browser, puzzles.js and adaptive.js must be loaded first (same rule as adaptive.js).

const _P = (typeof PUZZLE_BANK !== 'undefined') ? { PUZZLE_BANK, LEVELS } : require('./puzzles.js');
const _A = (typeof pickRoom !== 'undefined') ? { pickRoom, nextLevel, weakCategories } : require('./adaptive.js');
const A_LEVELS = _P.LEVELS;
const A_CATS = ['Index', 'Type', 'Recursion', 'Scope'];

/* ---------------- small statistics helpers ---------------- */
const mean = (a) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : null);
const sd = (a) => {
  if (a.length < 2) return null;
  const m = mean(a);
  return Math.sqrt(a.reduce((s, x) => s + (x - m) * (x - m), 0) / (a.length - 1));
};
const median = (a) => {
  if (!a.length) return null;
  const s = a.slice().sort((x, y) => x - y), h = s.length >> 1;
  return s.length % 2 ? s[h] : (s[h - 1] + s[h]) / 2;
};
const pct = (x) => (x === null || x === undefined ? null : Math.round(x * 1000) / 10);

// log-gamma (Lanczos) and the regularised incomplete beta function, needed for the t-test p-value
function lgamma(x) {
  const c = [76.18009172947146, -86.50532032941677, 24.01409824083091, -1.231739572450155, 0.1208650973866179e-2, -0.5395239384953e-5];
  let y = x, t = x + 5.5; t -= (x + 0.5) * Math.log(t);
  let s = 1.000000000190015;
  for (let j = 0; j < 6; j++) s += c[j] / ++y;
  return -t + Math.log(2.5066282746310005 * s / x);
}
function betacf(a, b, x) {
  let qab = a + b, qap = a + 1, qam = a - 1, c = 1, d = 1 - qab * x / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d; let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = m * (b - m) * x / ((qam + m2) * (a + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; h *= d * c;
    aa = -(a + m) * (qab + m) * x / ((a + m2) * (qap + m2));
    d = 1 + aa * d; if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c; if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d; const del = d * c; h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}
function ibeta(x, a, b) {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(lgamma(a + b) - lgamma(a) - lgamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  return x < (a + 1) / (a + b + 2) ? bt * betacf(a, b, x) / a : 1 - bt * betacf(b, a, 1 - x) / b;
}
// two-sided p-value of a t statistic
const tTwoSided = (t, df) => ibeta(df / (df + t * t), df / 2, 0.5);

// Welch's t-test (does not assume equal variances) + Cohen's d. Needs 2+ values in each group.
function welch(a, b) {
  const out = { nA: a.length, nB: b.length, meanA: mean(a), meanB: mean(b), sdA: sd(a), sdB: sd(b), t: null, df: null, p: null, d: null };
  if (a.length < 2 || b.length < 2) return out;
  const va = out.sdA ** 2 / a.length, vb = out.sdB ** 2 / b.length;
  if (va + vb === 0) return out;
  out.t = (out.meanA - out.meanB) / Math.sqrt(va + vb);
  out.df = (va + vb) ** 2 / (va ** 2 / (a.length - 1) + vb ** 2 / (b.length - 1));
  out.p = tTwoSided(out.t, out.df);
  const sp = Math.sqrt(((a.length - 1) * out.sdA ** 2 + (b.length - 1) * out.sdB ** 2) / (a.length + b.length - 2));
  out.d = sp ? (out.meanA - out.meanB) / sp : null;
  return out;
}

/* ---------------- cleaning rows from Supabase or CSV ---------------- */
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number.isFinite(Number(v)) ? Number(v) : null);
const toBool = (v) => v === true || v === 'true' || v === 't' || v === 'TRUE' || v === 1 || v === '1';

function normalizeSessions(rows) {
  return (rows || []).map((r) => {
    const submits = toNum(r.submits) || 0, correct = toNum(r.submits_correct) || 0;
    return {
      participant: String(r.participant), group: r.study_group === 'control' ? 'control' : 'adaptive',
      sessionNo: toNum(r.session_no), sessionId: toNum(r.session_id), level: r.level, nextLevel: r.next_level || null, result: r.result,
      solved: toNum(r.solved_count) || 0, hints: toNum(r.hints_used) || 0, elapsed: toNum(r.elapsed_sec) || 0,
      submits, correct, accuracy: submits ? correct / submits : null
    };
  }).filter((s) => s.result !== 'in_progress' && s.sessionNo !== null);
}
function normalizeAttempts(rows) {
  return (rows || []).map((r) => ({
    participant: String(r.participant), group: r.study_group === 'control' ? 'control' : 'adaptive',
    sessionNo: toNum(r.session_no), puzzleId: r.puzzle_id, category: r.category, kind: r.kind || 'submit',
    attemptNo: toNum(r.attempt_no), ok: toBool(r.is_correct), tag: r.mistake_tag || null
  })).filter((a) => a.kind === 'submit' && a.category);
}

// anti-cheat log (research_integrity): one row per blocked or suspicious event
function normalizeIntegrity(rows) {
  return (rows || []).map((r) => ({
    participant: String(r.participant), group: r.study_group === 'control' ? 'control' : 'adaptive',
    sessionNo: toNum(r.session_no), type: r.event_type, awayMs: toNum(r.away_ms), strike: toBool(r.strike)
  })).filter((e) => e.type && e.sessionNo !== null);
}

/* ---------------- the analysis ---------------- */
const GROUPS = ['adaptive', 'control'];

function groupKpis(sessions, attempts) {
  const won = sessions.filter((s) => s.result === 'won');
  const submits = sessions.reduce((s, x) => s + x.submits, 0), correct = sessions.reduce((s, x) => s + x.correct, 0);
  const firstTry = attempts.filter((a) => a.attemptNo === 1);
  return {
    participants: new Set(sessions.map((s) => s.participant)).size,
    sessions: sessions.length,
    escapeRate: sessions.length ? won.length / sessions.length : null,
    accuracy: submits ? correct / submits : null,
    firstTryRate: firstTry.length ? firstTry.filter((a) => a.ok).length / firstTry.length : null,
    avgEscapeSec: mean(won.map((s) => s.elapsed)),
    avgHints: mean(sessions.map((s) => s.hints)),
    advancedShare: sessions.length ? sessions.filter((s) => s.level === 'ADVANCED').length / sessions.length : null
  };
}

// opts.level: only rooms played at this level ('' = all)
// opts.excludeStrikes: drop games with this many integrity strikes or more (0 / missing = keep every game)
function analyze(sessionsIn, attemptsIn, opts = {}, integrityIn = []) {
  const lv = opts.level || '';
  const key = (x) => x.participant + '#' + x.sessionNo;
  const strikesBy = {};                                   // strikes per game
  integrityIn.filter((e) => e.strike).forEach((e) => { strikesBy[key(e)] = (strikesBy[key(e)] || 0) + 1; });
  const cut = opts.excludeStrikes || 0;
  const flagged = (s) => cut > 0 && (strikesBy[key(s)] || 0) >= cut;
  let sessions = lv ? sessionsIn.filter((s) => s.level === lv) : sessionsIn;
  const before = sessions.length;
  sessions = sessions.filter((s) => !flagged(s));
  const dropped = before - sessions.length;
  const keep = new Set(sessions.map(key));
  const attempts = (lv || cut) ? attemptsIn.filter((a) => keep.has(key(a))) : attemptsIn;
  const by = (arr, g) => arr.filter((x) => x.group === g);

  const kpis = {};
  GROUPS.forEach((g) => { kpis[g] = groupKpis(by(sessions, g), by(attempts, g)); });
  kpis.all = groupKpis(sessions, attempts);

  // learning curve: mean accuracy of game number n (per player first, so one busy player cannot dominate)
  const maxNo = Math.min(8, Math.max(0, ...sessions.map((s) => s.sessionNo)));
  const curve = { labels: [], adaptive: [], control: [], nAdaptive: [], nControl: [], levelAdaptive: [], levelControl: [] };
  for (let n = 1; n <= maxNo; n++) {
    curve.labels.push('Game ' + n);
    GROUPS.forEach((g) => {
      const rows = by(sessions, g).filter((s) => s.sessionNo === n);
      const cap = g === 'adaptive' ? 'Adaptive' : 'Control';
      curve[g].push(rows.length ? pct(mean(rows.filter((s) => s.accuracy !== null).map((s) => s.accuracy))) : null);
      curve['n' + cap].push(rows.length);
      curve['level' + cap].push(rows.length ? Math.round(mean(rows.map((s) => Math.max(0, A_LEVELS.indexOf(s.level)))) * 100) / 100 : null);
    });
  }

  // weakness by topic: share of wrong submits
  const categories = A_CATS.map((c) => {
    const row = { category: c };
    GROUPS.forEach((g) => {
      const x = by(attempts, g).filter((a) => a.category === c);
      row[g] = x.length ? pct(x.filter((a) => !a.ok).length / x.length) : null;
      row['n_' + g] = x.length;
    });
    const all = attempts.filter((a) => a.category === c);
    row.all = all.length ? pct(all.filter((a) => !a.ok).length / all.length) : null;
    return row;
  });

  // what kind of mistakes
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

  // improvement per player: accuracy of the last game minus the first game (needs 2+ games)
  const improvement = { adaptive: [], control: [] };
  GROUPS.forEach((g) => {
    const per = {};
    by(sessions, g).filter((s) => s.accuracy !== null).forEach((s) => { (per[s.participant] = per[s.participant] || []).push(s); });
    Object.values(per).forEach((list) => {
      if (list.length < 2) return;
      list.sort((a, b) => a.sessionNo - b.sessionNo);
      improvement[g].push((list[list.length - 1].accuracy - list[0].accuracy) * 100);
    });
  });
  const test = welch(improvement.adaptive, improvement.control);

  // where players end up: level of the last game per player
  const levelEnd = { adaptive: { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 }, control: { BEGINNER: 0, INTERMEDIATE: 0, ADVANCED: 0 } };
  GROUPS.forEach((g) => {
    const last = {};
    by(sessions, g).forEach((s) => { if (!last[s.participant] || s.sessionNo > last[s.participant].sessionNo) last[s.participant] = s; });
    Object.values(last).forEach((s) => { const k = s.nextLevel || s.level; if (levelEnd[g][k] !== undefined) levelEnd[g][k]++; });
  });

  // integrity: how often, what kind, and in which group (over the games that are kept)
  const events = integrityIn.filter((e) => keep.has(key(e)));
  const typeCount = {};
  events.forEach((e) => { typeCount[e.type] = (typeCount[e.type] || 0) + 1; });
  const perGroup = {};
  GROUPS.forEach((g) => {
    const gs = by(sessions, g), ge = by(events, g);
    const gk = new Set(gs.map(key));
    const struck = new Set(ge.filter((e) => e.strike).map(key));
    perGroup[g] = {
      games: gs.length,
      flaggedGames: [...struck].filter((k) => gk.has(k)).length,
      events: ge.length, strikes: ge.filter((e) => e.strike).length,
      eventsPerGame: gs.length ? ge.length / gs.length : null
    };
  });
  const allGames = sessionsIn.length, struckAll = new Set(integrityIn.filter((e) => e.strike).map(key));
  const integrity = {
    hasData: integrityIn.length > 0,
    events: Object.entries(typeCount).sort((a, b) => b[1] - a[1]).map(([type, n]) => ({ type, n })),
    perGroup,
    flaggedGames: sessionsIn.filter((s) => struckAll.has(key(s))).length, totalGames: allGames,
    awaySec: events.filter((e) => e.awayMs !== null).reduce((s, e) => s + e.awayMs, 0) / 1000,
    autoEnded: events.filter((e) => e.type === 'auto_end').length,
    dropped
  };

  // one row per player for the explorer table
  const perPlayer = {};
  sessions.forEach((s) => {
    const o = perPlayer[s.participant] || (perPlayer[s.participant] = { participant: s.participant, group: s.group, games: 0, won: 0, hints: 0, sub: 0, ok: 0, last: null, strikes: 0 });
    o.games++; if (s.result === 'won') o.won++; o.hints += s.hints; o.sub += s.submits; o.ok += s.correct;
    if (!o.last || s.sessionNo > o.last.sessionNo) o.last = s;
    o.strikes += strikesBy[key(s)] || 0;
  });
  const players = Object.values(perPlayer).map((o) => ({ participant: o.participant, group: o.group, games: o.games, escapeRate: o.games ? o.won / o.games : null,
    accuracy: o.sub ? o.ok / o.sub : null, hints: o.games ? o.hints / o.games : null, level: o.last ? (o.last.nextLevel || o.last.level) : null, strikes: o.strikes }));

  return { kpis, curve, categories, mistakes, puzzles, improvement, test, levelEnd, integrity, players, n: { sessions: sessions.length, attempts: attempts.length } };
}

/* ---------------- plain-language findings ---------------- */
const f1 = (x) => (Math.round(x * 10) / 10).toFixed(1);
const signed = (x) => (x >= 0 ? '+' : '') + f1(x);

function insights(r) {
  const out = [];
  if (!r.n.sessions) return [{ kind: 'info', text: 'No finished games yet. Load data to see findings.' }];
  const t = r.test;
  if (t.p !== null) {
    const sig = t.p < 0.05;
    out.push({
      kind: sig ? 'good' : 'info',
      text: `Accuracy change from a player's first to last game: adaptive ${signed(t.meanA)} points (n=${t.nA}) vs control ${signed(t.meanB)} points (n=${t.nB}). ` +
        (sig ? `The difference is statistically significant (Welch t-test p=${t.p.toFixed(3)}, Cohen's d=${f1(t.d)}), which supports the adaptive rules.`
          : `The difference is not statistically significant yet (p=${t.p.toFixed(3)}). With a small sample this is expected: collect more players before concluding.`)
    });
  } else out.push({ kind: 'info', text: 'Not enough players with 2+ games in both groups to compare learning gain yet.' });

  const a = r.kpis.adaptive, c = r.kpis.control;
  if (a.escapeRate !== null && c.escapeRate !== null)
    out.push({ kind: a.escapeRate >= c.escapeRate ? 'good' : 'warn', text: `Escape rate: adaptive ${pct(a.escapeRate)}% vs control ${pct(c.escapeRate)}%.` });
  if (a.avgHints !== null && c.avgHints !== null)
    out.push({ kind: 'info', text: `Hints per game: adaptive ${f1(a.avgHints)} vs control ${f1(c.avgHints)}. Fewer hints at the same accuracy suggests players rely less on help.` });

  const cats = r.categories.filter((x) => x.all !== null).sort((x, y) => y.all - x.all);
  if (cats.length) out.push({ kind: 'warn', text: `Hardest topic overall: ${cats[0].category} (${cats[0].all}% of submits wrong). Recommendation: strengthen the ${cats[0].category} lesson and add more ${cats[0].category} puzzle variants.` });

  const hard = r.puzzles.filter((p) => p.n >= 5);
  if (hard.length) {
    const h = hard[0];
    out.push({ kind: 'warn', text: `Hardest puzzle: "${h.title}" (${h.success}% of submits correct, n=${h.n}). Review its hints and story. If it is much harder than its level, move it up a level.` });
    const easy = hard[hard.length - 1];
    if (easy.success >= 90) out.push({ kind: 'info', text: `Easiest puzzle: "${easy.title}" (${easy.success}% correct). If it sits in a higher level than its difficulty, move it down.` });
  }
  if (r.mistakes.length) out.push({ kind: 'info', text: `Most common mistake: ${r.mistakes[0].tag} (${r.mistakes[0].n} times). The post-game recommendations should target it first.` });

  const stuck = r.levelEnd.adaptive.BEGINNER, total = Object.values(r.levelEnd.adaptive).reduce((s, x) => s + x, 0);
  if (total >= 4 && stuck / total > 0.4) out.push({ kind: 'warn', text: `${Math.round(100 * stuck / total)}% of adaptive players are still at BEGINNER after their last game. The promotion rules (75% accuracy, 1 hint, under par time) may be too strict.` });
  const ig = r.integrity;
  if (ig && ig.hasData) {
    const pc1 = ig.totalGames ? Math.round(1000 * ig.flaggedGames / ig.totalGames) / 10 : 0;
    const top = ig.events[0];
    out.push({ kind: pc1 >= 20 ? 'warn' : 'info', text: `Anti-cheat: ${ig.flaggedGames} of ${ig.totalGames} games (${pc1}%) had at least one strike${top ? '; most common event: ' + top.type.replace('_', ' ') + ' (' + top.n + ')' : ''}.` +
      (ig.dropped ? ` ${ig.dropped} flagged games are excluded from the charts above.` : ' Use the integrity filter to exclude flagged games before drawing conclusions.') });
  }
  return out;
}

/* ---------------- report export ---------------- */
const csvCell = (v) => { const s = v === null || v === undefined ? '' : String(v); return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };
function reportCSV(r) {
  const rows = [['section', 'metric', 'adaptive', 'control', 'all']];
  const k = r.kpis;
  [['participants', 'participants'], ['games', 'sessions'], ['escape_rate', 'escapeRate', true], ['submit_accuracy', 'accuracy', true],
    ['first_try_rate', 'firstTryRate', true], ['avg_escape_sec', 'avgEscapeSec'], ['avg_hints_per_game', 'avgHints'], ['share_games_at_advanced', 'advancedShare', true]]
    .forEach(([name, key, isPct]) => rows.push(['kpi', name, ...['adaptive', 'control', 'all'].map((g) => (isPct ? pct(k[g][key]) : k[g][key] === null ? null : Math.round(k[g][key] * 100) / 100))]));
  r.categories.forEach((c) => rows.push(['wrong_submit_pct', c.category, c.adaptive, c.control, c.all]));
  r.curve.labels.forEach((l, i) => rows.push(['accuracy_pct_by_game', l, r.curve.adaptive[i], r.curve.control[i], '']));
  const t = r.test;
  rows.push(['learning_gain_points', 'mean', t.meanA === null ? null : f1(t.meanA), t.meanB === null ? null : f1(t.meanB), '']);
  rows.push(['learning_gain_points', 'n', t.nA, t.nB, '']);
  rows.push(['learning_gain_test', 'welch_t / df / p / cohens_d', t.t === null ? null : f1(t.t), t.df === null ? null : f1(t.df), t.p === null ? null : t.p.toFixed(4) + ' / d=' + (t.d === null ? '' : f1(t.d))]);
  if (r.integrity && r.integrity.hasData) {
    rows.push(['integrity', 'flagged_games / total_games', '', '', r.integrity.flaggedGames + ' / ' + r.integrity.totalGames]);
    GROUPS.forEach((g) => rows.push(['integrity_' + g, 'games / flagged / events / strikes', r.integrity.perGroup[g].games, r.integrity.perGroup[g].flaggedGames, r.integrity.perGroup[g].events + ' / ' + r.integrity.perGroup[g].strikes]));
    r.integrity.events.forEach((e) => rows.push(['integrity_event', e.type, '', '', e.n]));
  }
  r.puzzles.forEach((p) => rows.push(['puzzle_success_pct', p.title + ' (' + p.id + ')', '', '', p.success]));
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
// Uses the real room picker and level rules from adaptive.js so the demo behaves like the game.
// Adaptive players are given a slightly higher learning rate: this is an ASSUMPTION of the simulation, not a result.
function sampleData(seed = 7) {
  let s = seed; const R = () => (s = (s * 16807) % 2147483647) / 2147483647;
  const sig = (x) => 1 / (1 + Math.exp(-x));
  const tagFor = { Index: 'IndexError', Type: 'TypeError', Recursion: 'RecursionError', Scope: 'NameError' };
  const sessions = [], attempts = [];
  for (let n = 0; n < 24; n++) {
    const group = n < 12 ? 'adaptive' : 'control', participant = 'sim' + String(n + 1).padStart(3, '0');
    const ability = (R() - 0.5) * 1.6, rate = group === 'adaptive' ? 0.34 : 0.16;
    const hard = Object.fromEntries(A_CATS.map((c) => [c, R() * 1.2]));
    let li = R() < 0.6 ? 0 : 1, lastIds = []; const recent = [];
    for (let no = 1; no <= 6; no++) {
      const level = A_LEVELS[li];
      const room = _A.pickRoom({ level, weak: group === 'adaptive' ? _A.weakCategories(recent) : [], lastIds, rnd: R });
      lastIds = room.map((p) => p.id);
      let solved = 0, hints = 0, sec = 0, submits = 0, correct = 0, left = false; const subs = [];
      for (const p of room) {
        if (left) break;
        const base = ability + rate * (no - 1) + 0.7 - 0.9 * A_LEVELS.indexOf(p.level) - hard[p.category] * (group === 'adaptive' && no > 2 ? 0.45 : 0.8);
        let ok = false;
        for (let t = 1; t <= 4 && !ok; t++) {
          ok = R() < sig(base + 0.45 * (t - 1));
          submits++; sec += 55 + R() * 70 + (ok ? 0 : 35);
          const row = { participant, group, sessionNo: no, puzzleId: p.id, category: p.category, kind: 'submit', attemptNo: t, ok, tag: ok ? null : (R() < 0.7 ? tagFor[p.category] : 'Wrong Output') };
          attempts.push(row); subs.push({ kind: 'submit', is_correct: ok, category: p.category }); recent.unshift(subs[subs.length - 1]);
          if (ok) correct++; else if (R() < 0.18 && hints < 3) hints++;
        }
        if (ok) solved++; else left = true;
      }
      const result = solved === 4 ? 'won' : 'left';
      sessions.push({ participant, group, sessionNo: no, level, nextLevel: null, result, solved, hints, elapsed: Math.round(sec), submits, correct, accuracy: submits ? correct / submits : null });
      const next = group === 'adaptive' ? _A.nextLevel({ level, result, solved_count: solved, hints_used: hints, elapsed_sec: sec }, subs) : level;
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
      out.push({ participant: g.participant, group: g.group, sessionNo: g.sessionNo, type, awayMs, strike: true });
    }
    if (R() < 0.3) out.push({ participant: g.participant, group: g.group, sessionNo: g.sessionNo, type: 'contextmenu', awayMs: null, strike: false });
  });
  return out;
}

const _api = { welch, tTwoSided, mean, sd, median, normalizeSessions, normalizeAttempts, normalizeIntegrity, analyze, insights, reportCSV, parseCSV, sampleData, sampleIntegrity };
if (typeof module !== 'undefined') module.exports = _api;