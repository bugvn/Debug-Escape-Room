// Lesson gate + saved level rules (js/progress.js) and their wiring. Run with: node --test
const test = require('node:test');
const assert = require('node:assert');
const fs = require('fs');
const path = require('path');
const { levelRank, higherLevel, lessonDue } = require('../js/progress.js');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('new account (never saw a lesson) must see the lesson at any level', () => {
  for (const l of ['BEGINNER', 'INTERMEDIATE', 'ADVANCED']) assert.strictEqual(lessonDue(l, null), true);
});

test('same level again: no lesson, straight to the game', () => {
  assert.strictEqual(lessonDue('BEGINNER', 'BEGINNER'), false);
  assert.strictEqual(lessonDue('INTERMEDIATE', 'INTERMEDIATE'), false);
});

test('moving up a level brings the lesson back', () => {
  assert.strictEqual(lessonDue('INTERMEDIATE', 'BEGINNER'), true);
  assert.strictEqual(lessonDue('ADVANCED', 'INTERMEDIATE'), true);
});

test('moving down a level does not repeat a lesson they already finished', () => {
  assert.strictEqual(lessonDue('BEGINNER', 'INTERMEDIATE'), false);
  assert.strictEqual(lessonDue('INTERMEDIATE', 'ADVANCED'), false);
});

test('unknown level counts as BEGINNER; higherLevel ignores missing values', () => {
  assert.strictEqual(lessonDue('???', null), true);
  assert.strictEqual(lessonDue(undefined, 'BEGINNER'), false);
  assert.strictEqual(levelRank(null), -1);
  assert.strictEqual(higherLevel(null, 'INTERMEDIATE'), 'INTERMEDIATE');
  assert.strictEqual(higherLevel('ADVANCED', 'BEGINNER'), 'ADVANCED');
  assert.strictEqual(higherLevel('BEGINNER', null), 'BEGINNER');
});

test('wiring: game room reads the saved level and enforces the gate; Play buttons use it', () => {
  const gr = read('game-room.html');
  assert.ok(gr.includes('resolvePlayerLevel(user.id, prof)'), 'game room must start at the saved level');
  assert.ok(!/level = prof\.difficulty/.test(gr), 'game room must not reset to the sign-up level');
  assert.ok(gr.includes('playRoute(u.id)'), 'game room must check the lesson gate');
  assert.ok(read('index.html').includes('playRoute(user.id)'));
  assert.ok(read('dashboard.html').includes('goPlay()'));
  assert.ok(read('test-summary.html').includes('goPlay()'));
  for (const page of ['index.html', 'dashboard.html', 'lesson.html', 'game-room.html', 'test-summary.html']) {
    const h = read(page);
    assert.ok(h.indexOf('js/progress.js') > -1 && h.indexOf('js/progress.js') < h.indexOf('js/supabase-config.js'), `${page}: progress.js must load before supabase-config.js`);
  }
});

test('sql: migration-06 adds both columns, the sync trigger and the sign-up level', () => {
  const sql = read('sql/migration-06.sql');
  for (const t of ['current_level', 'lesson_seen_level', 'sync_current_level', 'game_sessions_sync_level', 'handle_new_user']) assert.ok(sql.includes(t), 'migration-06 missing ' + t);
  assert.ok(read('sql/schema.sql').includes('lesson_seen_level'));
});

test('lessons: one module per level, every lesson complete', () => {
  const h = read('lesson.html').replace(/\r\n/g, '\n');
  const a = h.indexOf('const TOPICS = ['), b = h.indexOf('\n];\n', a) + 3;
  const TOPICS = eval(h.slice(a + 'const TOPICS = '.length, b).replace(/;$/, ''));
  assert.strictEqual(TOPICS.length, 5, 'Basics + 4 bug types');
  TOPICS.filter((t) => t.tag !== 'BASICS').forEach((t) => {
    for (const lv of ['INTERMEDIATE', 'ADVANCED']) {
      const m = (t.more || []).find((x) => x.level === lv);
      assert.ok(m, `${t.tag} has no ${lv} lesson`);
      for (const f of ['title', 'intro', 'points', 'code', 'note', 'tryit', 'refs']) assert.ok(m[f] && m[f].length !== 0, `${t.tag} ${lv} missing ${f}`);
      assert.ok(m.tryit.task && m.tryit.goal && m.tryit.code, `${t.tag} ${lv} try-it incomplete`);
    }
  });
});