// INTEGRATION TESTS: account flow. Real js/supabase-config.js + js/progress.js running together against an
// in-memory fake Supabase. Covers: lecture gate, saved level, old vs new accounts. Run: node --test tests/integration
const test = require('node:test');
const assert = require('node:assert');
const { makeBrowser, finishGame } = require('../helpers/fake-supabase.js');

const UID = 'u1';
const profile = (o = {}) => ({ id: UID, player_name: 'stelle', difficulty: 'BEGINNER', current_level: 'BEGINNER', lesson_seen_level: null, adaptive: true, ...o });
const setup = (p, sessions = []) => { const state = { tables: { profiles: [p], game_sessions: sessions }, offline: false }; return { state, b: makeBrowser(state) }; };
const route = (b) => b.run(`playRoute('${UID}')`);
const level = (b) => b.run(`resolvePlayerLevel('${UID}')`);

test('INT-01 brand-new account must see the lecture before the first game', async () => {
  const { b } = setup(profile());
  assert.strictEqual(await route(b), 'lesson.html?gate=1');
});

test('INT-02 after finishing the lecture, the same level goes straight to the game', async () => {
  const { state, b } = setup(profile());
  state.tables.profiles[0].lesson_seen_level = 'BEGINNER';       // what finishLessons() saves
  assert.strictEqual(await route(b), 'game-room.html');
});

test('INT-03 old account (already played, lesson marked seen by migration) is not forced to take the lecture', async () => {
  const { b } = setup(profile({ current_level: 'INTERMEDIATE', lesson_seen_level: 'INTERMEDIATE' }), [{ id: 1, user_id: UID, result: 'won', next_level: 'INTERMEDIATE', created_at: '2026-01-01' }]);
  assert.strictEqual(await route(b), 'game-room.html');
});

test('INT-04 moving UP a level brings the lecture back, and the player is now at the new level', async () => {
  const { state, b } = setup(profile({ lesson_seen_level: 'BEGINNER' }));
  assert.strictEqual(await route(b), 'game-room.html');
  finishGame(state, UID, 'INTERMEDIATE');                          // fast, accurate win
  assert.strictEqual(await level(b), 'INTERMEDIATE');
  assert.strictEqual(await route(b), 'lesson.html?gate=1');
});

test('INT-05 moving DOWN a level does not repeat a lecture they already finished', async () => {
  const { state, b } = setup(profile({ current_level: 'INTERMEDIATE', lesson_seen_level: 'INTERMEDIATE' }));
  finishGame(state, UID, 'BEGINNER');
  assert.strictEqual(await level(b), 'BEGINNER');
  assert.strictEqual(await route(b), 'game-room.html');
});

test('INT-06 SAVED LEVEL: next visit keeps Intermediate, not the beginner level picked at sign-up', async () => {
  // sign-up pick = BEGINNER, player earned INTERMEDIATE, and their last 12 games were abandoned (no next_level)
  const abandoned = Array.from({ length: 12 }, (_, i) => ({ id: i + 1, user_id: UID, result: 'in_progress', next_level: null, created_at: `2026-02-${String(i + 1).padStart(2, '0')}` }));
  const { b } = setup(profile({ difficulty: 'BEGINNER', current_level: 'INTERMEDIATE', lesson_seen_level: 'INTERMEDIATE' }), abandoned);
  assert.strictEqual(await level(b), 'INTERMEDIATE');
});

test('INT-07 older data without current_level falls back to the latest finished game, then to the sign-up level', async () => {
  const withGame = setup(profile({ current_level: null }), [{ id: 1, user_id: UID, result: 'won', next_level: 'ADVANCED', created_at: '2026-03-01' }]);
  assert.strictEqual(await level(withGame.b), 'ADVANCED');
  const noGame = setup(profile({ current_level: null, difficulty: 'INTERMEDIATE' }));
  assert.strictEqual(await level(noGame.b), 'INTERMEDIATE');
});

test('INT-08 fixed-level group (adaptive = false) always stays on its start level', async () => {
  const { state, b } = setup(profile({ adaptive: false, difficulty: 'BEGINNER', current_level: 'ADVANCED' }));
  assert.strictEqual(await level(b), 'BEGINNER');
  assert.ok(state);
});

test('INT-09 if migration-06 has not been run, the game is never blocked', async () => {
  const p = profile(); delete p.lesson_seen_level; delete p.current_level;
  const { b } = setup(p);
  assert.strictEqual(await route(b), 'game-room.html');
});

test('INT-10 offline / database error never traps the player: go to the game', async () => {
  const { state, b } = setup(profile());
  state.offline = true;
  assert.strictEqual(await route(b), 'game-room.html');
});

test('INT-11 if saving "lesson finished" fails, the tab remembers it so there is no lesson loop', async () => {
  const { b } = setup(profile());
  assert.strictEqual(await route(b), 'lesson.html?gate=1');
  b.sessionStorage.setItem('remediate.lessonSeen', `${UID}|BEGINNER`);   // what finishLessons() stores on failure
  assert.strictEqual(await route(b), 'game-room.html');
});

test('INT-12 the tab backup belongs to one user: another account on the same browser still sees the lecture', async () => {
  const { b } = setup(profile());
  b.sessionStorage.setItem('remediate.lessonSeen', 'someone-else|ADVANCED');
  assert.strictEqual(await route(b), 'lesson.html?gate=1');
});