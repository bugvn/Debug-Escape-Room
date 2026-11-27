// A tiny in-memory stand-in for Supabase, so integration tests can run the REAL js/supabase-config.js
// (and js/progress.js) without internet, an account, or a database.
// It supports only what the game's helper functions use: select / eq / not / order / limit / maybeSingle / update / insert.
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.join(__dirname, '..', '..');

class Query {
  constructor(state, table) { this.state = state; this.table = table; this.filters = []; this.orders = []; this.max = Infinity; this.one = false; this.patch = null; this.rowsToAdd = null; }
  select() { return this; }
  eq(col, val) { this.filters.push((r) => r[col] === val); return this; }
  not(col, op, val) { if (op === 'is' && val === null) this.filters.push((r) => r[col] != null); return this; }
  order(col, o = {}) { this.orders.push([col, o.ascending !== false]); return this; }
  limit(n) { this.max = n; return this; }
  maybeSingle() { this.one = true; return this; }
  update(patch) { this.patch = patch; return this; }
  insert(rows) { this.rowsToAdd = Array.isArray(rows) ? rows : [rows]; return this; }
  then(resolve, reject) {
    try {
      if (this.state.offline) throw new Error('offline');
      const rows = this.state.tables[this.table] || (this.state.tables[this.table] = []);
      if (this.rowsToAdd) { rows.push(...this.rowsToAdd); return resolve({ data: this.rowsToAdd, error: null }); }
      let out = rows.filter((r) => this.filters.every((f) => f(r)));
      if (this.patch) { out.forEach((r) => Object.assign(r, this.patch)); return resolve({ data: out, error: null }); }
      for (const [col, asc] of this.orders.slice().reverse()) out.sort((a, b) => (a[col] > b[col] ? 1 : a[col] < b[col] ? -1 : 0) * (asc ? 1 : -1));
      out = out.slice(0, this.max);
      return resolve(this.one ? { data: out[0] || null, error: null } : { data: out, error: null });
    } catch (e) { return reject ? reject(e) : resolve({ data: null, error: e }); }
  }
}

// state = { tables: { profiles: [...], game_sessions: [...] }, offline: false }
function makeBrowser(state) {
  const store = () => { const m = {}; return { getItem: (k) => (k in m ? m[k] : null), setItem: (k, v) => { m[k] = String(v); }, removeItem: (k) => { delete m[k]; }, get length() { return Object.keys(m).length; } }; };
  const sandbox = {
    location: { hash: '', href: 'http://localhost/index.html' },
    localStorage: store(), sessionStorage: store(), URL, console,
    window: { supabase: { createClient: () => ({ from: (t) => new Query(state, t), auth: {} }) } }
  };
  sandbox.window.window = sandbox.window;
  const ctx = vm.createContext(sandbox);
  for (const f of ['js/progress.js', 'js/supabase-config.js']) vm.runInContext(fs.readFileSync(path.join(ROOT, f), 'utf8'), ctx, { filename: f });
  return { run: (code) => vm.runInContext(code, ctx), sessionStorage: sandbox.sessionStorage };
}

// Mimics what sql/migration-06.sql does inside the database: finishing a game writes next_level and the
// trigger copies it to profiles.current_level. (The SQL itself is checked by hand: see MANUAL-TEST-CASES.md.)
function finishGame(state, uid, nextLevel, extra = {}) {
  const sessions = state.tables.game_sessions;
  sessions.push({ id: sessions.length + 1, user_id: uid, result: 'won', next_level: nextLevel, created_at: new Date(Date.now() + sessions.length * 1000).toISOString(), ...extra });
  const p = state.tables.profiles.find((x) => x.id === uid);
  if (p && nextLevel) p.current_level = nextLevel;
}

module.exports = { makeBrowser, finishGame, ROOT };