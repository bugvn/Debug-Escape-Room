// PROJECT-WIDE TESTS for REMEDIATE. Run with:  node --test   (or: npm test)
// Checks the whole repo, not one module: files, paths, syntax, puzzles, rooms, rules and wiring.
// No packages needed. Python tests are skipped (not failed) when python is not installed.
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { spawnSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const exists = (p) => fs.existsSync(path.join(ROOT, p));
const ls = (d, ext) => fs.readdirSync(path.join(ROOT, d)).filter((f) => f.endsWith(ext));
const PAGES = ls('.', '.html');
const JS_FILES = ls('js', '.js');

const { PUZZLE_BANK, LEVELS, CATEGORIES, SPOT_CATEGORY, themePuzzle } = require('../js/puzzles.js');
const { RULES } = require('../js/adaptive.js');
const { INTEGRITY } = require('../js/integrity.js');
const { PAR_SEC } = require('../js/score.js');
const A = require('../js/analytics.js');

/* ---------------------------------------------------------------- 1. folders and files */

test('folders exist', () => {
  for (const d of ['css', 'js', 'tests', 'sql', 'docs', 'tools', 'media']) assert.ok(exists(d), `missing folder ${d}/`);
});

test('all 7 pages are at the root', () => {
  for (const p of ['index', 'login', 'dashboard', 'game-room', 'lesson', 'analytics', 'test-summary']) {
    assert.ok(PAGES.includes(p + '.html'), `missing ${p}.html`);
  }
});

test('sql files exist: schema + migration 01 to 05', () => {
  for (const f of ['schema', 'migration-01', 'migration-02', 'migration-03', 'migration-04', 'migration-05']) {
    assert.ok(exists(`sql/${f}.sql`), `missing sql/${f}.sql`);
  }
});

test('no loose code left at the root (js, css, sql, tests belong in folders)', () => {
  const loose = fs.readdirSync(ROOT).filter((f) => /\.(js|css|sql)$/.test(f));
  assert.deepStrictEqual(loose, [], 'move these into js/ css/ sql/ tests/: ' + loose.join(', '));
});

/* ---------------------------------------------------------------- 2. syntax */

test('every js/ file compiles', () => {
  for (const f of JS_FILES) {
    assert.doesNotThrow(() => new vm.Script(read('js/' + f), { filename: f }), `syntax error in js/${f}`);
  }
});

test('every inline <script> in every page compiles', () => {
  for (const page of PAGES) {
    const html = read(page);
    const blocks = [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).filter((c) => c.trim());
    blocks.forEach((code, i) => {
      assert.doesNotThrow(() => new vm.Script(code, { filename: `${page} script #${i + 1}` }), `syntax error in ${page} script #${i + 1}`);
    });
  }
});

/* ---------------------------------------------------------------- 3. paths and references */

test('every local src= and href= in every page points to a real file', () => {
  const bad = [];
  for (const page of PAGES) {
    for (const m of read(page).matchAll(/(?:src|href)="([^"#?]+)"/g)) {
      const u = m[1];
      if (/^(https?:|\/\/|mailto:|data:|javascript:)/.test(u) || u.includes("'") || u.includes('+')) continue; // external or built by script
      if (!exists(u)) bad.push(`${page} -> ${u}`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('require() paths inside js/ and tests/ resolve', () => {
  const bad = [];
  const scan = (dir) => ls(dir, '.js').forEach((f) => {
    for (const m of read(`${dir}/${f}`).matchAll(/require\('(\.[^']+)'\)/g)) {
      if (!fs.existsSync(path.resolve(ROOT, dir, m[1]))) bad.push(`${dir}/${f} -> ${m[1]}`);
    }
  });
  scan('js'); scan('tests');
  assert.deepStrictEqual(bad, []);
});

test('package.json "check" script lists real files', () => {
  const pkg = JSON.parse(read('package.json'));
  for (const m of pkg.scripts.check.matchAll(/node --check (\S+)/g)) assert.ok(exists(m[1]), `package.json checks missing file ${m[1]}`);
});

test('every id a page script asks for exists in that page (or in the shared header)', () => {
  const HEADER_IDS = new Set(['logoutBtn', 'playerName', 'skipTop', 'navAnalytics', 'shPlayer']); // injected by js/site-header.js
  const bad = [];
  for (const page of PAGES) {
    const html = read(page);
    const have = new Set([...html.matchAll(/\bid="([^"]+)"/g)].map((m) => m[1]));
    const used = new Set([
      ...[...html.matchAll(/getElementById\('([^']+)'\)/g)].map((m) => m[1]),
      ...[...html.matchAll(/\$\('([A-Za-z][\w-]*)'\)/g)].map((m) => m[1])
    ]);
    for (const id of used) if (!have.has(id) && !HEADER_IDS.has(id)) bad.push(`${page}: #${id}`);
  }
  assert.deepStrictEqual(bad, []);
});

/* ---------------------------------------------------------------- 4. safety */

test('no secret keys in the code (only the public Supabase key may be in the repo)', () => {
  const files = [...PAGES, ...JS_FILES.map((f) => 'js/' + f)];
  for (const f of files) {
    const t = read(f);
    assert.ok(!/service_role|sb_secret_/.test(t), `secret key found in ${f}`);
  }
  assert.match(read('js/supabase-config.js'), /sb_publishable_|eyJ/, 'js/supabase-config.js has no public key');
});

/* ---------------------------------------------------------------- 5. puzzle bank */

test('puzzle ids are unique', () => {
  const ids = PUZZLE_BANK.map((p) => p.id);
  assert.strictEqual(new Set(ids).size, ids.length);
});

test('every puzzle has all its fields', () => {
  for (const p of PUZZLE_BANK) {
    for (const k of ['id', 'category', 'level', 'title', 'story', 'expect', 'file', 'status', 'badge', 'code', 'why']) {
      assert.ok(typeof p[k] === 'string' && p[k].trim(), `${p.id} is missing "${k}"`);
    }
    assert.ok(Array.isArray(p.bug) && p.bug.length, `${p.id} needs bug line(s)`);
    assert.ok(Array.isArray(p.hint) && p.hint.length >= 1, `${p.id} needs hints`);
    assert.ok(CATEGORIES.includes(p.category), `${p.id} has unknown category ${p.category}`);
    assert.ok(LEVELS.includes(p.level), `${p.id} has unknown level ${p.level}`);
  }
});

test('every category has 2+ puzzles at every level (so rooms can rotate)', () => {
  for (const c of CATEGORIES) for (const l of LEVELS) {
    const n = PUZZLE_BANK.filter((p) => p.category === c && p.level === l).length;
    assert.ok(n >= 2, `${c} / ${l} has only ${n} puzzle(s)`);
  }
});

test('bug lines point at real lines of the code', () => {
  for (const p of PUZZLE_BANK) {
    const lines = p.code.split('\n').length;
    for (const b of p.bug) assert.ok(Number.isInteger(b) && b >= 0 && b < lines, `${p.id}: bug line ${b} is outside the ${lines}-line code`);
  }
});

test('every puzzle variant regex matches its own code', () => {
  for (const p of PUZZLE_BANK.filter((x) => x.variant)) {
    assert.doesNotThrow(() => new RegExp(p.variant.re), `${p.id}: bad variant regex`);
    assert.ok(new RegExp(p.variant.re).test(p.code), `${p.id}: variant regex does not match the code`);
    assert.ok(p.variant.to && p.variant.expect, `${p.id}: variant needs "to" and "expect"`);
  }
});

test('each room object owns a known category', () => {
  assert.deepStrictEqual(Object.keys(SPOT_CATEGORY).sort(), ['clock', 'fridge', 'kettle', 'window']);
  for (const c of Object.values(SPOT_CATEGORY)) assert.ok(CATEGORIES.includes(c));
});

const py = ['python3', 'python'].find((c) => spawnSync(c, ['--version']).status === 0);
test('REAL PYTHON: buggy code fails and the fixed code prints the expected output (24 puzzles)',
  { skip: py ? false : 'python is not installed' }, () => {
    const r = spawnSync(py, ['tools/verify_bank.py'], { cwd: ROOT, encoding: 'utf8' });
    assert.strictEqual(r.status, 0, (r.stdout || '') + (r.stderr || ''));
    assert.match(r.stdout, /OK/);
  });

/* ---------------------------------------------------------------- 6. rooms (game-room.html) */

function parseRooms() {
  const html = read('game-room.html');
  const start = html.indexOf('const ROOMS = {');
  const blk = html.slice(start, start + 7000);
  const out = {};
  LEVELS.forEach((lvl, i) => {
    const a = blk.indexOf(lvl + ': {');
    const nexts = LEVELS.slice(i + 1).map((n) => blk.indexOf(n + ': {')).filter((x) => x > a);
    const seg = blk.slice(a, nexts.length ? Math.min(...nexts) : a + 2500);
    const dir = (seg.match(/dir: *'([^']+)'/) || [])[1];
    const spots = {};
    for (const m of seg.matchAll(/(window|fridge|kettle|clock|door): *\{ *img: *'(\w+)'(?:, *name: *'([^']+)')?/g)) spots[m[1]] = { img: m[2], name: m[3] };
    out[lvl] = { dir, spots };
  });
  return out;
}

test('every level has a room with 4 objects, a door, and all the art files', () => {
  const rooms = parseRooms();
  for (const lvl of LEVELS) {
    const r = rooms[lvl];
    assert.ok(r && r.dir, `no room for ${lvl}`);
    for (const k of ['window', 'fridge', 'kettle', 'clock', 'door']) assert.ok(r.spots[k], `${lvl} room has no "${k}" spot`);
    assert.ok(exists(r.dir + 'bg.png'), `missing ${r.dir}bg.png`);
    for (const s of Object.values(r.spots)) assert.ok(exists(`${r.dir}${s.img}.png`), `missing ${r.dir}${s.img}.png`);
  }
});

test('the 4 objects of a room are different things', () => {
  const rooms = parseRooms();
  for (const lvl of LEVELS) {
    const imgs = Object.values(rooms[lvl].spots).map((s) => s.img);
    assert.strictEqual(new Set(imgs).size, imgs.length, `${lvl} room reuses an object`);
  }
});

// Puzzles are object-neutral: title and story use {obj}, file uses {objfile}. The room fills in the object it shows,
// so every puzzle works in every room (the easier puzzle a weak category pulls down from a lower level included).
test('every puzzle uses the {obj} / {objfile} tokens', () => {
  const bad = [];
  for (const p of PUZZLE_BANK) {
    if (!p.title.includes('{obj}')) bad.push(`${p.id}: title needs {obj}`);
    if (!p.story.includes('{obj}')) bad.push(`${p.id}: story needs {obj}`);
    if (!p.file.includes('{objfile}')) bad.push(`${p.id}: file needs {objfile}`);
  }
  assert.deepStrictEqual(bad, []);
});

test('every puzzle reads right in every room object (no loose tokens, no other room\'s object)', () => {
  const rooms = parseRooms();
  const allNames = [...new Set(LEVELS.flatMap((l) => Object.values(rooms[l].spots).map((s) => s.name).filter(Boolean)))];
  const bad = [];
  for (const lvl of LEVELS) for (const spot of Object.keys(SPOT_CATEGORY)) {
    const obj = rooms[lvl].spots[spot].name;
    for (const p of PUZZLE_BANK.filter((x) => x.category === SPOT_CATEGORY[spot])) {
      const t = themePuzzle(p, obj);
      const text = `${t.title} ${t.story} ${t.file}`;
      if (!t.title.includes(obj) || !t.story.includes(obj)) bad.push(`${p.id} in ${lvl}: should name "${obj}"`);
      if (/[{}]/.test(text)) bad.push(`${p.id} in ${lvl}: unfilled token`);
      for (const other of allNames.filter((n) => n !== obj && !obj.includes(n)))
        if (new RegExp(`\\b${other}\\b`, 'i').test(`${p.title} ${p.story}`)) bad.push(`${p.id}: text hard-codes "${other}"`);
    }
  }
  assert.deepStrictEqual(bad, []);
});

test('js/puzzles.json is valid and is what the game loads', () => {
  const raw = JSON.parse(read('js/puzzles.json'));
  assert.ok(Array.isArray(raw) && raw.length === PUZZLE_BANK.length, 'puzzles.json and PUZZLE_BANK disagree');
  raw.forEach((p, i) => {
    assert.ok(Array.isArray(p.code) && p.code.every((l) => typeof l === 'string'), `${p.id}: code must be an array of lines`);
    assert.strictEqual(PUZZLE_BANK[i].code, p.code.join('\n'));
  });
});

test('tools/fixes.json has one fix per puzzle and never ships to the browser', () => {
  const fixes = JSON.parse(read('tools/fixes.json'));
  assert.deepStrictEqual(Object.keys(fixes).sort(), PUZZLE_BANK.map((p) => p.id).sort());
  for (const p of PUZZLE_BANK) assert.ok(p.code.includes(fixes[p.id][0]), `${p.id}: fix pattern not found in code`);
  assert.ok(!/fixes\.json/.test(PAGES.map((f) => read(f)).join('\n')), 'a page loads fixes.json');
});

/* ---------------------------------------------------------------- 7. rules and wiring across files */

// Two different clocks on purpose: score.js PAR_SEC is the time-bonus window for the score,
// RULES.parSec is the "finish under this to move up a level" limit. A level limit above the score window
// would mean a player could move up after earning no time bonus at all.
test('level promotion par times fit inside the score time window', () => {
  assert.deepStrictEqual(Object.keys(RULES.parSec), LEVELS);
  for (const l of LEVELS) assert.ok(RULES.parSec[l] > 0 && RULES.parSec[l] <= PAR_SEC, `${l} par ${RULES.parSec[l]}s is outside 0..${PAR_SEC}s`);
  assert.ok(RULES.parSec.BEGINNER <= RULES.parSec.INTERMEDIATE && RULES.parSec.INTERMEDIATE <= RULES.parSec.ADVANCED, 'harder levels should not get less time');
});

test('the integrity rules text on the analytics page matches integrity.js', () => {
  const html = read('analytics.html');
  const strikes = html.match(/(\d+) strikes closes the room/);
  const secs = html.match(/for (\d+) seconds? or more/);
  assert.ok(strikes && secs, 'rules text not found on analytics.html');
  assert.strictEqual(Number(strikes[1]), INTEGRITY.maxStrikes);
  assert.strictEqual(Number(secs[1]) * 1000, INTEGRITY.awayGraceMs);
});

test('analytics runs end to end on the sample data without errors', () => {
  const d = A.sampleData(7);
  const r = A.analyze(d.sessions, d.attempts, {}, d.integrity);
  assert.ok(r.n && r.kpis, 'analyze returned nothing');
  assert.ok(A.insights(r).length > 0, 'no insights');
  assert.ok(A.reportCSV(r).length > 0, 'empty CSV report');
});

test('analytics rule check agrees with the real rules on sample data', () => {
  const d = A.sampleData(11);
  const r = A.analyze(d.sessions, d.attempts, {}, d.integrity);
  const line = A.insights(r).map((x) => x.text).find((t) => /Rule check/.test(t)) || '';
  assert.match(line, /matches the adaptation rules in (\d+) of \1 rooms/);
});

test('every sql file the pages tell the user to run exists', () => {
  const said = new Set();
  for (const f of [...PAGES, ...JS_FILES.map((x) => 'js/' + x)]) for (const m of read(f).matchAll(/sql\/(migration-0\d|schema)\.sql/g)) said.add(m[0]);
  for (const s of said) assert.ok(exists(s), `a page tells the user to run ${s} but it does not exist`);
});