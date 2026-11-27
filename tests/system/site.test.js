// SYSTEM TESTS: the whole site as a visitor meets it, with no browser and no internet.
// Starts a real local web server on the project folder, then checks every page loads, every file a page asks for
// exists, every button/link goes somewhere real, and a full player journey works from sign-up to level-up.
// Run: node --test "tests/system/*.test.js"      (browser-only checks are in tests/MANUAL-TEST-CASES.md)
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const http = require('http');
const { makeBrowser, finishGame, ROOT } = require('../helpers/fake-supabase.js');
const { PUZZLE_BANK } = require('../../js/puzzles.js');
const { nextLevel, pickRoom } = require('../../js/adaptive.js');
const { scoreOf } = require('../../js/score.js');

const PAGES = ['index', 'login', 'dashboard', 'lesson', 'game-room', 'test-summary', 'analytics'].map((p) => p + '.html');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg' };
let server, base;

test.before(async () => {
  server = http.createServer((req, res) => {
    const file = path.join(ROOT, decodeURIComponent(req.url.split('?')[0]).replace(/^\/$/, '/index.html'));
    if (!file.startsWith(ROOT) || !fs.existsSync(file) || fs.statSync(file).isDirectory()) { res.writeHead(404); return res.end('not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((r) => server.listen(0, r));
  base = 'http://localhost:' + server.address().port + '/';
});
test.after(() => new Promise((r) => server.close(r)));

const get = async (p) => { const r = await fetch(base + p); return { status: r.status, text: await r.text() }; };
const localRefs = (html) => [...html.matchAll(/(?:src|href)="([^"#]+)"/g)].map((m) => m[1]).filter((u) => !/^(https?:|mailto:|data:|javascript:)/.test(u) && !/[' +]/.test(u));   // skips JS string templates

test('SYS-01 every page loads (HTTP 200) and has a title', async () => {
  for (const p of PAGES) {
    const r = await get(p);
    assert.strictEqual(r.status, 200, p);
    assert.match(r.text, /<title>[^<]+<\/title>/, p + ' has no title');
  }
});

test('SYS-02 every script, stylesheet and file a page asks for exists', async () => {
  const missing = [];
  for (const p of PAGES) for (const u of localRefs((await get(p)).text)) if (!u.endsWith('.html') && (await get(u.split('?')[0])).status !== 200) missing.push(`${p} -> ${u}`);
  assert.deepStrictEqual(missing, []);
});

test('SYS-03 every page-to-page link and button goes to a page that exists', async () => {
  const bad = [];
  for (const p of PAGES) {
    const html = (await get(p)).text;
    const targets = [...localRefs(html).filter((u) => u.endsWith('.html')), ...[...html.matchAll(/location\.(?:href|replace)\s*=\s*\(?'([\w-]+\.html)/g)].map((m) => m[1])];
    for (const t of targets) if (!PAGES.includes(t.split('?')[0])) bad.push(`${p} -> ${t}`);
  }
  assert.deepStrictEqual(bad, []);
});

test('SYS-04 the picture files for all 3 rooms (background + every clickable object + door) exist', async () => {
  const html = (await get('game-room.html')).text;
  const rooms = [...html.matchAll(/(BEGINNER|INTERMEDIATE|ADVANCED): \{[\s\S]*?dir: '([^']+)'[\s\S]*?spots: \{([\s\S]*?)\n    \}/g)];
  assert.strictEqual(rooms.length, 3, 'expected 3 rooms in ROOMS');
  for (const [, level, dir, spots] of rooms) {
    const imgs = ['bg', ...[...spots.matchAll(/img:'(\w+)'/g)].map((m) => m[1])];
    assert.strictEqual(imgs.length, 6, level + ': background + 4 objects + door');
    for (const i of imgs) assert.strictEqual((await get(dir + i + '.png')).status, 200, `${level}: ${dir}${i}.png`);
  }
});

test('SYS-05 the puzzle file the game downloads is valid and matches the bank in memory', async () => {
  const r = await get('js/puzzles.json');
  assert.strictEqual(r.status, 200);
  const bank = JSON.parse(r.text);
  assert.strictEqual(bank.length, PUZZLE_BANK.length);
  assert.strictEqual(new Set(bank.map((p) => p.id)).size, bank.length);
});

test('SYS-06 every page the player must be logged in for uses the login check', async () => {
  for (const p of ['dashboard.html', 'lesson.html', 'game-room.html', 'test-summary.html']) assert.match((await get(p)).text, /requireLogin\(/, p);
});

test('SYS-07 full player journey: sign up, lecture, play, level up, lecture again, play, stay saved', async () => {
  const UID = 'player-1';
  const state = { tables: { profiles: [{ id: UID, player_name: 'stelle', difficulty: 'BEGINNER', current_level: 'BEGINNER', lesson_seen_level: null, adaptive: true }], game_sessions: [] }, offline: false };
  const b = makeBrowser(state);
  const prof = () => state.tables.profiles[0];
  const route = () => b.run(`playRoute('${UID}')`);
  const level = () => b.run(`resolvePlayerLevel('${UID}')`);

  // 1. new account presses Play -> lecture first
  assert.strictEqual(await route(), 'lesson.html?gate=1');
  prof().lesson_seen_level = 'BEGINNER';                              // finishes the lecture

  // 2. Play -> game at Beginner, perfect fast win
  assert.strictEqual(await route(), 'game-room.html');
  let lvl = await level();
  assert.strictEqual(lvl, 'BEGINNER');
  const room = pickRoom({ level: lvl, rnd: () => 0.5 });
  assert.strictEqual(room.length, 4);
  const g = { level: lvl, result: 'won', solved_count: 4, hints_used: 0, elapsed_sec: 100 };
  const subs = room.map(() => ({ kind: 'submit', is_correct: true }));
  const next = nextLevel(g, subs);
  assert.ok(scoreOf(g, subs) >= 90);
  finishGame(state, UID, next, { puzzle_ids: room.map((p) => p.id) });

  // 3. next day: level is saved as Intermediate (not the sign-up Beginner), and the new lecture is due
  assert.strictEqual(await level(), 'INTERMEDIATE');
  assert.strictEqual(await route(), 'lesson.html?gate=1');
  prof().lesson_seen_level = 'INTERMEDIATE';

  // 4. Play -> Intermediate room, a different room from last time
  assert.strictEqual(await route(), 'game-room.html');
  const room2 = pickRoom({ level: await level(), lastIds: room.map((p) => p.id), rnd: () => 0.2 });
  room2.forEach((p) => assert.strictEqual(p.level, 'INTERMEDIATE'));

  // 5. abandoned game (tab closed) does not reset anything
  state.tables.game_sessions.push({ id: 99, user_id: UID, result: 'in_progress', next_level: null, created_at: new Date(Date.now() + 99999).toISOString() });
  assert.strictEqual(await level(), 'INTERMEDIATE');
  assert.strictEqual(await route(), 'game-room.html');
});
